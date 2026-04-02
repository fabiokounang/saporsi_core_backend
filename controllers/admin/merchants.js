// controllers/admin/merchants.js
const { formatDateId } = require("../../helper-function/format-date");
const merchantModel = require("../../models/merchant");

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
};

const normalizeName = (name) => String(name || "").trim();

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(5, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      merchantModel.countAll(),
      merchantModel.listPaginated({ limit, offset }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.render("admin/merchants/list", {
      title: "Merchants",
      user: req.user,
      rows: rows.map((r) => {
        return {
          ...r,
          created_at: formatDateId(r.created_at),
          updated_at: formatDateId(r.updated_at),
        };
      }),
      page,
      limit,
      total,
      totalPages,
      q: null,
    });
  } catch (err) {
    return next(err);
  }
};

exports.renderNew = async (req, res) => {
  return res.render("admin/merchants/new", {
    title: "New Merchant",
    user: req.user,
    error: null,
    value: { name: "", is_active: 1 },
  });
};

exports.create = async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name);
    const is_active = req.body.is_active === "0" ? 0 : 1;

    if (!name) {
      return res.status(400).render("admin/merchants/new", {
        title: "New Merchant",
        user: req.user,
        error: "Nama merchant wajib diisi.",
        value: { name, is_active },
      });
    }

    // (Optional) pre-check name (still keep DB unique constraint)
    const existing = await merchantModel.findByName(name);
    if (existing) {
      return res.status(409).render("admin/merchants/new", {
        title: "New Merchant",
        user: req.user,
        error: "Nama merchant sudah ada. Gunakan nama lain.",
        value: { name, is_active },
      });
    }

    await merchantModel.create({ name, is_active });
    return res.redirect("/admin/merchants");
  } catch (err) {
    // handle unique constraint just in case
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).render("admin/merchants/new", {
        title: "New Merchant",
        user: req.user,
        error: "Nama merchant sudah ada. Gunakan nama lain.",
        value: { name: String(req.body.name || "").trim(), is_active: req.body.is_active === "0" ? 0 : 1 },
      });
    }
    return next(err);
  }
};

exports.renderEdit = async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(404).render("errors/404", { title: "Not Found" });

    const merchant = await merchantModel.findById(id);
    if (!merchant) return res.status(404).render("errors/404", { title: "Not Found" });

    return res.render("admin/merchants/edit", {
      title: "Edit Merchant",
      user: req.user,
      error: null,
      merchant,
      value: {
        name: merchant.name,
        is_active: merchant.is_active ? 1 : 0,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(404).render("errors/404", { title: "Not Found" });

    const name = normalizeName(req.body.name);
    const is_active = req.body.is_active === "0" ? 0 : 1;

    const merchant = await merchantModel.findById(id);
    if (!merchant) return res.status(404).render("errors/404", { title: "Not Found" });

    if (!name) {
      return res.status(400).render("admin/merchants/edit", {
        title: "Edit Merchant",
        user: req.user,
        error: "Nama merchant wajib diisi.",
        merchant,
        value: { name, is_active },
      });
    }

    // If name changed, check duplicates
    if (name !== merchant.name) {
      const existing = await merchantModel.findByName(name);
      if (existing && Number(existing.id) !== Number(id)) {
        return res.status(409).render("admin/merchants/edit", {
          title: "Edit Merchant",
          user: req.user,
          error: "Nama merchant sudah ada. Gunakan nama lain.",
          merchant,
          value: { name, is_active },
        });
      }
    }

    await merchantModel.updateById({ id, name, is_active });
    return res.redirect("/admin/merchants");
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).render("admin/merchants/edit", {
        title: "Edit Merchant",
        user: req.user,
        error: "Nama merchant sudah ada. Gunakan nama lain.",
        merchant: { id: req.params.id },
        value: { name: String(req.body.name || "").trim(), is_active: req.body.is_active === "0" ? 0 : 1 },
      });
    }
    return next(err);
  }
};
