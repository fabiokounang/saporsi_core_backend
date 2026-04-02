// models/machine.js
const { pool } = require("../utils/db");

exports.countAll = async () => {
  const sql = `
    SELECT
      COUNT(1) AS total
    FROM machines
  `;
  const [rows] = await pool.query(sql);
  return Number(rows[0]?.total || 0);
};

exports.listAllForSelect = async () => {
  const sql = `
    SELECT
      id,
      code,
      name
    FROM machines
    ORDER BY code ASC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [1000]);
  return rows;
};


exports.listPaginated = async ({ limit, offset }) => {
  const sql = `
    SELECT
      m.id,
      m.code,
      m.name,
      m.location_id,
      l.name AS location_name,
      m.is_active,
      m.updated_at
    FROM machines m
    INNER JOIN locations l ON l.id = m.location_id
    ORDER BY m.id DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query(sql, [limit, offset]);
  return rows;
};

exports.findById = async (id) => {
  const sql = `
    SELECT
      m.id,
      m.code,
      m.name,
      m.location_id,
      l.name AS location_name,
      m.is_active,
      m.created_at,
      m.updated_at
    FROM machines m
    INNER JOIN locations l ON l.id = m.location_id
    WHERE m.id = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.findByCode = async (code) => {
  const sql = `
    SELECT
      id,
      code,
      location_id,
      is_active
    FROM machines
    WHERE code = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [code, 1]);
  return rows[0] || null;
};

exports.create = async ({ code, name, location_id, is_active }) => {
  const sql = `
    INSERT INTO machines (
      code,
      name,
      location_id,
      is_active
    ) VALUES (?, ?, ?, ?)
  `;
  const [result] = await pool.query(sql, [
    code,
    name ?? null,
    location_id,
    is_active,
  ]);
  return result.insertId;
};

exports.updateById = async ({ id, code, name, location_id, is_active }) => {
  const sql = `
    UPDATE machines
    SET
      code = ?,
      name = ?,
      location_id = ?,
      is_active = ?
    WHERE id = ?
    LIMIT ?
  `;
  const [result] = await pool.query(sql, [
    code,
    name ?? null,
    location_id,
    is_active,
    id,
    1,
  ]);
  return result.affectedRows === 1;
};

// models/machine.js (tambahkan)
exports.listAllForSelect = async () => {
  const sql = `
    SELECT
      id,
      code,
      name,
      is_active
    FROM machines
    ORDER BY id DESC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [5000]);
  return rows;
};

