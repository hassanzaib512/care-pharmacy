const admin = require('firebase-admin');
const DeviceToken = require('../models/DeviceToken');

let messagingInstance;

const initFirebaseAdmin = () => {
  if (messagingInstance) return messagingInstance;
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      messagingInstance = admin.messaging();
      return messagingInstance;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      messagingInstance = admin.messaging();
      return messagingInstance;
    }

    console.warn('Firebase Admin credentials not configured; push notifications are disabled.');
    return null;
  } catch (err) {
    console.error('Failed to initialize Firebase Admin', err);
    return null;
  }
};

const sendOrderDeliveredNotificationToUser = async (userId, order) => {
  const messaging = initFirebaseAdmin();
  if (!messaging) return;

  try {
    const tokens = await DeviceToken.find({ user: userId, isActive: true }).distinct('token');
    if (!tokens.length) return;

    const orderId = order?._id?.toString();
    const orderSuffix = orderId ? `#${orderId.slice(-6)}` : 'Your order';
    const message = {
      tokens,
      notification: {
        title: 'Your order has been delivered',
        body: `${orderSuffix} has been delivered. Thank you for choosing our pharmacy!`,
      },
      data: {
        orderId: orderId || '',
        status: 'delivered',
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const token = tokens[idx];
        invalidTokens.push(token);
        console.warn('Failed to send notification to token', token, resp.error?.message);
      }
    });

    if (invalidTokens.length) {
      await DeviceToken.updateMany(
        { token: { $in: invalidTokens } },
        { $set: { isActive: false } }
      );
    }
  } catch (err) {
    console.error('Error sending delivered notification', err);
  }
};

module.exports = {
  sendOrderDeliveredNotificationToUser,
};
