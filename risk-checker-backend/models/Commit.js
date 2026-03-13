const mongoose = require('mongoose');

const commitSchema = new mongoose.Schema({
  commit_id: { type: String, required: true, default: () => Math.random().toString(36).slice(2, 10) },
  developer_name: { type: String, default: 'Anonymous' },
  developer_email: { type: String, default: '' },
  repository: { type: String, default: 'unknown' },
  branch: { type: String, default: 'main' },
  risk_score: { type: Number, required: true, min: 0, max: 100 },
  risk_level: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
  total_issues: { type: Number, default: 0 },
  critical_count: { type: Number, default: 0 },
  high_count: { type: Number, default: 0 },
  medium_count: { type: Number, default: 0 },
  low_count: { type: Number, default: 0 },
  files_changed: [{ type: String }],
  lines_added: { type: Number, default: 0 },
  commit_allowed: { type: Boolean, required: true },
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  timestamp: { type: Date, default: Date.now }
});

// Index for fast dashboard queries
commitSchema.index({ timestamp: -1 });
commitSchema.index({ risk_level: 1 });
commitSchema.index({ developer_email: 1 });

module.exports = mongoose.model('Commit', commitSchema);
