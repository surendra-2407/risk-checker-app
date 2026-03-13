/**
 * Core Risk Analysis Engine
 * Applies 20+ regex-based detection rules against code text.
 * Returns an array of issue objects sorted by severity.
 */

const SEVERITY_ORDER = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const RULES = [
  // ── SECRETS ──────────────────────────────────────────────────────────────
  {
    id: 'R001', category: 'Secrets', severity: 'Critical',
    pattern: /(api[_-]?key|apikey)\s*[=:]\s*['"`][^'"`\s]{10,}['"`]/gi,
    description: 'Hardcoded API key detected in source code',
    suggested_fix: 'Store in environment variables: process.env.API_KEY',
    owasp_ref: 'CWE-798'
  },
  {
    id: 'R002', category: 'Secrets', severity: 'Critical',
    pattern: /(password|passwd|pwd|secret)\s*[=:]\s*['"`][^'"`\s]{4,}['"`]/gi,
    description: 'Hardcoded password or secret detected',
    suggested_fix: 'Use environment variables or a secrets manager (Vault, AWS SSM)',
    owasp_ref: 'CWE-798'
  },
  {
    id: 'R003', category: 'Secrets', severity: 'Critical',
    pattern: /sk-[a-zA-Z0-9]{32,}/g,
    description: 'OpenAI API key detected in source code',
    suggested_fix: 'Move key to .env file and load with dotenv',
    owasp_ref: 'CWE-798'
  },
  {
    id: 'R004', category: 'Secrets', severity: 'Critical',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    description: 'GitHub Personal Access Token detected',
    suggested_fix: 'Revoke this token immediately and use GitHub Secrets instead',
    owasp_ref: 'CWE-798'
  },
  {
    id: 'R005', category: 'Secrets', severity: 'Critical',
    pattern: /-----BEGIN\s+(RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE KEY-----/g,
    description: 'Private key material detected in source code',
    suggested_fix: 'Never store private keys in source files — use secure key stores',
    owasp_ref: 'CWE-321'
  },
  {
    id: 'R006', category: 'Secrets', severity: 'Critical',
    pattern: /(AWS_SECRET_ACCESS_KEY|aws_secret_access_key)\s*[=:]\s*\S+/g,
    description: 'AWS secret access key detected',
    suggested_fix: 'Use IAM roles or AWS Secrets Manager instead of hardcoded keys',
    owasp_ref: 'CWE-798'
  },
  {
    id: 'R007', category: 'Secrets', severity: 'High',
    pattern: /(token|auth_token|access_token|bearer)\s*[=:]\s*['"`][A-Za-z0-9\-_.]{20,}['"`]/gi,
    description: 'Hardcoded authentication token detected',
    suggested_fix: 'Load tokens from environment variables at runtime',
    owasp_ref: 'CWE-798'
  },

  // ── INJECTION ─────────────────────────────────────────────────────────────
  {
    id: 'R008', category: 'Injection', severity: 'High',
    pattern: /\beval\s*\(/g,
    description: 'eval() usage detected — can execute arbitrary code',
    suggested_fix: 'Replace eval() with JSON.parse() for data or a safe function map',
    owasp_ref: 'CWE-95'
  },
  {
    id: 'R009', category: 'Injection', severity: 'High',
    pattern: /new\s+Function\s*\(/g,
    description: 'Function constructor detected — equivalent to eval()',
    suggested_fix: 'Use static function definitions instead of dynamic code generation',
    owasp_ref: 'CWE-95'
  },
  {
    id: 'R010', category: 'Injection', severity: 'High',
    pattern: /innerHTML\s*=/g,
    description: 'innerHTML assignment detected — XSS vector',
    suggested_fix: 'Use textContent or sanitize with DOMPurify before innerHTML',
    owasp_ref: 'CWE-79'
  },
  {
    id: 'R011', category: 'Injection', severity: 'High',
    pattern: /document\.write\s*\(/g,
    description: 'document.write() detected — deprecated XSS risk',
    suggested_fix: 'Use modern DOM APIs like appendChild() or innerHTML with sanitization',
    owasp_ref: 'CWE-79'
  },

  // ── SQL INJECTION ─────────────────────────────────────────────────────────
  {
    id: 'R012', category: 'SQL Injection', severity: 'High',
    pattern: /query\s*[=+]\s*.*\+\s*(req\.|request\.|params\.|body\.)/g,
    description: 'Dynamic SQL query built with user input — SQL injection risk',
    suggested_fix: 'Use parameterized queries or an ORM like Sequelize/Mongoose',
    owasp_ref: 'CWE-89'
  },
  {
    id: 'R013', category: 'SQL Injection', severity: 'High',
    pattern: /`[^`]*(SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{(req|request|params|body)/gi,
    description: 'Template literal SQL with user input — SQL injection risk',
    suggested_fix: 'Use prepared statements: db.query("SELECT * WHERE id = ?", [req.params.id])',
    owasp_ref: 'CWE-89'
  },

  // ── COMMAND INJECTION ─────────────────────────────────────────────────────
  {
    id: 'R014', category: 'Command Injection', severity: 'High',
    pattern: /exec\s*\(\s*(req\.|request\.|params\.|body\.|\$\{)/g,
    description: 'Shell command execution with user input — command injection risk',
    suggested_fix: 'Validate and sanitize all inputs; use execFile() with a fixed command array',
    owasp_ref: 'CWE-78'
  },
  {
    id: 'R015', category: 'Command Injection', severity: 'Medium',
    pattern: /require\(['"`]child_process['"`]\)/g,
    description: 'child_process module imported — review all exec/spawn calls',
    suggested_fix: 'Ensure all arguments to exec/spawn are sanitized and allowlisted',
    owasp_ref: 'CWE-78'
  },

  // ── DEBUG ARTIFACTS ───────────────────────────────────────────────────────
  {
    id: 'R016', category: 'Debug Code', severity: 'Low',
    pattern: /console\.(log|warn|error|debug|info)\s*\(/g,
    description: 'console.log() statements left in code — may leak sensitive data',
    suggested_fix: 'Remove debug logs or use a proper logger (winston, pino) with log levels',
    owasp_ref: 'CWE-532'
  },
  {
    id: 'R017', category: 'Debug Code', severity: 'Low',
    pattern: /\bdebugger\s*;/g,
    description: 'debugger statement found in production code',
    suggested_fix: 'Remove debugger statements before committing',
    owasp_ref: 'CWE-489'
  },
  {
    id: 'R018', category: 'Code Quality', severity: 'Low',
    pattern: /\b(TODO|FIXME|HACK|XXX)\b/g,
    description: 'Unresolved TODO/FIXME comment detected',
    suggested_fix: 'Resolve the issue or track it in your issue tracker before committing',
    owasp_ref: 'N/A'
  },

  // ── CONFIGURATION RISKS ───────────────────────────────────────────────────
  {
    id: 'R019', category: 'Configuration', severity: 'High',
    pattern: /require\(['"`]\.env['"`]\)|import.*\.env/g,
    description: '.env file is being imported/required as a module',
    suggested_fix: 'Use dotenv: require("dotenv").config() and access via process.env',
    owasp_ref: 'CWE-312'
  },
  {
    id: 'R020', category: 'Configuration', severity: 'Medium',
    pattern: /process\.env\.[A-Z_]+\s*\|\|\s*['"`][^'"`]{6,}['"`]/g,
    description: 'Hardcoded fallback value for environment variable detected',
    suggested_fix: 'Remove the hardcoded fallback; fail fast if required env var is missing',
    owasp_ref: 'CWE-547'
  },

  // ── PATH TRAVERSAL ────────────────────────────────────────────────────────
  {
    id: 'R021', category: 'Path Traversal', severity: 'High',
    pattern: /readFile(?:Sync)?\s*\([^)]*\+\s*(req\.|request\.|params\.|body\.)/g,
    description: 'File read with user-controlled path — path traversal risk',
    suggested_fix: 'Validate and sanitize file paths; use path.join() with a safe base directory',
    owasp_ref: 'CWE-22'
  },

  // ── CRYPTOGRAPHY ──────────────────────────────────────────────────────────
  {
    id: 'R022', category: 'Cryptography', severity: 'Medium',
    pattern: /createHash\s*\(\s*['"`]md5['"`]\)/gi,
    description: 'MD5 hash function used — cryptographically broken',
    suggested_fix: 'Use SHA-256 or bcrypt for password hashing: crypto.createHash("sha256")',
    owasp_ref: 'CWE-327'
  },
  {
    id: 'R023', category: 'Cryptography', severity: 'Medium',
    pattern: /Math\.random\s*\(\s*\)/g,
    description: 'Math.random() used — not cryptographically secure',
    suggested_fix: 'Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive values',
    owasp_ref: 'CWE-338'
  }
];

/**
 * Scans code text against all rules.
 * @param {string} code - raw code content
 * @param {string} fileName - optional filename for context
 * @returns {Array} array of issue objects
 */
function scanCode(code, fileName = 'input') {
  const issues = [];
  const lines = code.split('\n');

  for (const rule of RULES) {
    // Reset lastIndex for global regexes
    rule.pattern.lastIndex = 0;
    let match;
    const usedLines = new Set();

    while ((match = rule.pattern.exec(code)) !== null) {
      // Find line number
      const upToMatch = code.slice(0, match.index);
      const lineNumber = upToMatch.split('\n').length;

      // Deduplicate identical issues on same line
      if (usedLines.has(lineNumber)) continue;
      usedLines.add(lineNumber);

      const snippet = lines[lineNumber - 1]?.trim().slice(0, 200) || match[0].slice(0, 200);

      issues.push({
        issue_type: rule.category.toUpperCase().replace(/\s+/g, '_'),
        category: rule.category,
        severity: rule.severity,
        rule_id: rule.id,
        file_name: fileName,
        line_number: lineNumber,
        matched_pattern: match[0].slice(0, 100),
        code_snippet: snippet,
        description: rule.description,
        suggested_fix: rule.suggested_fix,
        owasp_ref: rule.owasp_ref
      });

      rule.pattern.lastIndex = 0; // reset for safety
      break; // Report rule once per file to avoid flood (remove for exhaustive mode)
    }
  }

  // Sort by severity descending
  return issues.sort((a, b) =>
    (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0)
  );
}

module.exports = { scanCode, RULES };
