/**
 * locations.parent_id (master → sub) + locations.deleted_at (soft delete).
 * Wajib dijalankan agar create/update location di app tidak error (kolom harus ada).
 *
 * Run: npm run migrate:location-parent-soft-delete
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../utils/db");

async function columnExists(conn, table, column) {
  const [[{ c }]] = await conn.query(
    `
    SELECT COUNT(1) AS c
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
    [table, column]
  );
  return Number(c) > 0;
}

async function columnType(conn, table, column) {
  const [[row]] = await conn.query(
    `
    SELECT COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [table, column]
  );
  return row && row.COLUMN_TYPE ? String(row.COLUMN_TYPE) : null;
}

async function indexExists(conn, name) {
  const [[{ c }]] = await conn.query(
    `
    SELECT COUNT(1) AS c
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'locations'
      AND INDEX_NAME = ?
    `,
    [name]
  );
  return Number(c) > 0;
}

async function fkExists(conn, name) {
  const [[{ c }]] = await conn.query(
    `
    SELECT COUNT(1) AS c
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'locations'
      AND CONSTRAINT_NAME = ?
    `,
    [name]
  );
  return Number(c) > 0;
}

async function main() {
  const conn = await pool.getConnection();
  try {
    const hasParent = await columnExists(conn, "locations", "parent_id");
    const hasDeleted = await columnExists(conn, "locations", "deleted_at");

    if (!hasParent) {
      await conn.query(`
        ALTER TABLE locations
          ADD COLUMN parent_id INT NULL DEFAULT NULL COMMENT 'Induk (master); NULL = lokasi master' AFTER id
      `);
      console.log("Added locations.parent_id");
    } else {
      console.log("OK: parent_id already exists");
    }

    if (!hasDeleted) {
      await conn.query(`
        ALTER TABLE locations
          ADD COLUMN deleted_at DATETIME(3) NULL DEFAULT NULL COMMENT 'Soft delete' AFTER updated_at
      `);
      console.log("Added locations.deleted_at");
    } else {
      console.log("OK: deleted_at already exists");
    }

    const idType = (await columnType(conn, "locations", "id")) || "INT";
    const parentType = await columnType(conn, "locations", "parent_id");

    if (parentType && parentType !== idType) {
      if (await fkExists(conn, "fk_locations_parent")) {
        await conn.query(`ALTER TABLE locations DROP FOREIGN KEY fk_locations_parent`);
        console.log("Dropped fk_locations_parent (will re-add after aligning parent_id type)");
      }
      await conn.query(
        `ALTER TABLE locations MODIFY COLUMN parent_id ${idType} NULL DEFAULT NULL COMMENT 'Induk (master); NULL = lokasi master'`
      );
      console.log(`Aligned parent_id type to match id: ${idType}`);
    }

    if (!(await indexExists(conn, "idx_locations_parent_id"))) {
      await conn.query(`CREATE INDEX idx_locations_parent_id ON locations (parent_id)`);
      console.log("Index idx_locations_parent_id");
    }
    if (!(await indexExists(conn, "idx_locations_deleted_at"))) {
      await conn.query(`CREATE INDEX idx_locations_deleted_at ON locations (deleted_at)`);
      console.log("Index idx_locations_deleted_at");
    }

    if (!(await fkExists(conn, "fk_locations_parent"))) {
      await conn.query(`
        ALTER TABLE locations
          ADD CONSTRAINT fk_locations_parent FOREIGN KEY (parent_id) REFERENCES locations (id)
      `);
      console.log("FK fk_locations_parent");
    } else {
      console.log("OK: fk_locations_parent already exists");
    }

    const finalParent = await columnType(conn, "locations", "parent_id");
    const finalId = await columnType(conn, "locations", "id");
    console.log(`Verify: locations.id type = ${finalId}, locations.parent_id type = ${finalParent}`);
    if (finalParent !== finalId) {
      console.warn("WARNING: id and parent_id types still differ — create location may still fail.");
    }

    console.log("Done.");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
