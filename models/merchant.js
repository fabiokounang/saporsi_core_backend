// models/merchant.js
const { pool } = require("../utils/db");

exports.countAll = async () => {
  const sql = `
    SELECT
      COUNT(1) AS total
    FROM merchants
  `;
  const [rows] = await pool.query(sql);
  return Number(rows[0]?.total || 0);
};

exports.listAllForSelect = async () => {
  const sql = `
    SELECT
      id,
      name
    FROM merchants
    ORDER BY name ASC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [1000]);
  return rows;
};


exports.listPaginated = async ({ limit, offset }) => {
  const sql = `
    SELECT
      id,
      name,
      is_active,
      created_at,
      updated_at
    FROM merchants
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query(sql, [limit, offset]);
  return rows;
};

exports.findById = async (id) => {
  const sql = `
    SELECT
      id,
      name,
      is_active,
      created_at,
      updated_at
    FROM merchants
    WHERE id = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.findByName = async (name) => {
  const sql = `
    SELECT
      id,
      name,
      is_active
    FROM merchants
    WHERE name = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [name, 1]);
  return rows[0] || null;
};

exports.create = async ({ name, is_active }) => {
  const sql = `
    INSERT INTO merchants (
      name,
      is_active
    ) VALUES (?, ?)
  `;
  const [result] = await pool.query(sql, [name, is_active]);
  return result.insertId;
};

exports.updateById = async ({ id, name, is_active }) => {
  const sql = `
    UPDATE merchants
    SET
      name = ?,
      is_active = ?
    WHERE id = ?
    LIMIT ?
  `;
  const [result] = await pool.query(sql, [name, is_active, id, 1]);
  return result.affectedRows === 1;
};
