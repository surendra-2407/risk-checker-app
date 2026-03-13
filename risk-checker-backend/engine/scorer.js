/**
 * Risk Score Calculator
 * Computes a composite risk score (0–100) and risk level from detected issues.
 */

const SEVERITY_WEIGHTS = {
  Critical: 25,
  High: 15,
  Medium: 8,
  Low: 3
};

const RISK_LEVELS = [
  { min: 0,  max: 20, level: 'Low',      color: '#22c55e', emoji: '🟢' },
  { min: 21, max: 50, level: 'Medium',   color: '#eab308', emoji: '🟡' },
  { min: 51, max: 75, level: 'High',     color: '#f97316', emoji: '🟠' },
  { min: 76, max: 100, level: 'Critical', color: '#ef4444', emoji: '🔴' }
];

/**
 * Calculate risk score from issues array.
 * @param {Array} issues - array of issue objects from scanner
 * @param {Object} options - { linesChanged }
 * @returns {{ score, level, color, emoji, counts, commit_allowed }}
 */
function calculateRiskScore(issues, options = {}) {
  const { linesChanged = 0 } = options;
  let score = 0;

  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };

  for (const issue of issues) {
    const weight = SEVERITY_WEIGHTS[issue.severity] || 0;
    score += weight;
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
  }

  // Large commit penalty
  if (linesChanged > 1000) score += 10;
  else if (linesChanged > 500) score += 5;

  // Clamp to 0–100
  score = Math.min(100, Math.max(0, score));

  const levelInfo = RISK_LEVELS.find(l => score >= l.min && score <= l.max)
    || RISK_LEVELS[RISK_LEVELS.length - 1];

  return {
    score,
    level: levelInfo.level,
    color: levelInfo.color,
    emoji: levelInfo.emoji,
    counts,
    commit_allowed: score <= 50
  };
}

module.exports = { calculateRiskScore, RISK_LEVELS, SEVERITY_WEIGHTS };
