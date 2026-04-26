const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || undefined,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    pool: { max: 5, min: 0, idle: 10000 }
  }
);

// IMPORTANT: fast-glob (used internally by Umzug 3.x) requires forward-slash
// path separators. `path.join` on Windows produces backslashes, which silently
// matches zero files — making umzug think there are no migrations and every
// boot report "up-to-date". Always normalize to forward slashes here.
const migrationsGlob = path
  .join(__dirname, '../../migrations-sequelize/*.js')
  .replace(/\\/g, '/');

const umzug = new Umzug({
  migrations: {
    glob: migrationsGlob
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: {
    info: (msg) => console.log(`  ▸ ${typeof msg === 'object' ? msg.event || JSON.stringify(msg) : msg}`),
    warn: console.warn,
    error: console.error,
    debug: () => {}
  }
});

module.exports = { sequelize, umzug };
