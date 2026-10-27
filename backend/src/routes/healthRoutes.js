const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// @desc    Get backend and database health status
// @route   GET /api/health
// @access  Public
router.get('/', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;

  if (isConnected) {
    return res.status(200).json({
      status: 'OK',
      database: 'connected',
    });
  }

  return res.status(500).json({
    status: 'ERROR',
    database: 'disconnected',
    message: 'Database connection failed.',
  });
});

// @desc    Diagnostic email logs (dev / test only)
// @route   GET /api/health/emails
// @access  Public (dev only)
router.get('/emails', (req, res) => {
  const { getSentEmailsLog } = require('../services/emailService');
  return res.status(200).json({
    success: true,
    data: getSentEmailsLog(),
  });
});

module.exports = router;
