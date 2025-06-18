const { DataTypes } = require("sequelize")
const sequelize = require("../../src/config/db") // Adjust the path as necessary

const OrderItem = sequelize.define(
  "OrderItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "orders",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    partId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "spare_parts",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
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
    tableName: "order_items",
  },
)

module.exports = OrderItem

