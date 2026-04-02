// controllers/admin/machines.js
const machineModel = require("../../models/machine");
const locationModel = require("../../models/location");
const { formatDateId } = require("../../helper-function/format-date");

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
      machineModel.countAll(),
      machineModel.listPaginated({ limit, offset }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.render("admin/machines/list", {
      title: "Machines",
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
    });
  } catch (err) {
    return next(err);
  }
};

exports.renderNew = async (req, res, next) => {
  try {
    const locations = await locationModel.listActiveForSelect();

    return res.render("admin/machines/new", {
      title: "New Machine",
      user: req.user,
      error: null,
      locations,
      value: { code: "", name: "", location_id: "", is_active: 1 },
    });
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const code = clean(req.body.code);
    const name = clean(req.body.name) || null;
    const location_id = toInt(req.body.location_id, 0);
    const is_active = req.body.is_active === "0" ? 0 : 1;

    const locations = await locationModel.listActiveForSelect();

    if (!code) {
      return res.status(400).render("admin/machines/new", {
        title: "New Machine",
        user: req.user,
        error: "Machine code wajib diisi (unik).",
        locations,
        value: { code, name: name || "", location_id: String(location_id || ""), is_active },
      });
    }
    if (!location_id) {
      return res.status(400).render("admin/machines/new", {
        title: "New Machine",
        user: req.user,
        error: "Location wajib dipilih.",
        locations,
        value: { code, name: name || "", location_id: "", is_active },
      });
    }

    const existing = await machineModel.findByCode(code);
    if (existing) {
      return res.status(409).render("admin/machines/new", {
        title: "New Machine",
        user: req.user,
        error: "Machine code sudah ada. Gunakan code lain.",
        locations,
        value: { code, name: name || "", location_id: String(location_id), is_active },
      });
    }

    await machineModel.create({ code, name, location_id, is_active });
    return res.redirect("/admin/machines");
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      const locations = await locationModel.listActiveForSelect();
      return res.status(409).render("admin/machines/new", {
        title: "New Machine",
        user: req.user,
        error: "Machine code sudah ada. Gunakan code lain.",
        locations,
        value: {
          code: clean(req.body.code),
          name: clean(req.body.name),
          location_id: clean(req.body.location_id),
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

    const [machine, locations] = await Promise.all([
      machineModel.findById(id),
      locationModel.listAllForSelect(),
    ]);

    if (!machine) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    return res.render("admin/machines/edit", {
      title: "Edit Machine",
      user: req.user,
      error: null,
      machine,
      locations,
      value: {
        code: machine.code || "",
        name: machine.name || "",
        location_id: String(machine.location_id || ""),
        is_active: machine.is_active ? 1 : 0,
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

    const machine = await machineModel.findById(id);
    if (!machine) return res.status(404).render("errors/404", { title: "Not Found", path: req.originalUrl });

    const code = clean(req.body.code);
    const name = clean(req.body.name) || null;
    const location_id = toInt(req.body.location_id, 0);
    const is_active = req.body.is_active === "0" ? 0 : 1;

    const locations = await locationModel.listAllForSelect();

    if (!code) {
      return res.status(400).render("admin/machines/edit", {
        title: "Edit Machine",
        user: req.user,
        error: "Machine code wajib diisi (unik).",
        machine,
        locations,
        value: { code, name: name || "", location_id: String(location_id || ""), is_active },
      });
    }
    if (!location_id) {
      return res.status(400).render("admin/machines/edit", {
        title: "Edit Machine",
        user: req.user,
        error: "Location wajib dipilih.",
        machine,
        locations,
        value: { code, name: name || "", location_id: "", is_active },
      });
    }

    if (code !== machine.code) {
      const existing = await machineModel.findByCode(code);
      if (existing && Number(existing.id) !== Number(id)) {
        return res.status(409).render("admin/machines/edit", {
          title: "Edit Machine",
          user: req.user,
          error: "Machine code sudah ada. Gunakan code lain.",
          machine,
          locations,
          value: { code, name: name || "", location_id: String(location_id), is_active },
        });
      }
    }

    await machineModel.updateById({ id, code, name, location_id, is_active });
    return res.redirect("/admin/machines");
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      const locations = await locationModel.listAllForSelect();
      return res.status(409).render("admin/machines/edit", {
        title: "Edit Machine",
        user: req.user,
        error: "Machine code sudah ada. Gunakan code lain.",
        machine: { id: req.params.id },
        locations,
        value: {
          code: clean(req.body.code),
          name: clean(req.body.name),
          location_id: clean(req.body.location_id),
          is_active: req.body.is_active === "0" ? 0 : 1,
        },
      });
    }
    return next(err);
  }
};
