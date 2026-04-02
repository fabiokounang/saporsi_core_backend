const router = require("express").Router();
const merchant = require("../controllers/merchant");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", requireAuth, requireRole("merchant"), merchant.renderHome);

module.exports = router;
