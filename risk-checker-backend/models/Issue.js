const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  commit_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Commit' },
  issue_type: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
  file_name: { type: String, default: 'unknown' },
  line_number: { type: Number, default: 0 },
  matched_pattern: { type: String },
  code_snippet: { type: String },
  description: { type: String, required: true },
  suggested_fix: { type: String },
  ai_explanation: { type: String, default: '' },
  ai_corrected_code: { type: String, default: '' },
  owasp_ref: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Issue', issueSchema);
