require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
});

const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to MySQL database!');
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
};

testConnection();

module.exports = sequelize;