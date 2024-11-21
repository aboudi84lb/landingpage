const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  verificationCode: { type: Number, required: true },
  createdAt: { type: Date, required: true }
});

module.exports = mongoose.model('Verification', verificationSchema);