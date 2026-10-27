const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Email regex pattern for strict format validation (RFC 5322 compatible)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Standard generic success message to prevent user enumeration
const GENERIC_FORGOT_SUCCESS_MESSAGE =
  'If an active Delivery Partner account is associated with this email, a password reset link and verification code have been dispatched.';

// Cryptographic hash helper (SHA-256)
const hashSecret = (secret) => {
  return crypto.createHash('sha256').update(String(secret).trim()).digest('hex');
};

/**
 * @desc    Request password reset for Delivery Partner
 * @route   POST /api/delivery-partner/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  // 1. Validate email format
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 2. Look up Delivery Partner account specifically
    const user = await User.findOne({
      email: normalizedEmail,
      role: 'delivery_partner',
    });

    // If user does not exist or is not a delivery partner, return generic message
    // (Prevents email harvesting and role enumeration)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: GENERIC_FORGOT_SUCCESS_MESSAGE,
      });
    }

    // If account is deactivated, do not send reset link but return generic message
    if (user.status === 'inactive') {
      console.warn(`[DeliveryPartnerAuth] Password reset requested for inactive account: ${normalizedEmail}`);
      return res.status(200).json({
        success: true,
        message: GENERIC_FORGOT_SUCCESS_MESSAGE,
      });
    }

    // 3. Generate cryptographically secure single-use token and 6-digit OTP
    const rawToken = crypto.randomBytes(32).toString('hex');
    const rawOtp = crypto.randomInt(100000, 1000000).toString();

    // 4. Hash both secrets before storing in the database (never store plaintext reset tokens)
    const tokenHash = hashSecret(rawToken);
    const otpHash = hashSecret(rawOtp);

    // 5. Short expiration time: 15 minutes
    const expirationMinutes = 15;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordOtpHash = otpHash;
    user.resetPasswordExpires = expiresAt;
    user.resetPasswordAttempts = 0;
    // Set legacy field for backwards compatibility
    user.resetPasswordToken = tokenHash;

    await user.save();

    // 6. Dispatch email safely through existing email service
    try {
      await emailService.sendDeliveryPartnerPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: rawToken,
        otp: rawOtp,
        expiresMinutes: expirationMinutes,
      });
      console.log(`[DeliveryPartnerAuth] Password reset email dispatched to ${normalizedEmail}`);
    } catch (emailErr) {
      // Log operational error safely without leaking secrets or customer data
      console.error('[DeliveryPartnerAuth] Email provider error while dispatching reset email:', emailErr.message);
    }

    // 7. Always return generic success message
    return res.status(200).json({
      success: true,
      message: GENERIC_FORGOT_SUCCESS_MESSAGE,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify if a token or OTP is valid and unexpired
 * @route   GET /api/delivery-partner/auth/verify-token
 * @access  Public
 */
exports.verifyResetToken = async (req, res, next) => {
  const token = req.query.token;
  const otp = req.query.otp;

  if (!token && !otp) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: 'Token or 6-digit OTP is required.',
    });
  }

  try {
    const inputHash = token ? hashSecret(token) : hashSecret(otp);

    const user = await User.findOne({
      role: 'delivery_partner',
      $or: [
        { resetPasswordTokenHash: inputHash },
        { resetPasswordOtpHash: inputHash },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid or already used password reset link or verification code.',
      });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'This password reset link or verification code has expired. Please request a new one.',
      });
    }

    if (user.resetPasswordAttempts >= 5) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Too many failed verification attempts. This reset code has been revoked.',
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      message: 'Reset credentials verified successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Delivery Partner password using token or OTP
 * @route   POST /api/delivery-partner/auth/reset-password
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
  const { token, otp, password, confirmPassword } = req.body;

  // 1. Validate inputs
  if (!token && !otp) {
    return res.status(400).json({
      success: false,
      message: 'Password reset link token or 6-digit verification code is required.',
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Please provide a new password.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.',
    });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match.',
    });
  }

  try {
    const inputSecret = token ? String(token).trim() : String(otp).trim();
    const inputHash = hashSecret(inputSecret);

    // 2. Query Delivery Partner matching token hash or OTP hash
    const user = await User.findOne({
      role: 'delivery_partner',
      $or: [
        { resetPasswordTokenHash: inputHash },
        { resetPasswordOtpHash: inputHash },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used password reset link or verification code.',
      });
    }

    // 3. Check expiration
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      // Invalidate expired tokens
      user.resetPasswordTokenHash = null;
      user.resetPasswordOtpHash = null;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'This password reset link or verification code has expired. Please request a new one.',
      });
    }

    // 4. Check failed verification attempts limit (Max 5 attempts)
    if (user.resetPasswordAttempts >= 5) {
      user.resetPasswordTokenHash = null;
      user.resetPasswordOtpHash = null;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Too many failed verification attempts. This reset code has been revoked for security.',
      });
    }

    // 5. Check if account is inactive
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact your administrator.',
      });
    }

    // 6. Update password securely
    user.password = password; // pre-save hook will hash with bcryptjs

    // 7. Invalidate reset token and OTP immediately to prevent reuse
    user.resetPasswordTokenHash = null;
    user.resetPasswordOtpHash = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.resetPasswordAttempts = 0;

    // 8. Record timestamp to invalidate prior active JWT sessions
    user.passwordChangedAt = new Date();

    await user.save();

    console.log(`[DeliveryPartnerAuth] Password successfully reset for delivery partner: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
