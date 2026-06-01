'use strict';

const fs = require('fs');

/**
 * Split a .sql script into individual statements, honoring `DELIMITER`
 * directives so that CREATE PROCEDURE bodies (which contain `;`) are kept
 * intact as a single statement. Blank lines, line comments (`--`) and
 * `USE <db>` statements are skipped — the connection is already bound to the
 * configured database, and a hardcoded `USE` could point at the wrong schema.
 *
 * @param {string} sql
 * @returns {string[]} statements with the trailing delimiter removed
 */
function splitSqlStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  for (const rawLine of String(sql).split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();

    if (!trimmed) continue;                 // blank line
    if (trimmed.startsWith('--')) continue; // full-line comment
    if (/^USE\s+/i.test(trimmed)) continue; // USE <db>;

    const delMatch = trimmed.match(/^DELIMITER\s+(\S+)\s*$/i);
    if (delMatch) {
      delimiter = delMatch[1];
      continue;
    }

    buffer += line + '\n';

    if (trimmed.endsWith(delimiter)) {
      let stmt = buffer.trim();
      stmt = stmt.slice(0, stmt.length - delimiter.length).trim();
      if (stmt) statements.push(stmt);
      buffer = '';
    }
  }

  const tail = buffer.trim();
  if (tail) statements.push(tail);
  return statements;
}

/**
 * Read a .sql file and execute it one statement at a time through the given
 * Sequelize queryInterface. CREATE PROCEDURE statements are sent to the driver
 * as a single query (no client-side DELIMITER needed).
 *
 * @param {object} queryInterface  Sequelize queryInterface (umzug context)
 * @param {string} filePath        absolute path to the .sql file
 * @param {object} [opts]
 * @param {(stmt:string)=>boolean} [opts.skip]  return true to skip a statement
 */
async function runSqlFile(queryInterface, filePath, opts = {}) {
  const sql = fs.readFileSync(filePath, 'utf8');
  for (const stmt of splitSqlStatements(sql)) {
    if (opts.skip && opts.skip(stmt)) continue;
    await queryInterface.sequelize.query(stmt);
  }
}

module.exports = { splitSqlStatements, runSqlFile };
