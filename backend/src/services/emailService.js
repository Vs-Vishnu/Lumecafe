const nodemailer = require('nodemailer');

// In-memory log of sent emails for development and testing
const sentEmailsLog = [];

// Create transporter helper
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const service = process.env.SMTP_SERVICE;

  if ((host || service) && user && pass) {
    const transportOptions = {
      auth: { user, pass },
    };

    if (service) {
      transportOptions.service = service;
    } else {
      transportOptions.host = host;
      transportOptions.port = port;
      transportOptions.secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
    }

    if (process.env.SMTP_IGNORE_TLS === 'true') {
      transportOptions.tls = { rejectUnauthorized: false };
    }

    return nodemailer.createTransport(transportOptions);
  }

  // Fallback to test/console logger
  return null;
};

/**
 * Core sendEmail function
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const from = process.env.EMAIL_FROM || '"LumeCafe Delivery" <no-reply@lumecafe.com>';
  const emailRecord = {
    to,
    from,
    subject,
    html,
    text,
    sentAt: new Date(),
  };

  try {
    const transporter = createTransporter();

    if (transporter) {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      emailRecord.messageId = info.messageId;
      emailRecord.status = 'sent';
      sentEmailsLog.unshift(emailRecord);
      if (sentEmailsLog.length > 50) sentEmailsLog.pop();
      console.log(`[EmailService] Email successfully sent to ${to} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, simulated: false };
    } else {
      // In development or when SMTP is not configured, simulate delivery safely
      emailRecord.status = 'simulated';
      sentEmailsLog.unshift(emailRecord);
      if (sentEmailsLog.length > 50) sentEmailsLog.pop();
      console.log(`\n================== [EMAIL SIMULATION] ==================`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${text || '(HTML content)'}`);
      console.log(`========================================================\n`);
      return { success: true, simulated: true };
    }
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    emailRecord.status = 'failed';
    emailRecord.error = error.message;
    sentEmailsLog.unshift(emailRecord);
    return { success: false, error: error.message };
  }
};

/**
 * Base email layout wrapper with modern, clean branding
 */
