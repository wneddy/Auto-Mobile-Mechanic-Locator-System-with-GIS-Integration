const { DataTypes } = require("sequelize")
const sequelize = require("../../src/config/db")

const AdminProfile = sequelize.define(
  "AdminProfile",
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
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    employee_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    contact_phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    office_location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.TEXT, // Stored as JSON string
      allowNull: false,
      defaultValue: '["spare_parts_management"]',
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "admin_profiles",
  },
)

module.exports = AdminProfile

