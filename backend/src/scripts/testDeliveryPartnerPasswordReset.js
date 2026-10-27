/**
 * Automated Test Suite for Delivery Partner Forgot Password & Reset Password Feature
 * Covers all 12 scenarios required by the specification.
 */

const assert = require('assert');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BASE_URL = 'http://localhost:5000/api';

// Helper to make fetch requests
const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
};

const hashSecret = (secret) => {
  return crypto.createHash('sha256').update(String(secret).trim()).digest('hex');
};

let testsPassed = 0;
let testsFailed = 0;

const runTest = async (name, testFn) => {
  try {
    process.stdout.write(`Testing: ${name}... `);
    await testFn();
    console.log('\x1b[32mPASSED\x1b[0m');
    testsPassed++;
  } catch (error) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error('  Error:', error.message);
    testsFailed++;
  }
};

const runSuite = async () => {
  console.log('\n======================================================');
  console.log('  DELIVERY PARTNER PASSWORD RESET TEST SUITE');
  console.log('======================================================\n');

  // Connect directly to Mongo for state verification and setup
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lumebills');
  const User = require('../models/User');
  const emailService = require('../services/emailService');
  const { forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimiter');

  // Reset rate limiters so test suite runs clean
  forgotPasswordLimiter.reset();
  resetPasswordLimiter.reset();

  const testEmail = 'delivery_tester_2026@lumecafe.com';
  const initialPassword = 'InitialOldPassword123!';
  const updatedPassword = 'NewSecurePassword2026!';

  // Clean up any previous test user
  await User.deleteOne({ email: testEmail });

  // Create active Delivery Partner user
  const testUser = await User.create({
    name: 'Delivery Driver Dave',
    email: testEmail,
    password: initialPassword,
    role: 'delivery_partner',
    status: 'active',
    isEmailVerified: true,
  });

  let generatedToken = null;
  let generatedOtp = null;

  // Scenario 1: A delivery partner requests a password reset using a registered email.
  await runTest('1. Delivery partner requests password reset using registered email', async () => {
    const res = await request('/delivery-partner/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.message.includes('password reset link'));

    // Check database has hashed token and OTP
    const updated = await User.findOne({ email: testEmail });
    assert.ok(updated.resetPasswordTokenHash, 'Token hash must be saved in DB');
    assert.ok(updated.resetPasswordOtpHash, 'OTP hash must be saved in DB');
    assert.strictEqual(updated.resetPasswordTokenHash.length, 64, 'Token hash must be 64-char SHA256');
    assert.strictEqual(updated.resetPasswordOtpHash.length, 64, 'OTP hash must be 64-char SHA256');
    assert.ok(new Date(updated.resetPasswordExpires) > new Date(), 'Expires must be in future');
  });

  // Scenario 2: The email service successfully sends/simulates the reset message.
  await runTest('2. Email service logs dispatched password reset email with branding', async () => {
    const emailRes = await request('/health/emails');
    const logs = emailRes.data?.data || [];
    assert.ok(logs.length > 0, 'Email log must have captured sent email');

    const emailRecord = logs.find((e) => e.to === testEmail);
    assert.ok(emailRecord, 'Email record must exist for test delivery partner');
    assert.ok(emailRecord.subject.includes('LumeCafe Delivery Partner'));

    // Extract generated raw token from reset link in email
    const matchLink = emailRecord.html.match(/token=([a-f0-9]{64})/);
    assert.ok(matchLink, 'Email HTML must contain reset token link');
    generatedToken = matchLink[1];

    // Extract generated raw OTP from email
    const matchOtp = emailRecord.text.match(/Use this single-use code:\s*(\d{6})/);
    assert.ok(matchOtp, 'Email text must contain 6-digit OTP code');
    generatedOtp = matchOtp[1];

    // Verify token hash in DB matches SHA256 of raw token
    const dbUser = await User.findOne({ email: testEmail });
    assert.strictEqual(dbUser.resetPasswordTokenHash, hashSecret(generatedToken));
    assert.strictEqual(dbUser.resetPasswordOtpHash, hashSecret(generatedOtp));
  });

  // Scenario 3: The reset link or OTP is valid.
  await runTest('3. Reset link token and 6-digit OTP are verified as valid', async () => {
    // Verify by token
    const resToken = await request(`/delivery-partner/auth/verify-token?token=${generatedToken}`);
    assert.strictEqual(resToken.status, 200);
    assert.strictEqual(resToken.data.valid, true);

    // Verify by OTP
    const resOtp = await request(`/delivery-partner/auth/verify-token?otp=${generatedOtp}`);
    assert.strictEqual(resOtp.status, 200);
    assert.strictEqual(resOtp.data.valid, true);
  });

  // Scenario 4: An expired token is rejected.
  await runTest('4. An expired token/OTP is rejected with error', async () => {
    // Force token to be in the past
    await User.updateOne(
      { email: testEmail },
      { resetPasswordExpires: new Date(Date.now() - 5000) }
    );

    const res = await request('/delivery-partner/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: generatedToken,
        password: updatedPassword,
        confirmPassword: updatedPassword,
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.toLowerCase().includes('expired'));
  });

  // Scenario 5 & 6: Invalid token or OTP is rejected.
  await runTest('6. An invalid token or OTP is rejected', async () => {
    const res = await request('/delivery-partner/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'invalid_deadbeef_invalid_token_1234567890',
        password: updatedPassword,
        confirmPassword: updatedPassword,
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.toLowerCase().includes('invalid'));
  });

  // Scenario 7: A new password is saved securely.
  await runTest('7. A new password is reset successfully and hashed with bcrypt', async () => {
    // Regenerate fresh token and OTP
    const rawToken = crypto.randomBytes(32).toString('hex');
    const rawOtp = '654321';

    await User.updateOne(
      { email: testEmail },
      {
        resetPasswordTokenHash: hashSecret(rawToken),
        resetPasswordOtpHash: hashSecret(rawOtp),
        resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
        resetPasswordAttempts: 0,
      }
    );

    // Reset password using OTP
    const res = await request('/delivery-partner/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        otp: rawOtp,
        password: updatedPassword,
        confirmPassword: updatedPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    // Verify DB state
    const userInDb = await User.findOne({ email: testEmail });
    assert.notStrictEqual(userInDb.password, updatedPassword, 'Password must not be plain text');
    assert.ok(userInDb.password.startsWith('$2'), 'Password must be bcrypt hash');
    assert.strictEqual(userInDb.resetPasswordTokenHash, null, 'Reset token hash must be invalidated');
    assert.strictEqual(userInDb.resetPasswordOtpHash, null, 'Reset OTP hash must be invalidated');
    assert.ok(userInDb.passwordChangedAt, 'passwordChangedAt must be recorded');
  });

  // Scenario 5: A previously used token is rejected.
  await runTest('5. A previously used token/OTP is rejected (single-use enforcement)', async () => {
    const res = await request('/delivery-partner/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        otp: '654321',
        password: 'AnotherPassword456!',
        confirmPassword: 'AnotherPassword456!',
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.toLowerCase().includes('invalid'));
  });

  // Scenario 8: The old password no longer works after the reset.
  await runTest('8. The old password no longer works for login', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  // Scenario 9: The new password works for login.
  await runTest('9. The new password works successfully for login', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: updatedPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.token, 'Must return JWT token');
    assert.strictEqual(res.data.user.role, 'delivery_partner');
  });

  // Scenario 10: An unregistered email does not reveal account existence.
  await runTest('10. Unregistered email does not reveal account existence (anti-enumeration)', async () => {
    const resUnregistered = await request('/delivery-partner/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'ghost_nonexistent_email_999@example.com' }),
    });

    assert.strictEqual(resUnregistered.status, 200);
    assert.strictEqual(resUnregistered.data.success, true);
    assert.ok(
      resUnregistered.data.message.includes('password reset link'),
      'Must return identical generic success message'
    );
  });

  // Scenario 11: Repeated requests are rate-limited.
  await runTest('11. Repeated requests exceeding threshold are rate-limited (429 status)', async () => {
    // Make rapid requests to exceed rate limit (threshold is 5 per 15 min)
    let rateLimited = false;
    for (let i = 0; i < 7; i++) {
      const res = await request('/delivery-partner/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: `ratelimit_test_${i}@lumecafe.com` }),
      });

      if (res.status === 429) {
        rateLimited = true;
        assert.strictEqual(res.data.success, false);
        assert.ok(res.data.message.toLowerCase().includes('too many'));
        break;
      }
    }

    assert.ok(rateLimited, '6th/7th request must trigger 429 Too Many Requests');
  });

  // Reset limiter after testing rate limiting
  forgotPasswordLimiter.reset();
  resetPasswordLimiter.reset();

  // Scenario 12: Existing login flow and other user roles continue working.
  await runTest('12. Existing login flow and other user roles continue working', async () => {
    // Admin login test
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      adminUser.password = 'admin123';
      await adminUser.save();

      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: adminUser.email,
          password: 'admin123',
        }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.user.role, 'admin');
    }

    // Health check still OK
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'OK');
  });

  // Clean up test user
  await User.deleteOne({ email: testEmail });
  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
};

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
