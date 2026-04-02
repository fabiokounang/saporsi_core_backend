// models/order.js
const { pool } = require("../utils/db");

exports.countAdmin = async ({ status, merchant_id, machine_id }) => {
  const where = [];
  const params = [];

  if (status) { where.push("o.status = ?"); params.push(status); }
  if (merchant_id) { where.push("o.merchant_id = ?"); params.push(merchant_id); }
  if (machine_id) { where.push("o.machine_id = ?"); params.push(machine_id); }

  const sql = `
    SELECT
      COUNT(1) AS total
    FROM orders o
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
  `;
  const [rows] = await pool.query(sql, params);
  return Number(rows[0]?.total || 0);
};

exports.listAdmin = async ({ status, merchant_id, machine_id, limit, offset }) => {
  const where = [];
  const params = [];

  if (status) { where.push("o.status = ?"); params.push(status); }
  if (merchant_id) { where.push("o.merchant_id = ?"); params.push(merchant_id); }
  if (machine_id) { where.push("o.machine_id = ?"); params.push(machine_id); }

  const sql = `
    SELECT
      o.id,
      o.order_code,
      o.status,
      o.total,
      o.currency,
      o.payment_provider,
      o.payment_ref,
      o.paid_at,
      o.created_at,

      m.id AS merchant_id,
      m.name AS merchant_name,

      mc.id AS machine_id,
      mc.code AS machine_code,
      mc.name AS machine_name
    FROM orders o
    INNER JOIN merchants m ON m.id = o.merchant_id
    INNER JOIN machines mc ON mc.id = o.machine_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  console.log(sql, params)
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.countMerchant = async ({ merchant_id, status }) => {
  const where = ["o.merchant_id = ?"];
  const params = [merchant_id];

  if (status) { where.push("o.status = ?"); params.push(status); }

  const sql = `
    SELECT
      COUNT(1) AS total
    FROM orders o
    WHERE ${where.join(" AND ")}
  `;
  const [rows] = await pool.query(sql, params);
  return Number(rows[0]?.total || 0);
};

exports.listMerchant = async ({ merchant_id, status, limit, offset }) => {
  const where = ["o.merchant_id = ?"];
  const params = [merchant_id];

  if (status) { where.push("o.status = ?"); params.push(status); }

  const sql = `
    SELECT
      o.id,
      o.order_code,
      o.status,
      o.total,
      o.currency,
      o.paid_at,
      o.created_at,
      mc.id AS machine_id,
      mc.code AS machine_code,
      mc.name AS machine_name
    FROM orders o
    INNER JOIN machines mc ON mc.id = o.machine_id
    WHERE ${where.join(" AND ")}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findByIdAdmin = async (id) => {
  const sql = `
    SELECT
      o.id,
      o.order_code,
      o.status,
      o.currency,
      o.subtotal,
      o.total,
      o.payment_provider,
      o.payment_ref,
      o.paid_at,
      o.expires_at,
      o.created_at,
      o.updated_at,
      m.id AS merchant_id,
      m.name AS merchant_name,
      mc.id AS machine_id,
      mc.code AS machine_code,
      mc.name AS machine_name
    FROM orders o
    INNER JOIN merchants m ON m.id = o.merchant_id
    INNER JOIN machines mc ON mc.id = o.machine_id
    WHERE o.id = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.listItemsByOrderId = async (order_id) => {
  const sql = `
    SELECT
      oi.id,
      oi.order_id,
      oi.slot_id,
      oi.slot_code,
      oi.product_id,
      oi.product_sku,
      oi.product_name,
      oi.qty,
      oi.unit_price,
      oi.line_total,
      oi.created_at
    FROM order_items oi
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [order_id, 200]);
  return rows;
};

