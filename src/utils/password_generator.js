const crypto = require('crypto');

const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*';

const pick = (set) => set[crypto.randomInt(0, set.length)];

exports.generateTemporaryPassword = (length = 12) => {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  for (let i = chars.length; i < length; i++) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};
