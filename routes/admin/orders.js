const router = require("express").Router();
const orders = require("../../controllers/admin/orders");
const { requireAuth, requireRole } = require("../../middleware/auth");

router.get("/", requireAuth, requireRole("admin", "staff"), orders.list);
router.get("/:id", requireAuth, requireRole("admin", "staff"), orders.detail);

module.exports = router;
