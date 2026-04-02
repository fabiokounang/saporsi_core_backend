const router = require("express").Router();
const slots = require("../../controllers/admin/slots");
const { requireAuth, requireRole } = require("../../middleware/auth");

router.get("/", requireAuth, requireRole("admin", "staff"), slots.pickMachine);

// list by machine via query param (biar fleksibel)
router.get("/list", requireAuth, requireRole("admin", "staff"), slots.list);

router.get("/new", requireAuth, requireRole("admin", "staff"), slots.renderNew);
router.post("/", requireAuth, requireRole("admin", "staff"), slots.create);

router.get("/:id/edit", requireAuth, requireRole("admin", "staff"), slots.renderEdit);
router.post("/:id", requireAuth, requireRole("admin", "staff"), slots.update);

module.exports = router;
