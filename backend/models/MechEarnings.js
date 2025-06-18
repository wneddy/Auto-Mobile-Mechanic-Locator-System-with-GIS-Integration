const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/db'); // Adjust the path as necessary
const MechanicProfiles = require('./MechanicProfiles'); // Import the MechanicProfiles model

const MechEarnings = sequelize.define('MechEarnings', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: { // Change mechanic_id to user_id
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: MechanicProfiles, // Reference the MechanicProfiles model
            key: 'id' // Reference the id in MechanicProfiles
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Completed'),
        defaultValue: 'Pending'
    }
}, {
    timestamps: false, // Set to true if you want to track createdAt and updatedAt
    tableName: 'mech_earnings' // Specify the correct table name
});

// Define associations
MechEarnings.associate = (models) => {
    MechEarnings.belongsTo(models.MechanicProfiles, {
        foreignKey: 'user_id', // This is the foreign key in the MechEarnings model
        targetKey: 'id', // This is the primary key in the MechanicProfiles model
        as: 'mechanic' // Optional: alias for the association
    });
};

module.exports = MechEarnings;