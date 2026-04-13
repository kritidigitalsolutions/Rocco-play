const admin = require("../config/firebase");

const sendPushNotification = async ({ token, title, body, data = {} }) => {
  try {
    if (!token) {
      return {
        success: false,
        message: "FCM token is required"
      };
    }

    const message = {
      token,
      notification: {
        title,
        body
      },
      data
    };

    const response = await admin.messaging().send(message);

    return {
      success: true,
      message: "Notification sent successfully",
      messageId: response
    };

  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};

module.exports = {
  sendPushNotification
};