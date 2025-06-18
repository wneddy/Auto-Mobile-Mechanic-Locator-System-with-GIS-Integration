require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log("DB Config Loaded:");
console.log("Username:", process.env.DB_USERNAME);
console.log("Password:", process.env.DB_PASSWORD);
console.log("Database Name:", process.env.DB_NAME);
console.log("Host:", process.env.DB_HOST);
console.log("Dialect:", process.env.DB_DIALECT);

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
});

sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });