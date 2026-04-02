// models/machineSlot.js
const { pool } = require("../utils/db");

exports.countByMachine = async (machine_id) => {
  const sql = `
    SELECT
      COUNT(1) AS total
    FROM machine_slots
    WHERE machine_id = ?
  `;
  const [rows] = await pool.query(sql, [machine_id]);
  return Number(rows[0]?.total || 0);
};

exports.listByMachinePaginated = async ({ machine_id, limit, offset }) => {
  const sql = `
    SELECT
      ms.id,
      ms.machine_id,
      ms.slot_code,
      ms.product_id,
      p.sku AS product_sku,
      p.name AS product_name,
      p.price AS product_base_price,
      ms.price AS slot_price,
      ms.stock,
      ms.capacity,
      ms.is_active,
      ms.updated_at
    FROM machine_slots ms
    INNER JOIN products p ON p.id = ms.product_id
    WHERE ms.machine_id = ?
    ORDER BY ms.slot_code ASC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query(sql, [machine_id, limit, offset]);
  return rows;
};

exports.findById = async (id) => {
  const sql = `
    SELECT
      ms.id,
      ms.machine_id,
      ms.slot_code,
      ms.product_id,
      p.sku AS product_sku,
      p.name AS product_name,
      p.price AS product_base_price,
      ms.price AS slot_price,
      ms.stock,
      ms.is_active,
      ms.created_at,
      ms.updated_at
    FROM machine_slots ms
    INNER JOIN products p ON p.id = ms.product_id
    WHERE ms.id = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.findByMachineAndCode = async ({ machine_id, slot_code }) => {
  const sql = `
    SELECT
      id,
      machine_id,
      slot_code
    FROM machine_slots
    WHERE machine_id = ?
      AND slot_code = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [machine_id, slot_code, 1]);
  return rows[0] || null;
};

exports.create = async ({ machine_id, slot_code, product_id, slot_price, stock, capacity, is_active }) => {
  const sql = `
    INSERT INTO machine_slots (
      machine_id,
      slot_code,
      product_id,
      price,
      stock,
      capacity,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(sql, [
    machine_id,
    slot_code,
    product_id,
    slot_price,
    stock,
    capacity,
    is_active,
  ]);
  return result.insertId;
};

exports.updateById = async ({ id, machine_id, slot_code, product_id, price, stock, is_active }) => {
  const sql = `
    UPDATE machine_slots
    SET
      machine_id = ?,
      slot_code = ?,
      product_id = ?,
      price = ?,
      stock = ?,
      is_active = ?
    WHERE id = ?
    LIMIT ?
  `;
  const [result] = await pool.query(sql, [
    machine_id,
    slot_code,
    product_id,
    price,
    stock,
    is_active,
    id,
    1,
  ]);
  return result.affectedRows === 1;
};
