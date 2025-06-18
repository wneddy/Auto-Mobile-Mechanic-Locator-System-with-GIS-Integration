const { DataTypes } = require("sequelize")
const sequelize = require("../../src/config/db") // Adjust the path as necessary

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "cancelled", "payment_failed"),
      defaultValue: "pending",
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    paymentDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      onUpdate: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    tableName: "orders",
  },
)

module.exports = Order

