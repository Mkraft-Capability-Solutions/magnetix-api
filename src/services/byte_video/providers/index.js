/**
 * Byte Video provider selector.
 *
 * Chooses the generation backend from `process.env.BYTE_VIDEO_PROVIDER`
 * (default 'explainer'):
 *   - explainer  : assembled video — Gemini script + (ElevenLabs/free) voice +
 *                  (stock video / stock photo / caption slide) per scene.
 *   - heygen     : AI presenter (avatar) video via HeyGen (needs API credits).
 *   - stub       : placeholder clip, no external services.
 *
 * Add a new vendor by dropping in another module with the same
 * `generate(job)` contract — no DB/scheduler/route/UI changes needed.
 */
const explainerProvider = require('./explainer_provider');
const stubProvider = require('./stub_provider');
const heygenProvider = require('./heygen_provider');

const PROVIDERS = {
  [explainerProvider.name]: explainerProvider,
  [stubProvider.name]: stubProvider,
  [heygenProvider.name]: heygenProvider,
};

const DEFAULT_PROVIDER = 'explainer';

function getProvider() {
  const key = (process.env.BYTE_VIDEO_PROVIDER || DEFAULT_PROVIDER).trim();
  return PROVIDERS[key] || PROVIDERS[DEFAULT_PROVIDER];
}

module.exports = { getProvider, PROVIDERS, DEFAULT_PROVIDER };
