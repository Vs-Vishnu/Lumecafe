const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkey_lumebills_2026', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (Public customer registration / Admin staff creation / Master setup)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required.',
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const userCount = await User.countDocuments();

    // Determine role with strict server-side RBAC
    let finalRole = 'customer';

    if (userCount === 0) {
      // First user ever becomes master Administrator
      finalRole = 'admin';
    } else if (req.user && req.user.role === 'admin') {
      // Authenticated admin can assign allowed staff roles
      finalRole = role && ['admin', 'cashier'].includes(role) ? role : 'cashier';
    } else {
      // All public registrations are ALWAYS customer accounts
      finalRole = 'customer';
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone ? phone.trim() : '',
      role: finalRole,
      status: 'active',
      isEmailVerified: finalRole === 'admin', // Admin is auto-verified
      emailVerificationToken: finalRole === 'customer' ? verificationToken : null,
      emailVerificationExpires: finalRole === 'customer' ? verificationExpires : null,
      authProvider: 'local',
    });

    // Send verification email for customers asynchronously
    if (finalRole === 'customer') {
      emailService
        .sendEmailVerificationEmail({
          to: user.email,
          name: user.name,
          token: verificationToken,
        })
        .catch((err) => console.error('[Auth] Error sending verification email:', err.message));
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: finalRole === 'customer' ? 'Registration successful. Welcome to LumeBills!' : 'Account created successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.',
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact your administrator.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired email verification link.',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Email successfully verified. You can now place delivery orders!',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password recovery email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide your account email address.',
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // For security, do not leak whether an email exists or not
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been dispatched.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: resetToken,
    });

    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been dispatched.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token and new password are required.',
    });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired.',
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordTokenHash = null;
    user.resetPasswordOtpHash = null;
    user.resetPasswordExpires = null;
    user.resetPasswordAttempts = 0;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You may now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth sign-in / registration
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res, next) => {
  const { credential, email, name, googleId } = req.body;

  try {
    let verifiedEmail = email;
    let verifiedName = name;
    let verifiedGoogleId = googleId;

    // If a Google JWT credential was provided, verify with Google API if available
    if (credential) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          verifiedEmail = payload.email;
          verifiedName = payload.name;
          verifiedGoogleId = payload.sub;
        }
      } catch (err) {
        console.warn('[Auth] Google token verification fallback:', err.message);
      }
    }

    if (!verifiedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication failed: Email not provided or verified.',
      });
    }

    const normalizedEmail = verifiedEmail.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Existing user: Link googleId if not linked
      if (!user.googleId && verifiedGoogleId) {
        user.googleId = verifiedGoogleId;
      }
      user.isEmailVerified = true;
      await user.save();
    } else {
      // New user: Always created with 'customer' role
      const randomPassword = crypto.randomBytes(16).toString('hex');
      user = await User.create({
        name: verifiedName || 'Google User',
        email: normalizedEmail,
        password: randomPassword,
        role: 'customer', // Strict RBAC: never escalate
        status: 'active',
        isEmailVerified: true,
        googleId: verifiedGoogleId || null,
        authProvider: 'google',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact your administrator.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.name = req.body.name ? req.body.name.trim() : user.name;
    if (req.body.phone !== undefined) {
      user.phone = req.body.phone.trim();
    }
    if (req.body.email && req.body.email.toLowerCase().trim() !== user.email) {
      const emailTaken = await User.findOne({ email: req.body.email.toLowerCase().trim() });
      if (emailTaken) {
        return res.status(400).json({ success: false, message: 'This email is already in use.' });
      }
      user.email = req.body.email.toLowerCase().trim();
      user.isEmailVerified = false;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};
