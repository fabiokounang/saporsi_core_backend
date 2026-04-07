/**
 * Create push_subscriptions table for web push.
 * Run: npm run migrate:push-subscriptions
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { pool } = require("../utils/db");

async function tableExists(conn, tableName) {
  const [[{ c }]] = await conn.query(
    `
    SELECT COUNT(1) AS c
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `,
    [tableName]
  );
  return Number(c) > 0;
}

async function main() {
  const conn = await pool.getConnection();
  try {
    const exists = await tableExists(conn, "push_subscriptions");
    if (exists) {
      console.log("OK: push_subscriptions already exists");
      return;
    }

    await conn.query(`
      CREATE TABLE push_subscriptions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NULL,
        endpoint VARCHAR(700) NOT NULL,
        p256dh VARCHAR(512) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        subscription_json JSON NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_push_subscriptions_endpoint (endpoint),
        KEY idx_push_subscriptions_is_active (is_active),
        KEY idx_push_subscriptions_user_id (user_id)
      )
    `);
    console.log("Done: push_subscriptions table created.");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
