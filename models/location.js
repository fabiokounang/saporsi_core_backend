// models/location.js
const { pool } = require("../utils/db");

exports.countAll = async () => {
  const sql = `
    SELECT
      COUNT(1) AS total
    FROM locations
  `;
  const [rows] = await pool.query(sql);
  return Number(rows[0]?.total || 0);
};

exports.listPaginated = async ({ limit, offset }) => {
  const sql = `
    SELECT
      id,
      name,
      address,
      notes,
      is_active,
      created_at,
      updated_at
    FROM locations
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query(sql, [limit, offset]);
  return rows;
};

exports.listActiveForSelect = async () => {
  const sql = `
    SELECT
      id,
      name,
      address,
      notes,
      is_active,
      created_at,
      updated_at
    FROM locations
    WHERE is_active = ?
  `;
  const [rows] = await pool.query(sql, [1]);
  return rows;
}

exports.findById = async (id) => {
  const sql = `
    SELECT
      id,
      name,
      address,
      notes,
      is_active,
      created_at,
      updated_at
    FROM locations
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
    FROM locations
    WHERE name = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [name, 1]);
  return rows[0] || null;
};

exports.create = async ({ name, address, notes, is_active }) => {
  const sql = `
    INSERT INTO locations (
      name,
      address,
      notes,
      is_active
    ) VALUES (?, ?, ?, ?)
  `;
  const params = [
    name,
    address ?? null,
    notes ?? null,
    is_active,
  ];
  const [result] = await pool.query(sql, params);
  return result.insertId;
};

exports.updateById = async ({ id, name, address, notes, is_active }) => {
  const sql = `
    UPDATE locations
    SET
      name = ?,
      address = ?,
      notes = ?,
      is_active = ?
    WHERE id = ?
    LIMIT ?
  `;
  const params = [
    name,
    address ?? null,
    notes ?? null,
    is_active,
    id,
    1,
  ];
  const [result] = await pool.query(sql, params);
  return result.affectedRows === 1;
};
