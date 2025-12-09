const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const hbs = require('handlebars');
const Order = require('../models/Order');
const User = require('../models/User');

const templatesDir = path.join(__dirname, '..', 'emails', 'templates');
const partialsDir = path.join(templatesDir, 'partials');
const assetsDir = path.join(templatesDir, 'assets');
const logoPath = path.join(assetsDir, 'app_logo.png');

const adminEmailsEnv = process.env.ADMIN_NOTIFICATION_EMAILS || '';
const adminRecipients = adminEmailsEnv
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

const mailFromEmail =
  process.env.MAIL_FROM_EMAIL ||
  process.env.SMTP_USER ||
  'no-reply@carepharmacy.local';
const mailFromName = process.env.MAIL_FROM_NAME || 'Care Pharmacy';
const supportEmail =
  process.env.SUPPORT_EMAIL ||
  process.env.SUPPORT_CONTACT ||
  process.env.MAIL_FROM_EMAIL ||
  'support@carepharmacy.com';
const appBaseUrl =
  process.env.APP_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.ASSET_BASE_URL ||
  '';
const adminBaseUrl = process.env.ADMIN_DASHBOARD_URL || '';

const isEmailConfigured =
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  (process.env.SMTP_USER || process.env.SMTP_PASS);

let transporter;
if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
} else {
  console.warn('Email not configured. Set SMTP_* env vars to enable email notifications.');
}

const compiledTemplates = {};

const registerHelpers = () => {
  hbs.registerHelper('formatCurrency', (value) => {
    const num = Number(value || 0);
    return `$${num.toFixed(2)}`;
  });
  hbs.registerHelper('formatDateTime', (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return value?.toString() || '';
    }
  });
};

const registerPartials = () => {
  if (!fs.existsSync(partialsDir)) return;
  const files = fs.readdirSync(partialsDir).filter((f) => f.endsWith('.hbs'));
  files.forEach((file) => {
    const name = path.basename(file, '.hbs');
    const content = fs.readFileSync(path.join(partialsDir, file), 'utf8');
    hbs.registerPartial(name, content);
  });
};

registerHelpers();
registerPartials();

const compileTemplate = (name) => {
  if (compiledTemplates[name]) return compiledTemplates[name];
  const filePath = path.join(templatesDir, `${name}.hbs`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Email template not found: ${name}`);
  }
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const template = hbs.compile(fileContent);
  compiledTemplates[name] = template;
  return template;
};

const layoutTemplate = () => compileTemplate('layout');

const renderTemplate = (name, context) => {
  const template = compileTemplate(name);
  const body = template(context);
  const layout = layoutTemplate();
  return layout({ ...context, body });
};

const sendEmail = async ({ to, subject, template, context }) => {
  if (!transporter || !isEmailConfigured) return;
  try {
    const html = renderTemplate(template, context);
    const attachments = [];
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: 'app_logo.png',
        path: logoPath,
        cid: 'carepharmacylogo',
      });
    }
    await transporter.sendMail({
      from: `"${mailFromName}" <${mailFromEmail}>`,
      to,
      subject,
      html,
      attachments,
    });
  } catch (err) {
    console.error(`Failed to send email (${template})`, err);
  }
};

const resolveOrderDetails = async (order, user) => {
  let populated = order;
  if (!populated?.items?.length || !populated?.items?.[0]?.medicine?.name || !populated?.user?.email) {
    populated = await Order.findById(order._id || order.id)
      .populate('items.medicine', 'name price manufacturer')
      .populate('user', 'name email address role')
      .lean();
  } else if (typeof populated.toObject === 'function') {
    populated = populated.toObject();
  }

  const userDoc =
    user ||
    populated.user ||
    (await User.findById(populated.user).select('name email address role').lean());

  const items = (populated.items || []).map((item) => {
    const med = item.medicine || {};
    const unitPrice = Number(item.unitPrice || med.price || 0);
    return {
      name: med.name || 'Medicine',
      quantity: item.quantity || 0,
      unitPrice,
      total: unitPrice * (item.quantity || 0),
      manufacturer: med.manufacturer || '',
    };
  });

  const orderId = populated._id?.toString() || populated.id?.toString();
  return {
    orderId,
    shortId: orderId ? `#${orderId.slice(-6)}` : '',
    status: populated.status,
    deliveryStatus: populated.deliveryStatus,
    totalAmount: populated.totalAmount,
    createdAt: populated.createdAt,
    updatedAt: populated.updatedAt,
    deliveredAt: populated.deliveredAt,
    payment: populated.paymentSnapshot || populated.payment || {},
    address: populated.addressSnapshot || userDoc?.address || {},
    items,
    subtotal: items.reduce((sum, i) => sum + i.total, 0),
    user: {
      name: userDoc?.name || 'Customer',
      email: userDoc?.email || '',
      phone: userDoc?.address?.phone || '',
    },
  };
};

