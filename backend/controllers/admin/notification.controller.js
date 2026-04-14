const Notification = require("../../models/notification.model");
const User = require("../../models/user.model");
const { sendPushNotification } = require("../../utils/fcm.service");

// ── Admin-level "read" tracking uses a separate readByAdmin flag ──────────

exports.sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      sendTo,
      targetUser,
      actionUrl
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }

    const payload = {
      title,
      message,
      type: type || "GENERAL",
      metadata: { actionUrl },
      createdBy: req.user.id,
      sentAt: new Date()
    };

    let users = [];

    if (sendTo === "SPECIFIC_USER") {
      payload.targetUser = targetUser;

      users = await User.find({
        _id: targetUser,
        fcmToken: { $ne: null }
      });

    } else {
      payload.targetUser = null;
      payload.targetUserType = "ALL";

      users = await User.find({
        fcmToken: { $ne: null }
      });
    }

    const notification = await Notification.create(payload);

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const result = await sendPushNotification({
        token: user.fcmToken,
        title,
        body: message,
        data: {
          notificationId: notification._id.toString(),
          type: type || "GENERAL",
          actionUrl: actionUrl || ""
        }
      });

      console.log("Push to:", user._id, result);

      if (result.success) sent++;
      else failed++;
    }

    res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
      pushReport: {
        totalUsers: users.length,
        sent,
        failed
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const data = await Notification.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Notification archived successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ── Mark a single notification as read (adds admin to readBy) ─────────────
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
        readAt: new Date(),
        $addToSet: {
          readBy: { user: req.user.id, readAt: new Date() }
        }
      },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Count unread notifications (isRead: false) ────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false, isActive: true });
    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};