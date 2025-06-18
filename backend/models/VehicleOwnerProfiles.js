// src/models/VehicleOwnerProfiles.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../src/config/db"); // Adjust the path as necessary

const VehicleOwnerProfiles = sequelize.define(
  "VehicleOwnerProfiles",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // Name of the referenced table
        key: 'id',      // Name of the referenced column
      },
      onDelete: 'CASCADE', // Optional: Define behavior on delete
      onUpdate: 'CASCADE', // Optional: Define behavior on update
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    county: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sub_county: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_service_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    service_frequency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    common_issues: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    next_scheduled_service: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    license_plate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    make_model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vehicle_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    number_of_vehicles: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    year_manufacture: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    insurance_status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "VehicleOwnerProfiles", // Specify the table name
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

module.exports = VehicleOwnerProfiles;