const sendOrderPlacedUserEmail = async (user, order) => {
  if (!user?.email) return;
  const details = await resolveOrderDetails(order, user);
  const subject = `Your order ${details.shortId || details.orderId} has been placed successfully`;
  const context = {
    title: 'Order placed',
    subject,
    user: details.user,
    order: details,
    supportEmail,
    appUrl: appBaseUrl,
    year: new Date().getFullYear(),
  };
  await sendEmail({
    to: user.email,
    subject,
    template: 'order_placed_user',
    context,
  });
};

const sendOrderPlacedAdminEmail = async (order) => {
  if (!adminRecipients.length) return;
  const details = await resolveOrderDetails(order);
  const subject = `New order placed: ${details.shortId || details.orderId} by ${details.user.name}`;
  const context = {
    title: 'New order placed',
    subject,
    user: details.user,
    order: details,
    adminUrl: adminBaseUrl ? `${adminBaseUrl}/orders/${details.orderId || ''}` : '',
    supportEmail,
    year: new Date().getFullYear(),
  };
  await sendEmail({
    to: adminRecipients,
    subject,
    template: 'order_placed_admin',
    context,
  });
};

const sendOrderDeliveredUserEmail = async (user, order) => {
  if (!user?.email) return;
  const details = await resolveOrderDetails(order, user);
  const subject = `Your order ${details.shortId || details.orderId} has been delivered`;
  const context = {
    title: 'Order delivered',
    subject,
    user: details.user,
    order: details,
    supportEmail,
    appUrl: appBaseUrl,
    year: new Date().getFullYear(),
  };
  await sendEmail({
    to: user.email,
    subject,
    template: 'order_delivered_user',
    context,
  });
};

const sendOrderDeliveredAdminEmail = async (order) => {
  if (!adminRecipients.length) return;
  const details = await resolveOrderDetails(order);
  const subject = `Order ${details.shortId || details.orderId} delivered to ${details.user.name}`;
  const context = {
    title: 'Order delivered',
    subject,
    user: details.user,
    order: details,
    adminUrl: adminBaseUrl ? `${adminBaseUrl}/orders/${details.orderId || ''}` : '',
    supportEmail,
    year: new Date().getFullYear(),
  };
  await sendEmail({
    to: adminRecipients,
    subject,
    template: 'order_delivered_admin',
    context,
  });
};

const sendOrderCancelledAdminEmail = async (order) => {
  if (!adminRecipients.length) return;
  const details = await resolveOrderDetails(order);
  const subject = `Order ${details.shortId || details.orderId} has been cancelled`;
  const context = {
    title: 'Order cancelled',
    subject,
    user: details.user,
    order: details,
    supportEmail,
    adminUrl: adminBaseUrl ? `${adminBaseUrl}/orders/${details.orderId || ''}` : '',
    year: new Date().getFullYear(),
  };
  await sendEmail({
    to: adminRecipients,
    subject,
    template: 'order_cancelled_admin',
    context,
  });
};

const sendForgotPasswordEmail = async (user, token) => {
  if (!user?.email) return;
  const resetBase = process.env.APP_BASE_URL || process.env.PUBLIC_BASE_URL || '';
  const resetUrl = resetBase
    ? `${resetBase.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
        user.email
      )}`
    : '';
  const subject = 'Reset your Care Pharmacy password';
  const context = {
    title: 'Reset password',
    subject,
    user: { name: user.name || 'Customer' },
    token,
    resetUrl,
    supportEmail,
    year: new Date().getFullYear(),
  };
  await sendEmail({
    to: user.email,
    subject,
    template: 'forgot_password',
    context,
  });
};

const sendWelcomeEmail = async (user) => {
  if (!user?.email) return;
  const appUrl = process.env.APP_BASE_URL || process.env.FRONTEND_BASE_URL || '';
  const subject = 'Welcome to Care Pharmacy';
  const context = {
    title: 'Welcome',
    subject,
    user: { name: user.name || 'Customer' },
    supportEmail,
    appUrl,
    year: new Date().getFullYear(),
  };
  await sendEmail({
    to: user.email,
    subject,
    template: 'welcome',
    context,
  });
};

module.exports = {
  sendOrderPlacedUserEmail,
  sendOrderPlacedAdminEmail,
  sendOrderDeliveredUserEmail,
  sendOrderDeliveredAdminEmail,
  sendOrderCancelledAdminEmail,
  sendForgotPasswordEmail,
  sendWelcomeEmail,
};
