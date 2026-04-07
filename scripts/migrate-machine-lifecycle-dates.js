/**
 * Add machines.manufactured_at + machines.installed_at + MT fields.
 * Run: npm run migrate:machine-lifecycle-dates
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

async function indexExists(conn, table, name) {
  const [[{ c }]] = await conn.query(
    `
    SELECT COUNT(1) AS c
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    `,
    [table, name]
  );
  return Number(c) > 0;
}

async function main() {
  const conn = await pool.getConnection();
  try {
    const hasManufacturedAt = await columnExists(conn, "machines", "manufactured_at");
    const hasInstalledAt = await columnExists(conn, "machines", "installed_at");
    const hasMaintenanceAt = await columnExists(conn, "machines", "maintenance_at");
    const hasMaintenanceMode = await columnExists(conn, "machines", "maintenance_mode");

    if (!hasManufacturedAt) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN manufactured_at DATE NULL DEFAULT NULL
          COMMENT 'Tanggal mesin dibuat di pabrik'
          AFTER name
      `);
      console.log("Added machines.manufactured_at");
    } else {
      console.log("OK: manufactured_at already exists");
    }

    if (!hasInstalledAt) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN installed_at DATE NULL DEFAULT NULL
          COMMENT 'Tanggal mesin dipasang di lapangan'
          AFTER manufactured_at
      `);
      console.log("Added machines.installed_at");
    } else {
      console.log("OK: installed_at already exists");
    }

    if (!hasMaintenanceAt) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN maintenance_at DATE NULL DEFAULT NULL
          COMMENT 'Tanggal maintenance mesin'
          AFTER installed_at
      `);
      console.log("Added machines.maintenance_at");
    } else {
      console.log("OK: maintenance_at already exists");
    }

    if (!hasMaintenanceMode) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN maintenance_mode VARCHAR(16) NOT NULL DEFAULT 'auto'
          COMMENT 'auto | manual (sumber tanggal maintenance)'
          AFTER maintenance_at
      `);
      console.log("Added machines.maintenance_mode");
    } else {
      console.log("OK: maintenance_mode already exists");
    }

    if (!(await indexExists(conn, "machines", "idx_machines_manufactured_at"))) {
      await conn.query(`CREATE INDEX idx_machines_manufactured_at ON machines (manufactured_at)`);
      console.log("Index idx_machines_manufactured_at");
    }
    if (!(await indexExists(conn, "machines", "idx_machines_installed_at"))) {
      await conn.query(`CREATE INDEX idx_machines_installed_at ON machines (installed_at)`);
      console.log("Index idx_machines_installed_at");
    }
    if (!(await indexExists(conn, "machines", "idx_machines_maintenance_at"))) {
      await conn.query(`CREATE INDEX idx_machines_maintenance_at ON machines (maintenance_at)`);
      console.log("Index idx_machines_maintenance_at");
    }
    if (!(await indexExists(conn, "machines", "idx_machines_maintenance_mode"))) {
      await conn.query(`CREATE INDEX idx_machines_maintenance_mode ON machines (maintenance_mode)`);
      console.log("Index idx_machines_maintenance_mode");
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
