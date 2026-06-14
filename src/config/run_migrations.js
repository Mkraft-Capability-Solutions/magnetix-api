const { umzug } = require('./sequelize');

async function runPendingMigrations() {
  // Diagnostic: list every migration umzug knows about and its applied status.
  // Without this it's impossible to tell whether umzug is reading the right
  // files or whether SequelizeMeta has stale rows from a prior broken run.
  let allMigrations;
  try {
    allMigrations = await umzug.migrations({});
    const executed = await umzug.executed();
    const executedNames = new Set(executed.map((m) => m.name));
    console.log(`📜 umzug: ${allMigrations.length} migration file(s) found, ${executed.length} recorded as applied`);
    for (const m of allMigrations) {
      const status = executedNames.has(m.name) ? '✓ applied' : '· pending';
      console.log(`    ${status}  ${m.name}`);
    }
    const orphans = [...executedNames].filter((n) => !allMigrations.some((m) => m.name === n));
    if (orphans.length > 0) {
      console.log(`⚠ umzug: ${orphans.length} SequelizeMeta row(s) with no matching file (harmless but stale): ${orphans.join(', ')}`);
    }
  } catch (introspectErr) {
    console.warn('⚠ umzug: could not introspect migrations list:', introspectErr.message);
  }

  const pending = await umzug.pending();
  if (pending.length === 0) {
    return { applied: [], failed: [] };
  }
  console.log(`🔧 Applying ${pending.length} pending migration(s) (per-migration error tolerance enabled)...`);

  // Run pending migrations one at a time, isolating failures so a single bad
  // migration doesn't block the rest. Failed migrations are NOT recorded in
  // SequelizeMeta — they remain pending for the next boot. We surface a clear
  // summary so problems are visible.
  const applied = [];
  const failed = [];
  for (const p of pending) {
    try {
      await umzug.up({ to: p.name });
      console.log(`  ✓ migrated: ${p.name}`);
      applied.push(p.name);
    } catch (err) {
      console.error(`  ✗ failed: ${p.name}`);
      console.error(`    ${err && err.message ? err.message : err}`);
      if (err && err.cause && err.cause.sqlMessage) {
        console.error(`    sqlMessage: ${err.cause.sqlMessage}`);
      }
      failed.push({ name: p.name, error: err && err.message });
      // Continue to next migration — do NOT throw.
    }
  }

  if (failed.length > 0) {
    console.warn(`⚠ ${failed.length} migration(s) failed — see errors above. They will be retried on next boot.`);
  }
  return { applied, failed };
}

module.exports = { runPendingMigrations };