exports.findMerchantActiveById = async (id) => {
  const sql = `
    SELECT
      id,
      name,
      is_active
    FROM merchants
    WHERE id = ?
      AND is_active = 1
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.findMachineActiveById = async (id) => {
  const sql = `
    SELECT
      id,
      code,
      name,
      location_id,
      is_active
    FROM machines
    WHERE id = ?
      AND is_active = 1
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.findMachineSlotActiveById = async (id) => {
  const sql = `
    SELECT
      ms.id,
      ms.machine_id,
      ms.slot_code,
      ms.product_id,
      ms.price,
      ms.stock,
      ms.capacity,
      ms.is_active,
      mc.location_id,
      mc.is_active AS machine_is_active
    FROM machine_slots ms
    INNER JOIN machines mc ON mc.id = ms.machine_id
    WHERE ms.id = ?
      AND ms.is_active = 1
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.findProductActiveById = async (id) => {
  const sql = `
    SELECT
      id,
      sku,
      name,
      price,
      is_active
    FROM products
    WHERE id = ?
      AND is_active = 1
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.getLastOrderId = async () => {
  const sql = `
    SELECT
      id
    FROM orders
    ORDER BY id DESC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [1]);
  return Number(rows[0]?.id || 0);
};

exports.create = async ({
  order_code,
  merchant_id,
  machine_id,
  location_id,
  status,
  currency,
  subtotal,
  total,
  payment_provider,
  payment_ref,
  paid_at,
  expires_at,
}) => {
  const sql = `
    INSERT INTO orders (
      order_code,
      merchant_id,
      machine_id,
      location_id,
      status,
      currency,
      subtotal,
      total,
      payment_provider,
      payment_ref,
      paid_at,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(sql, [
    order_code,
    merchant_id,
    machine_id,
    location_id,
    status,
    currency,
    subtotal,
    total,
    payment_provider,
    payment_ref,
    paid_at,
    expires_at,
  ]);

  return result.insertId;
};

exports.createItem = async ({
  order_id,
  slot_id,
  product_id,
  qty,
  unit_price,
  line_total,
  product_name,
  product_sku,
  slot_code,
}) => {
  const sql = `
    INSERT INTO order_items (
      order_id,
      slot_id,
      product_id,
      qty,
      unit_price,
      line_total,
      product_name,
      product_sku,
      slot_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(sql, [
    order_id,
    slot_id,
    product_id,
    qty,
    unit_price,
    line_total,
    product_name,
    product_sku,
    slot_code,
  ]);

  return result.insertId;
};

exports.updatePaymentInfo = async ({
  id,
  payment_provider,
  payment_ref,
  expires_at,
}) => {
  const sql = `
    UPDATE orders
    SET
      payment_provider = ?,
      payment_ref = ?,
      expires_at = ?,
      updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
    LIMIT ?
  `;

  const [result] = await pool.query(sql, [
    payment_provider,
    payment_ref,
    expires_at,
    id,
    1,
  ]);

  return result;
};

exports.findDetailById = async (id) => {
  const sql = `
    SELECT
      o.id,
      o.order_code,
      o.merchant_id,
      o.machine_id,
      o.location_id,
      o.status,
      o.currency,
      o.subtotal,
      o.total,
      o.payment_provider,
      o.payment_ref,
      o.paid_at,
      o.expires_at,
      o.created_at,
      o.updated_at,

      m.name AS merchant_name,

      mc.code AS machine_code,
      mc.name AS machine_name,

      l.name AS location_name,
      l.address AS location_address
    FROM orders o
    INNER JOIN merchants m ON m.id = o.merchant_id
    INNER JOIN machines mc ON mc.id = o.machine_id
    LEFT JOIN locations l ON l.id = o.location_id
    WHERE o.id = ?
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [id, 1]);
  return rows[0] || null;
};

exports.findItemsByOrderId = async (order_id) => {
  const sql = `
    SELECT
      oi.id,
      oi.order_id,
      oi.slot_id,
      oi.slot_code,
      oi.product_id,
      oi.product_sku,
      oi.product_name,
      oi.qty,
      oi.unit_price,
      oi.line_total,
      oi.created_at
    FROM order_items oi
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [order_id, 200]);
  return rows;
};

exports.findByPaymentRefOrOrderCode = async (ref) => {
  const sql = `
    SELECT
      id,
      order_code,
      merchant_id,
      machine_id,
      location_id,
      status,
      currency,
      subtotal,
      total,
      payment_provider,
      payment_ref,
      paid_at,
      expires_at,
      created_at,
      updated_at
    FROM orders
    WHERE payment_ref = ?
       OR order_code = ?
    ORDER BY id DESC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [ref, ref, 1]);
  return rows[0] || null;
};

exports.updatePaymentWebhookStatus = async ({
  id,
  status,
  payment_provider,
  payment_ref,
  paid_at,
  expires_at,
}) => {
  const sql = `
    UPDATE orders
    SET
      status = ?,
      payment_provider = ?,
      payment_ref = ?,
      paid_at = ?,
      expires_at = ?,
      updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
    LIMIT ?
  `;

  const [result] = await pool.query(sql, [
    status,
    payment_provider,
    payment_ref,
    paid_at,
    expires_at,
    id,
    1,
  ]);

  return result;
};

exports.findByPaymentRefOrOrderCodeForUpdate = async (ref, conn) => {
  const executor = conn || pool;

  const sql = `
    SELECT
      id,
      order_code,
      merchant_id,
      machine_id,
      location_id,
      status,
      currency,
      subtotal,
      total,
      payment_provider,
      payment_ref,
      paid_at,
      expires_at,
      created_at,
      updated_at
    FROM orders
    WHERE payment_ref = ?
       OR order_code = ?
    ORDER BY id DESC
    LIMIT ?
    FOR UPDATE
  `;

  const [rows] = await executor.query(sql, [ref, ref, 1]);
  return rows[0] || null;
};

exports.findFirstItemByOrderId = async (order_id, conn) => {
  const executor = conn || pool;

  const sql = `
    SELECT
      oi.id,
      oi.order_id,
      oi.slot_id,
      oi.product_id,
      oi.qty,
      oi.unit_price,
      oi.line_total,
      oi.product_name,
      oi.product_sku,
      oi.slot_code,
      oi.created_at
    FROM order_items oi
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
    LIMIT ?
  `;

  const [rows] = await executor.query(sql, [order_id, 1]);
  return rows[0] || null;
};

exports.decrementMachineSlotStock = async ({ slot_id, qty }, conn) => {
  const executor = conn || pool;

  const sql = `
    UPDATE machine_slots
    SET
      stock = stock - ?,
      updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
      AND stock >= ?
    LIMIT ?
  `;

  const [result] = await executor.query(sql, [
    qty,
    slot_id,
    qty,
    1,
  ]);

  return result;
};

exports.updatePaymentWebhookStatus = async ({
  id,
  status,
  payment_provider,
  payment_ref,
  paid_at,
  expires_at,
}, conn) => {
  const executor = conn || pool;

  const sql = `
    UPDATE orders
    SET
      status = ?,
      payment_provider = ?,
      payment_ref = ?,
      paid_at = ?,
      expires_at = ?,
      updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = ?
    LIMIT ?
  `;

  const [result] = await executor.query(sql, [
    status,
    payment_provider,
    payment_ref,
    paid_at,
    expires_at,
    id,
    1,
  ]);

  return result;
};