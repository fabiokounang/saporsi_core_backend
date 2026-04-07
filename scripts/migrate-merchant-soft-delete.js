/**
 * Add merchants.deleted_at for soft delete.
 * Run: node scripts/migrate-merchant-soft-delete.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../utils/db");

async function main() {
  const conn = await pool.getConnection();
  try {
    const [[{ c }]] = await conn.query(
      `
      SELECT COUNT(1) AS c
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'merchants'
        AND COLUMN_NAME = 'deleted_at'
      `
    );
    if (Number(c) > 0) {
      console.log("OK: deleted_at already exists.");
      return;
    }
    await conn.query(`
      ALTER TABLE merchants
        ADD COLUMN deleted_at DATETIME(3) NULL DEFAULT NULL
        COMMENT 'Soft delete timestamp'
        AFTER updated_at
    `);
    await conn.query(`
      CREATE INDEX idx_merchants_deleted_at ON merchants (deleted_at)
    `);
    console.log("Done: merchants.deleted_at added.");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
