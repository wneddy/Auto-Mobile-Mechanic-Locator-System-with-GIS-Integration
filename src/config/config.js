require('dotenv').config();
console.log("DB CONFIG LOADED:", process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_NAME);
const path = require('path');

module.exports = {
  development: {
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "mechanic_locator",
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: process.env.DB_DIALECT || "mysql",
    migrationStorage: "sequelize",
    migrations: {
      path: path.join(__dirname, '../../backend/migrations'),  // ✅ Correct path
    }
  },
  test: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    migrations: {
      path: path.join(__dirname, '../../backend/migrations'),
    }
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    migrations: {
      path: path.join(__dirname, '../../backend/migrations'),
    }
  }
};
