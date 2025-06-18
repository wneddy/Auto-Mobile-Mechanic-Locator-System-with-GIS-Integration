const { DataTypes } = require("sequelize");
const sequelize = require("../../src/config/db");

const User = sequelize.define(
  "User",
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        name: 'unique_phone', // Use a named unique constraint
        msg: 'Phone number must be unique',
      },
    },    
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_type: {
      type: DataTypes.ENUM("vehicle-owner", "vendor", "mechanic", "admin"),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Default to false until activated
    },
    activationToken: {
      type: DataTypes.STRING,
      allowNull: true, // This will store the token for activation
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true, // This can be null if no reset is requested
    },
    resetTokenExpiration: {
      type: DataTypes.DATE,
      allowNull: true, // This can be null if no reset is requested
    },
    currentToken: {
      type: DataTypes.STRING,
      allowNull: true, // This will store the current access token
    },
    currentRefreshToken: {
      type: DataTypes.STRING,
      allowNull: true, // This will store the current refresh token
    },
  },
  {
    tableName: "users", // ✅ Explicitly use "users" (lowercase)
    timestamps: true,
  }
);

module.exports = User;
