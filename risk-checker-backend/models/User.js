const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: null }, // null for OAuth users
  provider: {
    type: String,
    enum: ['password', 'github', 'google'],
    default: 'password'
  },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationExpires: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
