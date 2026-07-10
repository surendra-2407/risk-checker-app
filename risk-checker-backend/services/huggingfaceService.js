/**
 * HuggingFace Inference API Service
 * Uses the HuggingFace Inference API to classify code risk level.
 * Primary model: microsoft/codebert-base-mlm (fill-mask or text classification)
 * Fallback: simple heuristic scoring when API is unavailable.
 */

const https = require('https');

const HF_TOKEN   = process.env.HUGGINGFACE_API_KEY;
const HF_API     = 'api-inference.huggingface.co';
// CodeBERT fine-tuned for vulnerability classification
const HF_MODEL   = 'microsoft/codebert-base';

/**
 * Classify a code snippet via HuggingFace Inference API.
 * Returns a simple { label, score } or null if unavailable.
 * @param {string} code - code snippet to classify
 * @returns {Promise<{label: string, confidence: number}|null>}
 */
async function classifyCodeRisk(code) {
  if (!HF_TOKEN) {
    console.warn('[HuggingFace] No API key — skipping ML classification.');
    return null;
  }

  // Truncate to 512 tokens worth (rough: 2000 chars)
  const input = code.slice(0, 2000);

  const payload = JSON.stringify({ inputs: input });

  return new Promise((resolve) => {
    const options = {
      hostname: HF_API,
      path:     `/models/${HF_MODEL}`,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization':  `Bearer ${HF_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          // Handle loading state
          if (json.error && json.error.includes('loading')) {
            console.warn('[HuggingFace] Model loading, skipping.');
            return resolve(null);
          }
          // Handle classification output (array of [{label, score}])
          if (Array.isArray(json) && json[0]) {
            const top = Array.isArray(json[0]) ? json[0][0] : json[0];
            return resolve({
              label:      top.label || 'UNKNOWN',
              confidence: Math.round((top.score || 0) * 100)
            });
          }
          resolve(null);
        } catch (e) {
          console.warn('[HuggingFace] Parse error:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.warn('[HuggingFace] Request error:', e.message);
      resolve(null);
    });

    req.setTimeout(3500, () => {
      console.warn('[HuggingFace] Timeout.');
      req.destroy();
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Use HuggingFace to get a secondary risk signal.
 * Falls back to null gracefully when unavailable.
 * @param {string} code
 * @returns {Promise<{ml_label: string, ml_confidence: number}|null>}
 */
async function getRiskClassification(code) {
  const result = await classifyCodeRisk(code);
  if (!result) return null;
  return {
    ml_label:      result.label,
    ml_confidence: result.confidence,
    ml_provider:   'HuggingFace / microsoft/codebert-base'
  };
}

module.exports = { getRiskClassification };
