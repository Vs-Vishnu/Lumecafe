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

module.exports = router;
