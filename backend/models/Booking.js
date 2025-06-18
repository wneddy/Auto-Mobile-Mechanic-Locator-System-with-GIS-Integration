const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/db');

const Booking = sequelize.define("Booking", {
    requestId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    mechanicId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    customerName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Pending"
    }
}, {
    timestamps: true
});

module.exports = Booking;