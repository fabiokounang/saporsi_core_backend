const router = require("express").Router();
const vendor = require("../controllers/vendor");

router.post("/midtrans/webhook", vendor.webhook);

module.exports = router;
