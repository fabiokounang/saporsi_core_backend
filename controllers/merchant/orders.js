// controllers/merchant/orders.js
const axios = require("axios");
const orderModel = require("../../models/order");
const { formatDateId } = require("../../helper-function/format-date");

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
};
const clean = (v) => String(v || "").trim();
const fmtMoney = (n) => new Intl.NumberFormat("id-ID").format(Number(n || 0));

const toPositiveInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
};

const pad = (num, size) => String(num).padStart(size, "0");

const makeOrderCode = (lastId = 0) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1, 2);
  const dd = pad(now.getDate(), 2);
  const seq = pad(Number(lastId) + 1, 6);

  return `ORD-${yyyy}${mm}${dd}-${seq}`;
};

const parseVendorExpiry = (raw) => {
  if (!raw) return null;

  const source = raw.data || raw;

  if (source.expires_at) return source.expires_at;
  if (source.expiry_time) return source.expiry_time;
  if (source.expired_at) return source.expired_at;

  return null;
};

exports.list = async (req, res, next) => {
  try {
    // asumsi req.user punya merchant_id untuk role merchant
    const merchant_id = Number(req.user?.merchant_id || 0);
    if (!merchant_id) return res.status(403).render("errors/403", { title: "Forbidden", path: req.originalUrl });

    const status = clean(req.query.status);

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(5, toInt(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const total = await orderModel.countMerchant({ merchant_id, status: status || null });
    const rows = await orderModel.listMerchant({ merchant_id, status: status || null, limit, offset });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const mapped = rows.map((r) => ({
      ...r,
      created_at_fmt: formatDateId(r.created_at),
      paid_at_fmt: r.paid_at ? formatDateId(r.paid_at) : "-",
      total_fmt: fmtMoney(r.total),
    }));

    return res.render("merchant/orders/list", {
      title: "Orders",
      user: req.user,
      rows: mapped,
      filters: { status: status || "" },
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    return next(err);
  }
};

exports.createOrderAndGenerateQris = async (req, res, next) => {
  try {
    const merchant_id = Number(req.user?.merchant_id || req.body.merchant_id || 0);
    if (!merchant_id) {
      return res.status(403).json({
        success: false,
        message: "merchant_id is required",
      });
    }

    const machine_id = toPositiveInt(req.body.machine_id);
    const slot_id = toPositiveInt(req.body.slot_id);
    const qty = toPositiveInt(req.body.qty || 1);

    if (!machine_id) {
      return res.status(400).json({
        success: false,
        message: "machine_id is required",
      });
    }

    if (!slot_id) {
      return res.status(400).json({
        success: false,
        message: "slot_id is required",
      });
    }

    if (!qty) {
      return res.status(400).json({
        success: false,
        message: "qty must be a positive integer",
      });
    }

    const merchant = await orderModel.findMerchantActiveById(merchant_id);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found or inactive",
      });
    }

    const machine = await orderModel.findMachineActiveById(machine_id);
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found or inactive",
      });
    }

    const slot = await orderModel.findMachineSlotActiveById(slot_id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found or inactive",
      });
    }

    if (Number(slot.machine_id) !== machine_id) {
      return res.status(400).json({
        success: false,
        message: "Slot does not belong to selected machine",
      });
    }

    if (Number(slot.stock || 0) < qty) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    const product = await orderModel.findProductActiveById(slot.product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or inactive",
      });
    }

    const unit_price = Number(slot.price || product.price || 0);
    if (!unit_price || unit_price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product price",
      });
    }

    const subtotal = unit_price * qty;
    const total = subtotal;

    const lastId = await orderModel.getLastOrderId();
    const order_code = makeOrderCode(lastId);

    const order_id = await orderModel.create({
      order_code,
      merchant_id,
      machine_id: machine.id,
      location_id: machine.location_id || null,
      status: "PENDING",
      currency: "IDR",
      subtotal,
      total,
      payment_provider: null,
      payment_ref: null,
      paid_at: null,
      expires_at: null,
    });

    await orderModel.createItem({
      order_id,
      slot_id: slot.id,
      product_id: product.id,
      qty,
      unit_price,
      line_total: total,
      product_name: product.name,
      product_sku: product.sku,
      slot_code: slot.slot_code,
    });

    const vendorPayload = {
      core_order_id: String(order_id),
      order_id: order_code,
      gross_amount: total,
      customer: null,
      items: [
        {
          id: String(product.id),
          price: unit_price,
          quantity: qty,
          name: product.name,
        },
      ],
      meta: {
        order_code,
        merchant_id,
        machine_id: machine.id,
        slot_id: slot.id,
        product_id: product.id,
        product_sku: product.sku,
        qty,
      },
    };

    let vendorResult = null;

    try {
      const vendorResponse = await axios.post(
        `${process.env.VENDOR_PAYMENT_BASE_URL}/api/payments/qris`,
        vendorPayload,
        {
          timeout: Number(process.env.VENDOR_PAYMENT_TIMEOUT_MS || 15000),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Internal-Token": process.env.VENDOR_PAYMENT_INTERNAL_TOKEN || "",
            "X-Internal-Service": "core-service",
          },
        }
      );

      vendorResult = vendorResponse.data || null;
    } catch (vendorErr) {
      console.error("Vendor payment create QRIS error:", vendorErr.response?.data || vendorErr.message);

      const order = await orderModel.findDetailById(order_id);
      const items = await orderModel.findItemsByOrderId(order_id);

      return res.status(201).json({
        success: true,
        message: "Order created, but failed to generate QRIS",
        data: {
          order,
          items,
          payment: null,
          vendor_error: vendorErr.response?.data || vendorErr.message,
        },
      });
    }

    const normalizedVendor = vendorResult?.data || vendorResult || {};
    const payment_ref = normalizedVendor.order_id || order_code;
    const expires_at = parseVendorExpiry(vendorResult);

    await orderModel.updatePaymentInfo({
      id: order_id,
      payment_provider: "MIDTRANS",
      payment_ref,
      expires_at,
    });

    const order = await orderModel.findDetailById(order_id);
    const items = await orderModel.findItemsByOrderId(order_id);
    console.log(normalizedVendor.qr_image_url)
    return res.render("temp", {
      error: null,
      success: true,
      old: {},
      result: {
        url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(normalizedVendor.qr_string)}`,
        provider: "MIDTRANS",
        payment_ref,
        transaction_id: normalizedVendor.transaction_id || null,
        transaction_status: normalizedVendor.transaction_status || null,
        payment_type: normalizedVendor.payment_type || "qris",
        gross_amount: normalizedVendor.gross_amount || total,
        qr_image_url: normalizedVendor.qr_image_url || null,
        qr_string: normalizedVendor.qr_string || null,
        expires_at,
        raw: normalizedVendor.raw || normalizedVendor,
      }
    })
    // return res.status(201).json({
    //   success: true,
    //   message: "Order created and QRIS generated successfully",
    //   data: {
    //     order,
    //     items,
    //     payment: {
    //       provider: "MIDTRANS",
    //       payment_ref,
    //       transaction_id: normalizedVendor.transaction_id || null,
    //       transaction_status: normalizedVendor.transaction_status || null,
    //       payment_type: normalizedVendor.payment_type || "qris",
    //       gross_amount: normalizedVendor.gross_amount || total,
    //       qr_image_url: normalizedVendor.qr_image_url || null,
    //       qr_string: normalizedVendor.qr_string || null,
    //       expires_at,
    //       raw: normalizedVendor.raw || normalizedVendor,
    //     },
    //   },
    // });
  } catch (err) {
    return next(err);
  }
};