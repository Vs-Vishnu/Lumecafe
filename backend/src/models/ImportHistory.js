const mongoose = require('mongoose');

const importHistorySchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    importedAt: {
      type: Date,
      default: Date.now,
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    validRows: {
      type: Number,
      default: 0,
    },
    invalidRows: {
      type: Number,
      default: 0,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    importedByName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ImportHistory', importHistorySchema);
