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

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../../migrations-sequelize/*.js')
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
