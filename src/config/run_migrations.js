const { umzug } = require('./sequelize');

async function runPendingMigrations() {
  const pending = await umzug.pending();
  if (pending.length === 0) {
    return { applied: [] };
  }
  console.log(`🔧 Applying ${pending.length} pending migration(s)...`);
  const applied = await umzug.up();
  return { applied: applied.map((m) => m.name) };
}

module.exports = { runPendingMigrations };
