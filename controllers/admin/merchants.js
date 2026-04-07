// controllers/admin/merchants.js
const { formatDateId } = require("../../helper-function/format-date");
const merchantModel = require("../../models/merchant");
const userModel = require("../../models/user");
const { pool } = require("../../utils/db");

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
};

const normalizeName = (name) => String(name || "").trim();

exports.list = async (req, res, next) => {
  try {
    const archivedOnly = String(req.query.archived || "") === "1";
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(5, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      merchantModel.countAll({ archivedOnly }),
      merchantModel.listPaginated({ limit, offset, archivedOnly }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.render("admin/merchants/list", {
      title: archivedOnly ? "Merchants (Arsip)" : "Merchants",
      user: req.user,
      rows: rows.map((r) => ({
        ...r,
        created_at: formatDateId(r.created_at),
        updated_at: formatDateId(r.updated_at),
        deleted_at_fmt: r.deleted_at ? formatDateId(r.deleted_at) : null,
      })),
      page,
      limit,
      total,
      totalPages,
      archivedOnly,
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

    const existing = await merchantModel.findByName(name);
    if (existing) {
      return res.status(409).render("admin/merchants/new", {
        title: "New Merchant",
        user: req.user,
        error: "Nama merchant sudah ada. Gunakan nama lain.",
        value: { name, is_active },
      });
    }

    await merchantModel.createWithAutoCode({ name, is_active });
    return res.redirect("/admin/merchants");
  } catch (err) {
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

    const merchant = await merchantModel.findByIdAny(id);
    if (!merchant) return res.status(404).render("errors/404", { title: "Not Found" });

    const isArchived = Boolean(merchant.deleted_at);

    return res.render("admin/merchants/edit", {
      title: isArchived ? "Merchant (Arsip)" : "Edit Merchant",
      user: req.user,
      error: null,
      merchant,
      isArchived,
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
    if (!merchant) {
      return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });
    }

    if (!name) {
      return res.status(400).render("admin/merchants/edit", {
        title: "Edit Merchant",
        user: req.user,
        error: "Nama merchant wajib diisi.",
        merchant,
        isArchived: false,
        value: { name, is_active },
      });
    }

    if (name !== merchant.name) {
      const existing = await merchantModel.findByName(name);
      if (existing && Number(existing.id) !== Number(id)) {
        return res.status(409).render("admin/merchants/edit", {
          title: "Edit Merchant",
          user: req.user,
          error: "Nama merchant sudah ada. Gunakan nama lain.",
          merchant,
          isArchived: false,
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
        isArchived: false,
        value: { name: String(req.body.name || "").trim(), is_active: req.body.is_active === "0" ? 0 : 1 },
      });
    }
    return next(err);
  }
};

exports.softDelete = async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(404).render("errors/404", { title: "Not Found" });

    const row = await merchantModel.findByIdAny(id);
    if (!row) return res.status(404).render("errors/404", { title: "Not Found" });
    if (row.deleted_at) {
      return res.redirect("/admin/merchants?archived=1");
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await userModel.deactivateByMerchantId(id, conn);
      const ok = await merchantModel.softDeleteById(id, conn);
      if (!ok) {
        await conn.rollback();
        return res.redirect("/admin/merchants");
      }
      await conn.commit();
    } catch (e) {
      try {
        await conn.rollback();
      } catch (_) {}
      throw e;
    } finally {
      conn.release();
    }

    return res.redirect("/admin/merchants");
  } catch (err) {
    return next(err);
  }
};

exports.restore = async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(404).render("errors/404", { title: "Not Found" });

    const row = await merchantModel.findByIdAny(id);
    if (!row) return res.status(404).render("errors/404", { title: "Not Found" });
    if (!row.deleted_at) {
      return res.redirect(`/admin/merchants/${id}/edit`);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const ok = await merchantModel.restoreById(id, conn);
      if (!ok) {
        await conn.rollback();
        return res.redirect("/admin/merchants?archived=1");
      }
      await userModel.reactivateByMerchantId(id, conn);
      await conn.commit();
    } catch (e) {
      try {
        await conn.rollback();
      } catch (_) {}
      throw e;
    } finally {
      conn.release();
    }

    return res.redirect("/admin/merchants");
  } catch (err) {
    return next(err);
  }
};
