const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/db'); // Adjust the path as necessary

const SparePart = sequelize.define('SparePart', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false // Name is required
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true // Description can be optional
    },
    price: {
        type: DataTypes.DECIMAL(10, 2), // Allows for prices with two decimal places
        allowNull: false // Price is required
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false, // Quantity is required
        defaultValue: 0 // Default to 0 if not specified
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true // Image URL can be optional
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true // Category can be optional
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW // Automatically set to the current date
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Automatically set to the current date
        onUpdate: DataTypes.NOW // Update this field on record update
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: false, // Admin ID is required
        references: {
            model: 'admin_profiles', // Assuming you have an Admins model
            key: 'id'
        },
        onDelete: 'CASCADE', // If the admin is deleted, delete the spare parts
        onUpdate: 'CASCADE' // Update the foreign key if the admin ID changes
    }
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt
    tableName: 'spare_parts' // Specify the table name
});

module.exports = SparePart;