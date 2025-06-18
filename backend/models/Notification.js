const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/db');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    service_request_id: { // Update this field
        type: DataTypes.INTEGER,
        allowNull: false, // Set to false to enforce that this field must have a value
        references: {
            model: 'service_requests', // Reference the ServiceRequest model
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    }
}, {
    timestamps: false,
    tableName: 'notifications'
});

module.exports = Notification;