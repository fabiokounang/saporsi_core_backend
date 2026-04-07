const router = require("express").Router();
const notifications = require("../../controllers/admin/notifications");
const { requireAuth, requireRole } = require("../../middleware/auth");

router.get("/stream", requireAuth, requireRole("admin", "staff"), notifications.stream);
router.get("/vapid-public-key", requireAuth, requireRole("admin", "staff"), notifications.vapidPublicKey);
router.post("/subscribe", requireAuth, requireRole("admin", "staff"), notifications.subscribe);
router.post("/unsubscribe", requireAuth, requireRole("admin", "staff"), notifications.unsubscribe);

module.exports = router;
