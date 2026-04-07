/**
 * machines: category, purchase_date, lifespan_months, last_maintenance_at, runtime/downtime hours.
 * Run: npm run migrate:machine-asset-fields
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
    if (!(await columnExists(conn, "machines", "category"))) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN category VARCHAR(128) NULL DEFAULT NULL COMMENT 'Kategori mesin' AFTER maintenance_mode
      `);
      console.log("Added machines.category");
    } else console.log("OK: category exists");

    if (!(await columnExists(conn, "machines", "purchase_date"))) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN purchase_date DATE NULL DEFAULT NULL COMMENT 'Tanggal pembelian' AFTER category
      `);
      console.log("Added machines.purchase_date");
    } else console.log("OK: purchase_date exists");

    if (!(await columnExists(conn, "machines", "lifespan_months"))) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN lifespan_months INT UNSIGNED NULL DEFAULT NULL COMMENT 'Umur pakai rencana (bulan)' AFTER purchase_date
      `);
      console.log("Added machines.lifespan_months");
    } else console.log("OK: lifespan_months exists");

    if (!(await columnExists(conn, "machines", "last_maintenance_at"))) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN last_maintenance_at DATE NULL DEFAULT NULL COMMENT 'Maintenance terakhir' AFTER lifespan_months
      `);
      console.log("Added machines.last_maintenance_at");
    } else console.log("OK: last_maintenance_at exists");

    if (!(await columnExists(conn, "machines", "total_runtime_hours"))) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN total_runtime_hours DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Total jam operasi' AFTER last_maintenance_at
      `);
      console.log("Added machines.total_runtime_hours");
    } else console.log("OK: total_runtime_hours exists");

    if (!(await columnExists(conn, "machines", "total_downtime_hours"))) {
      await conn.query(`
        ALTER TABLE machines
          ADD COLUMN total_downtime_hours DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Total jam downtime' AFTER total_runtime_hours
      `);
      console.log("Added machines.total_downtime_hours");
    } else console.log("OK: total_downtime_hours exists");

    const idx = [
      ["idx_machines_category", "CREATE INDEX idx_machines_category ON machines (category)"],
      ["idx_machines_purchase_date", "CREATE INDEX idx_machines_purchase_date ON machines (purchase_date)"],
      [
        "idx_machines_last_maintenance_at",
        "CREATE INDEX idx_machines_last_maintenance_at ON machines (last_maintenance_at)",
      ],
    ];
    for (const [name, sql] of idx) {
      if (!(await indexExists(conn, "machines", name))) {
        await conn.query(sql);
        console.log("Index " + name);
      }
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
