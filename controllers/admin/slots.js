// controllers/admin/slots.js
const slotModel = require("../../models/slot");
const machineModel = require("../../models/machine");
const productModel = require("../../models/product");
const { formatDateId } = require("../../helper-function/format-date");

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
};
const clean = (v) => String(v || "").trim();

const parsePriceNullable = (v) => {
  const raw = clean(v);
  if (!raw) return null; // null means use product price
  const num = raw.replace(/[.,\s]/g, "");
  const n = Number(num);
  if (!Number.isFinite(n)) return "INVALID";
  const x = Math.floor(n);
  return x >= 0 ? x : "INVALID";
};

const parseUInt = (v, def, allowNull = false) => {
  const raw = clean(v);
  if (allowNull && raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return def;
  return Math.floor(n);
};

exports.pickMachine = async (req, res, next) => {
  try {
    const machines = await machineModel.listAllForSelect();

    return res.render("admin/slots/pick-machine", {
      title: "Slots",
      user: req.user,
      machines,
      error: null,
    });
  } catch (err) {
    return next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const machine_id = toInt(req.query.machine_id, 0);
    if (!machine_id) return res.redirect("/admin/slots");

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(5, toInt(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const [total, rows, machines] = await Promise.all([
      slotModel.countByMachine(machine_id),
      slotModel.listByMachinePaginated({ machine_id, limit, offset }),
      machineModel.listAllForSelect(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const formattedRows = rows.map((r) => {
      const finalPrice = r.slot_price === null ? r.product_base_price : r.slot_price;
      return {
        ...r,
        updated_at_fmt: formatDateId(r.updated_at),
        final_price: finalPrice,
        final_price_fmt: new Intl.NumberFormat("id-ID").format(finalPrice || 0),
        product_price_fmt: new Intl.NumberFormat("id-ID").format(r.product_base_price || 0),
        slot_price_fmt: r.slot_price === null ? "-" : new Intl.NumberFormat("id-ID").format(r.slot_price || 0),
      };
    });
    // console.log(formattedRows)
    return res.render("admin/slots/list", {
      title: "Slots",
      user: req.user,
      rows: formattedRows,
      machine_id,
      machines,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    return next(err);
  }
};

exports.renderNew = async (req, res, next) => {
  try {
    const machine_id = toInt(req.query.machine_id, 0);
    if (!machine_id) return res.redirect("/admin/slots");

    const [machines, products] = await Promise.all([
      machineModel.listAllForSelect(),
      productModel.listActiveForSelect(),
    ]);

    const machine = (machines || []).find((m) => String(m.id) === String(machine_id)) || null;
    if (!machine) return res.redirect("/admin/slots");

    return res.render("admin/slots/new", {
      title: "New Slot",
      user: req.user,
      error: null,
      machine,     // ✅ lock machine object
      products,
      value: {
        slot_code: "",
        product_id: "",
        slot_price: "",
        stock: "0",
        capacity: "",
        is_active: 1,
      },
    });
  } catch (err) {
    return next(err);
  }
};


exports.create = async (req, res, next) => {
  try {
    const machine_id = toInt(req.body.machine_id, 0);
    const slot_code = clean(req.body.slot_code).toUpperCase();
    const product_id = toInt(req.body.product_id, 0);
    const slot_price = parsePriceNullable(req.body.slot_price); // null = pakai harga product
    const stock = parseUInt(req.body.stock, 0, false);
    const capacity = parseUInt(req.body.capacity, null, true);
    const is_active = req.body.is_active === "0" ? 0 : 1;

    const [machines, products] = await Promise.all([
      machineModel.listAllForSelect(),
      productModel.listActiveForSelect(),
    ]);

    const machine = (machines || []).find((m) => String(m.id) === String(machine_id)) || null;

    // ✅ machine harus valid, karena kita lock berdasarkan context
    if (!machine_id || !machine) return res.redirect("/admin/slots");

    const rerender = (statusCode, errorMsg) => {
      return res.status(statusCode).render("admin/slots/new", {
        title: "New Slot",
        user: req.user,
        error: errorMsg,
        machine,
        products,
        value: {
          slot_code,
          product_id: product_id ? String(product_id) : "",
          slot_price: clean(req.body.slot_price),
          stock: String(stock),
          capacity: clean(req.body.capacity),
          is_active,
        },
      });
    };

    if (!slot_code) return rerender(400, "Slot code wajib diisi (contoh: A1 / 01 / L-07).");
    if (!product_id) return rerender(400, "Product wajib dipilih.");
    if (slot_price === "INVALID") return rerender(400, "Slot price harus angka (atau kosong untuk pakai harga product).");
    if (capacity !== null && stock > capacity) return rerender(400, "Stock tidak boleh lebih besar dari capacity.");

    const existing = await slotModel.findByMachineAndCode({ machine_id, slot_code });
    if (existing) return rerender(409, "Slot code ini sudah ada di machine tersebut.");

    await slotModel.create({
      machine_id,
      slot_code,
      product_id,
      slot_price: slot_price === null ? null : slot_price,
      stock,
      capacity,
      is_active,
    });

    return res.redirect(`/admin/slots/list?machine_id=${encodeURIComponent(machine_id)}`);
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      try {
        const machine_id = toInt(req.body.machine_id, 0);
        const [machines, products] = await Promise.all([
          machineModel.listAllForSelect(),
          productModel.listActiveForSelect(),
        ]);
        const machine = (machines || []).find((m) => String(m.id) === String(machine_id)) || null;
        if (!machine) return res.redirect("/admin/slots");

        return res.status(409).render("admin/slots/new", {
          title: "New Slot",
          user: req.user,
          error: "Slot code ini sudah ada di machine tersebut.",
          machine,
          products,
          value: {
            slot_code: clean(req.body.slot_code).toUpperCase(),
            product_id: clean(req.body.product_id),
            slot_price: clean(req.body.slot_price),
            stock: clean(req.body.stock),
            capacity: clean(req.body.capacity),
            is_active: req.body.is_active === "0" ? 0 : 1,
          },
        });
      } catch (e) {
        return next(err);
      }
    }
    return next(err);
  }
};


exports.renderEdit = async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const slot = await slotModel.findById(id);
    if (!slot) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const [machines, products] = await Promise.all([
      machineModel.listAllForSelect(),
      productModel.listAllForSelect(),
    ]);

    return res.render("admin/slots/edit", {
      title: "Edit Slot",
      user: req.user,
      error: null,
      slot,
      machines,
      products,
      value: {
        machine_id: String(slot.machine_id),
        slot_code: slot.slot_code || "",
        product_id: String(slot.product_id),
        slot_price: slot.slot_price === null ? "" : String(slot.slot_price),
        stock: String(slot.stock ?? 0),
        capacity: slot.capacity === null ? "" : String(slot.capacity),
        is_active: slot.is_active ? 1 : 0,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const current = await slotModel.findById(id);
    if (!current) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const machine_id = toInt(req.body.machine_id, 0);
    const slot_code = clean(req.body.slot_code).toUpperCase();
    const product_id = toInt(req.body.product_id, 0);
    const slot_price = parsePriceNullable(req.body.slot_price);
    const stock = parseUInt(req.body.stock, 0, false);
    const capacity = parseUInt(req.body.capacity, null, true);
    const is_active = req.body.is_active === "0" ? 0 : 1;

    const [machines, products] = await Promise.all([
      machineModel.listAllForSelect(),
      productModel.listAllForSelect(),
    ]);

    if (!machine_id) {
      return res.status(400).render("admin/slots/edit", {
        title: "Edit Slot",
        user: req.user,
        error: "Machine wajib dipilih.",
        slot: current,
        machines,
        products,
        value: { machine_id: "", slot_code, product_id: String(product_id || ""), slot_price: clean(req.body.slot_price), stock: String(stock), capacity: clean(req.body.capacity), is_active },
      });
    }
    if (!slot_code) {
      return res.status(400).render("admin/slots/edit", {
        title: "Edit Slot",
        user: req.user,
        error: "Slot code wajib diisi.",
        slot: current,
        machines,
        products,
        value: { machine_id: String(machine_id), slot_code, product_id: String(product_id || ""), slot_price: clean(req.body.slot_price), stock: String(stock), capacity: clean(req.body.capacity), is_active },
      });
    }
    if (!product_id) {
      return res.status(400).render("admin/slots/edit", {
        title: "Edit Slot",
        user: req.user,
        error: "Product wajib dipilih.",
        slot: current,
        machines,
        products,
        value: { machine_id: String(machine_id), slot_code, product_id: "", slot_price: clean(req.body.slot_price), stock: String(stock), capacity: clean(req.body.capacity), is_active },
      });
    }
    if (slot_price === "INVALID") {
      return res.status(400).render("admin/slots/edit", {
        title: "Edit Slot",
        user: req.user,
        error: "Slot price harus angka (atau kosong).",
        slot: current,
        machines,
        products,
        value: { machine_id: String(machine_id), slot_code, product_id: String(product_id), slot_price: clean(req.body.slot_price), stock: String(stock), capacity: clean(req.body.capacity), is_active },
      });
    }
    if (capacity !== null && stock > capacity) {
      return res.status(400).render("admin/slots/edit", {
        title: "Edit Slot",
        user: req.user,
        error: "Stock tidak boleh lebih besar dari capacity.",
        slot: current,
        machines,
        products,
        value: { machine_id: String(machine_id), slot_code, product_id: String(product_id), slot_price: clean(req.body.slot_price), stock: String(stock), capacity: clean(req.body.capacity), is_active },
      });
    }

    // if machine_id or slot_code changed, ensure unique (machine_id, slot_code)
    if (machine_id !== current.machine_id || slot_code !== current.slot_code) {
      const existing = await slotModel.findByMachineAndCode({ machine_id, slot_code });
      if (existing && Number(existing.id) !== Number(id)) {
        return res.status(409).render("admin/slots/edit", {
          title: "Edit Slot",
          user: req.user,
          error: "Slot code ini sudah ada di machine tersebut.",
          slot: current,
          machines,
          products,
          value: { machine_id: String(machine_id), slot_code, product_id: String(product_id), slot_price: clean(req.body.slot_price), stock: String(stock), capacity: clean(req.body.capacity), is_active },
        });
      }
    }

    await slotModel.updateById({
      id,
      machine_id,
      slot_code,
      product_id,
      slot_price: slot_price === null ? null : slot_price,
      stock,
      capacity,
      is_active,
    });

    return res.redirect(`/admin/slots/list?machine_id=${encodeURIComponent(machine_id)}`);
  } catch (err) {
    return next(err);
  }
};
