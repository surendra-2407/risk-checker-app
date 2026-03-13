/**
 * AI Suggestion Service — powered by Google Gemini
 * Tries models in cascade order until one succeeds:
 *   1. gemini-1.5-flash   (fastest, generous free tier)
 *   2. gemini-1.5-flash-8b (smaller, sometimes has separate quota)
 *   3. gemini-pro          (fallback)
 * Sequential calls with 1.2 s gap to respect free-tier RPM.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

// Model cascade — all names confirmed via GET /v1beta/models?key=...
// gemini-2.0-flash-lite is the lightest and most quota-friendly
const MODEL_CASCADE = [
  'gemini-2.0-flash-lite',  // lightest, best free-tier quota
  'gemini-2.0-flash',       // standard flash
  'gemini-pro-latest'       // stable fallback
];

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Try one Gemini model for a security suggestion.
 * @returns parsed { explanation, corrected_code } or throws
 */
async function tryModel(client, modelName, prompt) {
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature:      0.2,
      maxOutputTokens:  400,
      responseMimeType: 'application/json'
    }
  });
  const result  = await model.generateContent(prompt);
  const raw     = result.response.text().trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Generate AI explanation and corrected code for a detected issue.
 * Falls back across the model cascade on quota / rate-limit errors.
 */
async function getAISuggestion(issue) {
  const client = getClient();

  if (!client) {
    return {
      ai_explanation:    'AI unavailable — GEMINI_API_KEY not set in .env.',
      ai_corrected_code: issue.suggested_fix || ''
    };
  }

  const prompt = `You are a senior software security expert reviewing flagged source code.

Issue Type: ${issue.issue_type}
Severity: ${issue.severity}
OWASP Reference: ${issue.owasp_ref || 'N/A'}
Description: ${issue.description}
Offending Code:
\`\`\`
${(issue.code_snippet || '(none)').slice(0, 400)}
\`\`\`

Return ONLY a raw JSON object (no markdown, no backticks) with exactly two keys:
{
  "explanation": "2-3 sentences on why this code is dangerous and what attack it enables",
  "corrected_code": "the fixed version of the code snippet"
}`;

  for (const modelName of MODEL_CASCADE) {
    try {
      const parsed = await tryModel(client, modelName, prompt);
      console.log(`[Gemini] ✅ Success with model: ${modelName}`);
      return {
        ai_explanation:    parsed.explanation    || '',
        ai_corrected_code: parsed.corrected_code || issue.suggested_fix || ''
      };
    } catch (err) {
      const isQuota = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
        console.warn(`[Gemini] Quota exhausted on ${modelName}, trying next model...`);
        await delay(1000);
        continue;
      }
      // Non-quota error — log and break
      console.error(`[Gemini] ${modelName} error:`, err.message?.slice(0, 150));
      break;
    }
  }

  // All models exhausted — return static suggestion  
  console.warn('[Gemini] All models exhausted — using static fix suggestion.');
  return {
    ai_explanation:    `Security Risk: ${issue.description} — ${issue.suggested_fix}`,
    ai_corrected_code: issue.suggested_fix || ''
  };
}

/**
 * Enrich the top N issues with Gemini AI suggestions.
 * Sequential calls with 1.2 s delay to respect free-tier RPM limits.
 */
async function enrichWithAI(issues, maxIssues = 3) {
  if (!issues || issues.length === 0) return issues;

  const enriched = [...issues];
  const limit    = Math.min(maxIssues, enriched.length);

  for (let i = 0; i < limit; i++) {
    const suggestion = await getAISuggestion(enriched[i]);
    enriched[i]      = { ...enriched[i], ...suggestion };
    if (i < limit - 1) await delay(1200); // Stay under 15 RPM free tier
  }

  return enriched;
}

module.exports = { getAISuggestion, enrichWithAI };