const wrapEmailTemplate = (title, contentHtml) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #10B981; padding: 28px 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px; font-size: 15px; line-height: 1.6; color: #374151; }
    .button { display: inline-block; padding: 12px 28px; background-color: #10B981; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 20px 0; }
    .footer { padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #E0E7FF; color: #3730A3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LumeBills Delivery</h1>
      <p>Fast • Simple • Accurate</p>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} LumeBills Cafe & Delivery Platform. All rights reserved.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * 1. Delivery Partner Invitation Email
 */
const sendDeliveryInvitationEmail = async ({ to, name, token, expiresAt }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const invitationLink = `${appUrl}/invitation/${token}`;
  const expiryHours = Math.round((new Date(expiresAt) - new Date()) / (1000 * 60 * 60)) || 24;

  const html = wrapEmailTemplate(
    'Invitation to Join as a Delivery Partner',
    `
      <h2 style="color: #111827; margin-top: 0;">Welcome, ${name}!</h2>
      <p>You have been formally invited by our Administrator to join the <strong>LumeBills Delivery Team</strong> as a Delivery Partner.</p>
      <p>As a Delivery Partner, you will receive real-time delivery orders, access shortest-route map navigation, and earn rewards for every completed order.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" class="button">Accept Invitation & Activate Account</a>
      </div>

      <p style="font-size: 13px; color: #6b7280;">This secure invitation link is valid for <strong>${expiryHours} hours</strong>. If it expires, please request your administrator to resend the invitation.</p>
      <p style="font-size: 13px; color: #6b7280; word-break: break-all;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${invitationLink}" style="color: #10B981;">${invitationLink}</a></p>
      <p>If you were not expecting this invitation, you can safely ignore this email.</p>
    `
  );

  const text = `
Hello ${name},

You have been invited to join our delivery platform as a Delivery Partner.

Please open the secure invitation link below to activate your account:
${invitationLink}

This invitation expires in ${expiryHours} hours. If you were not expecting this invitation, you can ignore this email.

Thank you,
LumeBills Team
  `;

  return sendEmail({
    to,
    subject: 'Invitation to Join as a Delivery Partner - LumeBills',
    html,
    text,
  });
};

/**
 * 2. Delivery Partner Acceptance Confirmation Email
 */
const sendDeliveryInvitationAcceptedEmail = async ({ to, name }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const dashboardLink = `${appUrl}/delivery/dashboard`;

  const html = wrapEmailTemplate(
    'Account Activated',
    `
      <h2>Congratulations, ${name}!</h2>
      <p>Your Delivery Partner account has been successfully verified and activated.</p>
      <p>You can now log in to your Delivery Partner Dashboard, toggle your availability to <strong>Available</strong>, and start accepting delivery assignments.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${dashboardLink}" class="button">Go to Delivery Dashboard</a>
      </div>
    `
  );

  const text = `Hello ${name}, your Delivery Partner account has been activated! Go to ${dashboardLink} to start accepting delivery assignments.`;

  return sendEmail({
    to,
    subject: 'Delivery Partner Account Activated - LumeBills',
    html,
    text,
  });
};

/**
 * 3. Customer Email Verification Email
 */
const sendEmailVerificationEmail = async ({ to, name, token }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const verifyLink = `${appUrl}/verify-email?token=${token}`;

  const html = wrapEmailTemplate(
    'Verify Your Email Address',
    `
      <h2>Hello, ${name}!</h2>
      <p>Thank you for registering an account on LumeBills. Please verify your email address to secure your account and activate online delivery ordering.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyLink}" class="button">Verify Email Address</a>
      </div>
      <p style="font-size: 13px; color: #6b7280;">If the button does not work, visit: <a href="${verifyLink}">${verifyLink}</a></p>
    `
  );

  const text = `Hello ${name}, please verify your email address by opening this link: ${verifyLink}`;

  return sendEmail({
    to,
    subject: 'Verify Your Email Address - LumeBills',
    html,
    text,
  });
};

/**
 * 4. Password Reset Email
 */
const sendPasswordResetEmail = async ({ to, name, token }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  const html = wrapEmailTemplate(
    'Reset Your Password',
    `
      <h2>Password Reset Request</h2>
      <p>Hello ${name || 'User'}, we received a request to reset your LumeBills password.</p>
      <p>Click the button below to choose a new, secure password:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #6b7280;">This password reset link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
    `
  );

  const text = `Hello ${name}, reset your password by opening: ${resetLink}. Valid for 1 hour.`;

  return sendEmail({
    to,
    subject: 'Password Reset Request - LumeBills',
    html,
    text,
  });
};

/**
 * 4b. Delivery Partner Password Reset Email with LumeCafe Branding, Reset Link, and 6-Digit OTP
 */
const sendDeliveryPartnerPasswordResetEmail = async ({ to, name, token, otp, expiresMinutes = 15 }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const resetLink = `${appUrl}/delivery-partner/reset-password?token=${token}`;

  const html = wrapEmailTemplate(
    'Reset Your LumeCafe Delivery Partner Password',
    `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 16px; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 800; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #a7f3d0;">
          🛵 Delivery Partner Security
        </span>
      </div>

      <h2 style="color: #111827; margin-top: 0; font-size: 20px; text-align: center;">Reset Your Password</h2>
      <p style="font-size: 15px; color: #374151;">Hello <strong>${name || 'Delivery Partner'}</strong>,</p>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
        We received a request to reset your password for your <strong>LumeCafe Delivery Partner</strong> account. You can securely reset your credentials using either of the two options below:
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 0 0 10px 0; letter-spacing: 0.5px;">
          Option 1: One-Click Reset Link
        </p>
        <a href="${resetLink}" class="button" style="margin: 8px 0; display: inline-block; background-color: #10B981; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; font-weight: bold; text-decoration: none;">Reset Password Now</a>
        <p style="font-size: 11px; color: #94a3b8; margin: 10px 0 0 0; word-break: break-all;">
          Or copy link: <a href="${resetLink}" style="color: #10b981;">${resetLink}</a>
        </p>
      </div>

      <div style="background: #fdf4ff; border: 1px dashed #d946ef; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="font-size: 13px; font-weight: 700; color: #86198f; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">
          Option 2: 6-Digit Verification Code (OTP)
        </p>
        <p style="font-size: 13px; color: #701a75; margin: 0 0 12px 0;">Enter this code on the password reset screen:</p>
        <div style="font-size: 32px; letter-spacing: 8px; font-weight: 800; color: #a21caf; background: #ffffff; padding: 12px 24px; border-radius: 10px; display: inline-block; font-family: monospace; border: 2px solid #f0abfc; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          ${otp}
        </div>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
          ⏱️ <strong>Expiration Notice:</strong> This reset link and 6-digit OTP will expire in <strong>${expiresMinutes} minutes</strong>.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #b45309; line-height: 1.5;">
          🔒 <strong>Security Warning:</strong> Never share your verification code or link with anyone. LumeCafe staff and dispatchers will never ask for your password or OTP.
        </p>
      </div>

      <p style="font-size: 12px; color: #6b7280; margin-top: 24px; line-height: 1.5;">
        If you did not request this password reset, please ignore this email. Your current password remains secure and your account is protected.
      </p>
    `
  );

  const text = `
LumeCafe Delivery Partner - Password Reset Request

Hello ${name || 'Delivery Partner'},

We received a request to reset your password for your LumeCafe Delivery Partner account.

Option 1: Reset via Link
Open this secure link: ${resetLink}

Option 2: Enter 6-Digit OTP
Use this single-use code: ${otp}

Expiration: This link and code expire in ${expiresMinutes} minutes.

Security Warning: Never share this link or OTP with anyone. LumeCafe staff will never ask for your reset code.

If you did not request this, you can safely ignore this email.
`;

  return sendEmail({
    to,
    subject: 'Password Reset Request - LumeCafe Delivery Partner',
    html,
    text,
  });
};

/**
 * 5. Customer Order Confirmation Email
 */
const sendOrderConfirmationEmail = async ({ to, order }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const trackingLink = `${appUrl}/track-order/${order._id}`;
  const address = order.deliveryAddress
    ? `${order.deliveryAddress.houseNumber}, ${order.deliveryAddress.streetName}, ${order.deliveryAddress.city} - ${order.deliveryAddress.postalCode}`
    : 'Manual Delivery Address';

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 10px 0;"><strong>${item.name}</strong> x ${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right;">₹${item.total.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const html = wrapEmailTemplate(
    `Order Confirmed #${order.orderNumber}`,
    `
      <h2>Thank you for your order!</h2>
      <p>Your delivery order <strong>#${order.orderNumber}</strong> has been received and confirmed.</p>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #374151;">Delivery Address:</h4>
        <p style="margin: 0; font-size: 14px; color: #4b5563;">${address}</p>
        ${order.deliveryConfirmationCode ? `<p style="margin: 10px 0 0 0; font-size: 13px; color: #047857; font-weight: bold;">Delivery Confirmation Code: <span style="background: #d1fae5; padding: 2px 8px; border-radius: 6px;">${order.deliveryConfirmationCode}</span></p>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tbody>
          ${itemsHtml}
          <tr>
            <td style="padding: 12px 0; font-weight: bold;">Grand Total:</td>
            <td style="padding: 12px 0; text-align: right; font-weight: 800; font-size: 16px; color: #10B981;">₹${order.grandTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${trackingLink}" class="button">Track Order Live</a>
      </div>
    `
  );

  const text = `Order #${order.orderNumber} placed successfully! Total: ₹${order.grandTotal}. Track live at: ${trackingLink}`;

  return sendEmail({
    to,
    subject: `Order Confirmed: #${order.orderNumber} - LumeBills`,
    html,
    text,
  });
};

/**
 * 6. Order Status Change Notification to Customer
 */
const sendOrderStatusNotificationEmail = async ({ to, order, status, partnerName, partnerPhone }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const trackingLink = `${appUrl}/track-order/${order._id}`;

  const statusLabels = {
    preparing: 'Your order is being prepared fresh in the kitchen.',
    ready_for_dispatch: 'Your order is ready and waiting for pickup.',
    assigned: `Delivery Partner ${partnerName || ''} has been assigned to your order.`,
    picked_up: `Your order has been picked up by ${partnerName || 'our delivery partner'}.`,
    out_for_delivery: `Your order is out for delivery! ${partnerName ? partnerName + ' is on the way.' : ''}`,
    delivered: 'Your order has been successfully delivered. Enjoy your meal!',
  };

  const message = statusLabels[status] || `Your order status has been updated to: ${status}`;

  const html = wrapEmailTemplate(
    `Order Update #${order.orderNumber}`,
    `
      <h2>Order Status Update</h2>
      <p style="font-size: 16px; font-weight: 600; color: #10B981;">#${order.orderNumber}</p>
      <p>${message}</p>
      ${partnerPhone ? `<p style="font-size: 14px; color: #4b5563;">Delivery Partner Contact: <strong>${partnerPhone}</strong></p>` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${trackingLink}" class="button">View Order Tracking</a>
      </div>
    `
  );

  const text = `Order #${order.orderNumber} update: ${message}. Track at: ${trackingLink}`;

  return sendEmail({
    to,
    subject: `Order Update: #${order.orderNumber} - ${status.replace('_', ' ').toUpperCase()}`,
    html,
    text,
  });
};

/**
 * 7. Delivery Partner Assignment Notification
 */
const sendAssignmentNotificationEmail = async ({ to, partnerName, order }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const dashboardLink = `${appUrl}/delivery/dashboard`;

  const html = wrapEmailTemplate(
    'New Delivery Assignment',
    `
      <h2>New Delivery Assigned!</h2>
      <p>Hello ${partnerName}, you have been assigned a new delivery order: <strong>#${order.orderNumber}</strong>.</p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 18px; margin: 18px 0;">
        <p style="margin: 0 0 6px 0;"><strong>Customer:</strong> ${order.deliveryAddress?.fullName || 'Valued Customer'}</p>
        <p style="margin: 0 0 6px 0;"><strong>Address:</strong> ${order.deliveryAddress?.houseNumber}, ${order.deliveryAddress?.streetName}, ${order.deliveryAddress?.city}</p>
        <p style="margin: 0;"><strong>Bill Amount:</strong> ₹${order.grandTotal.toFixed(2)} (${order.paymentMethod})</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${dashboardLink}" class="button">Open in Delivery Dashboard</a>
      </div>
    `
  );

  const text = `New order #${order.orderNumber} assigned to you. Open dashboard: ${dashboardLink}`;

  return sendEmail({
    to,
    subject: `New Assignment: Order #${order.orderNumber} - LumeBills`,
    html,
    text,
  });
};

/**
 * Get latest sent emails (for diagnostics/audit)
 */
const getSentEmailsLog = () => {
  return sentEmailsLog;
};

module.exports = {
  sendEmail,
  sendDeliveryInvitationEmail,
  sendDeliveryInvitationAcceptedEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendDeliveryPartnerPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusNotificationEmail,
  sendAssignmentNotificationEmail,
  getSentEmailsLog,
};
