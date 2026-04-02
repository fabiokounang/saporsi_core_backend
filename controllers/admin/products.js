// controllers/admin/products.js
const productModel = require("../../models/product");
const { formatDateId } = require("../../helper-function/format-date");

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
};
const clean = (v) => String(v || "").trim();

const parsePrice = (v) => {
  // allow "15.000" or "15,000" or "15000"
  const raw = clean(v).replace(/[.,\s]/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const x = Math.floor(n);
  return x >= 0 ? x : null;
};

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(5, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      productModel.countAll(),
      productModel.listPaginated({ limit, offset }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const formattedRows = rows.map((r) => ({
      ...r,
      updated_at_fmt: formatDateId(r.updated_at),
      price_fmt: new Intl.NumberFormat("id-ID").format(r.price || 0),
    }));

    return res.render("admin/products/list", {
      title: "Products",
      user: req.user,
      rows: formattedRows,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    return next(err);
  }
};

exports.renderNew = async (req, res) => {
  return res.render("admin/products/new", {
    title: "New Product",
    user: req.user,
    error: null,
    value: { sku: "", name: "", price: "", is_active: 1 },
  });
};

exports.create = async (req, res, next) => {
  try {
    const sku = clean(req.body.sku);
    const name = clean(req.body.name);
    const price = parsePrice(req.body.price);
    const is_active = req.body.is_active === "0" ? 0 : 1;

    if (!sku) {
      return res.status(400).render("admin/products/new", {
        title: "New Product",
        user: req.user,
        error: "SKU wajib diisi (unik).",
        value: { sku, name, price: clean(req.body.price), is_active },
      });
    }
    if (!name) {
      return res.status(400).render("admin/products/new", {
        title: "New Product",
        user: req.user,
        error: "Nama produk wajib diisi.",
        value: { sku, name, price: clean(req.body.price), is_active },
      });
    }
    if (price === null) {
      return res.status(400).render("admin/products/new", {
        title: "New Product",
        user: req.user,
        error: "Price harus angka (contoh: 15000).",
        value: { sku, name, price: clean(req.body.price), is_active },
      });
    }

    const existing = await productModel.findBySku(sku);
    if (existing) {
      return res.status(409).render("admin/products/new", {
        title: "New Product",
        user: req.user,
        error: "SKU sudah ada. Gunakan SKU lain.",
        value: { sku, name, price: clean(req.body.price), is_active },
      });
    }

    await productModel.create({ sku, name, price, is_active });
    return res.redirect("/admin/products");
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).render("admin/products/new", {
        title: "New Product",
        user: req.user,
        error: "SKU sudah ada. Gunakan SKU lain.",
        value: {
          sku: clean(req.body.sku),
          name: clean(req.body.name),
          price: clean(req.body.price),
          is_active: req.body.is_active === "0" ? 0 : 1,
        },
      });
    }
    return next(err);
  }
};

exports.renderEdit = async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const product = await productModel.findById(id);
    if (!product) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    return res.render("admin/products/edit", {
      title: "Edit Product",
      user: req.user,
      error: null,
      product,
      value: {
        sku: product.sku || "",
        name: product.name || "",
        price: String(product.price ?? ""),
        is_active: product.is_active ? 1 : 0,
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

    const product = await productModel.findById(id);
    if (!product) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const sku = clean(req.body.sku);
    const name = clean(req.body.name);
    const price = parsePrice(req.body.price);
    const is_active = req.body.is_active === "0" ? 0 : 1;

    if (!sku) {
      return res.status(400).render("admin/products/edit", {
        title: "Edit Product",
        user: req.user,
        error: "SKU wajib diisi (unik).",
        product,
        value: { sku, name, price: clean(req.body.price), is_active },
      });
    }
    if (!name) {
      return res.status(400).render("admin/products/edit", {
        title: "Edit Product",
        user: req.user,
        error: "Nama produk wajib diisi.",
        product,
        value: { sku, name, price: clean(req.body.price), is_active },
      });
    }
    if (price === null) {
      return res.status(400).render("admin/products/edit", {
        title: "Edit Product",
        user: req.user,
        error: "Price harus angka (contoh: 15000).",
        product,
        value: { sku, name, price: clean(req.body.price), is_active },
      });
    }

    if (sku !== product.sku) {
      const existing = await productModel.findBySku(sku);
      if (existing && Number(existing.id) !== Number(id)) {
        return res.status(409).render("admin/products/edit", {
          title: "Edit Product",
          user: req.user,
          error: "SKU sudah ada. Gunakan SKU lain.",
          product,
          value: { sku, name, price: clean(req.body.price), is_active },
        });
      }
    }

    await productModel.updateById({ id, sku, name, price, is_active });
    return res.redirect("/admin/products");
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).render("admin/products/edit", {
        title: "Edit Product",
        user: req.user,
        error: "SKU sudah ada. Gunakan SKU lain.",
        product: { id: req.params.id },
        value: {
          sku: clean(req.body.sku),
          name: clean(req.body.name),
          price: clean(req.body.price),
          is_active: req.body.is_active === "0" ? 0 : 1,
        },
      });
    }
    return next(err);
  }
};
