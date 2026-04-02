const router = require("express").Router();
const products = require("../../controllers/admin/products");
const { requireAuth, requireRole } = require("../../middleware/auth");

router.get("/", requireAuth, requireRole("admin", "staff"), products.list);

router.get("/new", requireAuth, requireRole("admin", "staff"), products.renderNew);
router.post("/", requireAuth, requireRole("admin", "staff"), products.create);

router.get("/:id/edit", requireAuth, requireRole("admin", "staff"), products.renderEdit);
router.post("/:id", requireAuth, requireRole("admin", "staff"), products.update);

module.exports = router;
