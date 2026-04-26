'use strict';

const fs = require('fs');

function stripComments(stmt) {
  return stmt
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join('\n')
    .trim();
}

function splitSql(sql) {
  const out = [];
  const lines = sql.split(/\r?\n/);
  let delimiter = ';';
  let buffer = '';

  const flushOnDelimiter = () => {
    const parts = buffer.split(delimiter);
    buffer = parts.pop();
    for (const p of parts) {
      const stmt = p.trim();
      if (stmt) out.push(stmt);
    }
  };

  for (const line of lines) {
    const delimMatch = line.trim().match(/^DELIMITER\s+(\S+)$/i);
    if (delimMatch) {
      flushOnDelimiter();
      const leftover = buffer.trim();
      if (leftover) {
        out.push(leftover);
        buffer = '';
      }
      delimiter = delimMatch[1];
      continue;
    }
    buffer += line + '\n';
    if (buffer.includes(delimiter)) flushOnDelimiter();
  }

  const tail = buffer.trim();
  if (tail) out.push(tail);

  return out
    .map((s) => stripComments(s))
    .filter((s) => s.length > 0)
    .filter((s) => !/^USE\s+\w+\s*$/i.test(s));
}

async function runSqlFile(queryInterface, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = splitSql(sql);
  const runnable = statements.filter((s) => !/^SELECT\s+'/i.test(s));
  console.log(`  ▸ runSqlFile: ${runnable.length} statement(s) from ${filePath}`);
  if (runnable.length === 0) {
    console.warn(`  ⚠ runSqlFile: 0 runnable statements parsed from ${filePath} — nothing will execute`);
    return;
  }
  for (let i = 0; i < runnable.length; i++) {
    const stmt = runnable[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
    console.log(`    [${i + 1}/${runnable.length}] ${preview}${stmt.length > 80 ? '…' : ''}`);
    await queryInterface.sequelize.query(stmt);
  }
}

module.exports = { splitSql, stripComments, runSqlFile };
