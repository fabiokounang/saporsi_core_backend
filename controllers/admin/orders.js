// controllers/admin/orders.js
const orderModel = require("../../models/order");
const { formatDateId } = require("../../helper-function/format-date");
const merchantModel = require("../../models/merchant");
const machineModel = require("../../models/machine");

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
}
const clean = (v) => String(v || "").trim();

const fmtMoney = (n) => new Intl.NumberFormat("id-ID").format(Number(n || 0));

exports.list = async (req, res, next) => {
  try {
    const status = clean(req.query.status);
    const merchant_id = toInt(req.query.merchant_id, 0) || null;
    const machine_id = toInt(req.query.machine_id, 0) || null;

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(5, toInt(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const total = await orderModel.countAdmin({ status: status || null, merchant_id, machine_id });
    const rows = await orderModel.listAdmin({ status: status || null, merchant_id, machine_id, limit, offset });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const mapped = rows.map((r) => ({
      ...r,
      created_at_fmt: formatDateId(r.created_at),
      paid_at_fmt: r.paid_at ? formatDateId(r.paid_at) : "-",
      total_fmt: fmtMoney(r.total),
    }));

    const [merchants, machines] = await Promise.all([
      merchantModel.listAllForSelect(),
      machineModel.listAllForSelect(),
    ]);


    return res.render("admin/orders/list", {
      title: "Orders",
      user: req.user,
      rows: mapped,
      merchants,
      machines,
      filters: {
        status: status || "",
        merchant_id: merchant_id ? String(merchant_id) : "",
        machine_id: machine_id ? String(machine_id) : "",
      },
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    return next(err);
  }
};

exports.detail = async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const order = await orderModel.findByIdAdmin(id);
    if (!order) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const items = await orderModel.listItemsByOrderId(id);

    const mappedItems = items.map((it) => ({
      ...it,
      unit_price_fmt: fmtMoney(it.unit_price),
      line_total_fmt: fmtMoney(it.line_total),
      created_at_fmt: formatDateId(it.created_at),
    }));

    return res.render("admin/orders/detail", {
      title: "Order Detail",
      user: req.user,
      order: {
        ...order,
        created_at_fmt: formatDateId(order.created_at),
        paid_at_fmt: order.paid_at ? formatDateId(order.paid_at) : "-",
        expires_at_fmt: order.expires_at ? formatDateId(order.expires_at) : "-",
        subtotal_fmt: fmtMoney(order.subtotal),
        total_fmt: fmtMoney(order.total),
      },
      items: mappedItems,
    });
  } catch (err) {
    return next(err);
  }
};
