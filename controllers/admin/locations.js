// controllers/admin/locations.js
const locationModel = require("../../models/location");

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
};
const clean = (v) => String(v || "").trim();

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(50, Math.max(5, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      locationModel.countAll(),
      locationModel.listPaginated({ limit, offset }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.render("admin/locations/list", {
      title: "Locations",
      user: req.user,
      rows,
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
  return res.render("admin/locations/new", {
    title: "New Location",
    user: req.user,
    error: null,
    value: { name: "", address: "", notes: "", is_active: 1 },
  });
};

exports.create = async (req, res, next) => {
  try {
    const name = clean(req.body.name);
    const address = clean(req.body.address) || null;
    const notes = clean(req.body.notes) || null;
    const is_active = req.body.is_active === "0" ? 0 : 1;

    if (!name) {
      return res.status(400).render("admin/locations/new", {
        title: "New Location",
        user: req.user,
        error: "Nama lokasi wajib diisi.",
        value: { name, address: address || "", notes: notes || "", is_active },
      });
    }

    const existing = await locationModel.findByName(name);
    if (existing) {
      return res.status(409).render("admin/locations/new", {
        title: "New Location",
        user: req.user,
        error: "Nama lokasi sudah ada. Gunakan nama lain.",
        value: { name, address: address || "", notes: notes || "", is_active },
      });
    }

    await locationModel.create({ name, address, notes, is_active });
    return res.redirect("/admin/locations");
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).render("admin/locations/new", {
        title: "New Location",
        user: req.user,
        error: "Nama lokasi sudah ada. Gunakan nama lain.",
        value: {
          name: clean(req.body.name),
          address: clean(req.body.address),
          notes: clean(req.body.notes),
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

    const location = await locationModel.findById(id);
    if (!location) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    return res.render("admin/locations/edit", {
      title: "Edit Location",
      user: req.user,
      error: null,
      location,
      value: {
        name: location.name || "",
        address: location.address || "",
        notes: location.notes || "",
        is_active: location.is_active ? 1 : 0,
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

    const location = await locationModel.findById(id);
    if (!location) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const name = clean(req.body.name);
    const address = clean(req.body.address) || null;
    const notes = clean(req.body.notes) || null;
    const is_active = req.body.is_active === "0" ? 0 : 1;

    if (!name) {
      return res.status(400).render("admin/locations/edit", {
        title: "Edit Location",
        user: req.user,
        error: "Nama lokasi wajib diisi.",
        location,
        value: { name, address: address || "", notes: notes || "", is_active },
      });
    }

    if (name !== location.name) {
      const existing = await locationModel.findByName(name);
      if (existing && Number(existing.id) !== Number(id)) {
        return res.status(409).render("admin/locations/edit", {
          title: "Edit Location",
          user: req.user,
          error: "Nama lokasi sudah ada. Gunakan nama lain.",
          location,
          value: { name, address: address || "", notes: notes || "", is_active },
        });
      }
    }

    await locationModel.updateById({ id, name, address, notes, is_active });
    return res.redirect("/admin/locations");
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).render("admin/locations/edit", {
        title: "Edit Location",
        user: req.user,
        error: "Nama lokasi sudah ada. Gunakan nama lain.",
        location: { id: req.params.id },
        value: {
          name: clean(req.body.name),
          address: clean(req.body.address),
          notes: clean(req.body.notes),
          is_active: req.body.is_active === "0" ? 0 : 1,
        },
      });
    }
    return next(err);
  }
};
