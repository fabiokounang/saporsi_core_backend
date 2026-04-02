// utils/db.js
const mysql = require("mysql2/promise");
// console.log('====================', {
//       host: process.env.DB_HOST,
//       port: Number(process.env.DB_PORT),
//       user: process.env.DB_USER,
//       password: process.env.DB_PASSWORD,
//       database: process.env.DB_NAME
//     })
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: "mysql.railway.internal",
      port: 3306,
      user: "root",
      password: "xxwgsPEowuNCmYoOWXvRbosNbyUjvhKJ",
      database: "saporsi_core"
    });

    await conn.query('SELECT 1');
    console.log('✅ DB CONNECT OK');
    await conn.end();
  } catch (err) {
    console.error('❌ DB CONNECT FAIL');
    console.error(err);
  }
})();

const pool = mysql.createPool({
  host: "mysql.railway.internal",
  port: 3306,
  user: "root",
  password: "xxwgsPEowuNCmYoOWXvRbosNbyUjvhKJ",
  database: "saporsi_core"
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
  queueLimit: 0,
  timezone: "+00:00"
  // namedPlaceholders: true, // optional
});

async function pingDb() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}

module.exports = {
  pool,
  pingDb,
};
