// routes/admin/locations.js
const router = require("express").Router();
const locations = require("../../controllers/admin/locations");
const { requireAuth, requireRole } = require("../../middleware/auth");

router.get("/", requireAuth, requireRole("admin", "staff"), locations.list);

router.get("/new", requireAuth, requireRole("admin", "staff"), locations.renderNew);
router.post("/", requireAuth, requireRole("admin", "staff"), locations.create);

router.post("/:id/soft-delete", requireAuth, requireRole("admin", "staff"), locations.softDelete);
router.post("/:id/restore", requireAuth, requireRole("admin", "staff"), locations.restore);

router.get("/:id/edit", requireAuth, requireRole("admin", "staff"), locations.renderEdit);
router.post("/:id", requireAuth, requireRole("admin", "staff"), locations.update);
router.get("/:id", requireAuth, requireRole("admin", "staff"), locations.detail);

module.exports = router;
