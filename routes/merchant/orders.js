const router = require("express").Router();
const orders = require("../../controllers/merchant/orders");
const { requireAuth, requireRole } = require("../../middleware/auth");

router.post("/create-qris", requireAuth, requireRole("merchant"), orders.createOrderAndGenerateQris);
router.get("/", requireAuth, requireRole("merchant"), orders.list);
router.get("/temp", requireAuth, requireRole("merchant"), (req, res) => {
  return res.render("temp", {
    error: null,
    success: null,
    old: {},
    result: null
  });
})

module.exports = router;
