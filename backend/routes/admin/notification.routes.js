const express = require("express");
const router = express.Router();

const { isAuth } = require("../../middlewares/auth.middleware");
const { isAdmin } = require("../../middlewares/admin.middleware");

const {
  sendNotification,
  getNotifications,
  deleteNotification
} = require("../../controllers/admin/notification.controller");

router.use(isAuth, isAdmin);

router.post("/send", sendNotification);
router.get("/", getNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;