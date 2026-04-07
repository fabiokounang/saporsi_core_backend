const router = require("express").Router();
const merchant = require("../../controllers/admin/merchants");
const { requireAuth, requireRole } = require("../../middleware/auth");

router.get("/", requireAuth, requireRole("admin", "staff"), merchant.list);
router.get("/new", requireAuth, requireRole("admin", "staff"), merchant.renderNew);
router.post("/", requireAuth, requireRole("admin", "staff"), merchant.create);
router.get("/:id/edit", requireAuth, requireRole("admin", "staff"), merchant.renderEdit);
router.post("/:id/soft-delete", requireAuth, requireRole("admin", "staff"), merchant.softDelete);
router.post("/:id/restore", requireAuth, requireRole("admin", "staff"), merchant.restore);
router.post("/:id", requireAuth, requireRole("admin", "staff"), merchant.update);

module.exports = router;
