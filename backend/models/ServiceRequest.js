const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/db');
const MechanicProfiles = require('./MechanicProfiles');

const ServiceRequest = sequelize.define('ServiceRequest', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'VehicleOwnerProfiles',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    mechanic_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'MechanicProfiles',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'declined', 'completed'),
        defaultValue: 'pending'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'service_requests'
});

module.exports = ServiceRequest;
