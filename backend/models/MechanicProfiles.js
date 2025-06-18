// src/models/MechanicProfiles.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../src/config/db"); // Adjust the path as necessary

const MechanicProfiles = sequelize.define(
  "MechanicProfiles", // Model name
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
        model: "users", // Reference the users table
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: false,
    },
    profile_picture: {
      type: DataTypes.STRING, // File path storage
      allowNull: true,
    },
    national_id_passport: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    // Professional Information
    specialization: {
      type: DataTypes.ENUM(
        "Engine Repair",
        "Brake System",
        "Electrical Wiring",
        "Transmission",
        "Suspension",
        "Body Work"
      ),
      allowNull: false,
    },
    skills_services: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    years_of_experience: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    certification_number: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    availability: {
      type: DataTypes.ENUM("Full-Time", "Part-Time"),
      allowNull: false,
    },
    
    // New available field
    available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true // Set a default value if needed
    },

    // Location & Accessibility
    workshop_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    county: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sub_county: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Latitude and longitude
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    // Vehicle Expertise
    vehicle_types: {
      type: DataTypes.ENUM("Sedans", "SUVs", "Trucks", "Motorcycles"),
      allowNull: false,
    },
    preferred_brands: {
      type: DataTypes.ENUM("Toyota", "Ford", "Honda", "BMW", "Mercedes", "Nissan"),
      allowNull: false,
    },

    // Pricing & Payment
    estimated_charges: {
      type: DataTypes.TEXT, // Store JSON pricing structure
      allowNull: false,
    },
    payment_methods: {
      type: DataTypes.ENUM("Cash", "Mobile Payment", "Card"),
      allowNull: false,
    },

    // Supporting Documents
    certification_license: {
      type: DataTypes.STRING, // File path storage
      allowNull: true,
    },
    insurance: {
      type: DataTypes.STRING, // File path storage
      allowNull: true,
    },
    identification_document: {
      type: DataTypes.STRING, // File path storage
      allowNull: true,
    },

    // Customer Feedback
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.0,
    },
    total_reviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "MechanicProfiles",
    timestamps: true,
  }
);

module.exports = MechanicProfiles;