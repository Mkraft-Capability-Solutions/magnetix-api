/**
 * Byte Video provider selector.
 *
 * Chooses the generation backend from `process.env.BYTE_VIDEO_PROVIDER`
 * (default 'explainer'). A real text-to-video vendor (Veo/Runway/etc.) can be
 * added later as another module here with the same `generate(job)` contract —
 * no changes to the DB, scheduler, routes, or UI are needed.
 */
const explainerProvider = require('./explainer_provider');
const stubProvider = require('./stub_provider');

const PROVIDERS = {
  [explainerProvider.name]: explainerProvider,
  [stubProvider.name]: stubProvider,
};

const DEFAULT_PROVIDER = 'explainer';

function getProvider() {
  const key = (process.env.BYTE_VIDEO_PROVIDER || DEFAULT_PROVIDER).trim();
  return PROVIDERS[key] || PROVIDERS[DEFAULT_PROVIDER];
}

module.exports = { getProvider, PROVIDERS, DEFAULT_PROVIDER };
