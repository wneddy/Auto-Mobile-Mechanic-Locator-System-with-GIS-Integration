const { Sequelize } = require("sequelize")
const sequelize = require("../../src/config/db")

const User = require("./User")
const VehicleOwnerProfiles = require("./VehicleOwnerProfiles") // Import the VehicleOwnerProfiles model
const MechanicProfiles = require("./MechanicProfiles") // Import the MechanicProfiles model
const MechEarnings = require("./MechEarnings") // Import the MechEarnings model
const Booking = require("./Booking") // Import the Booking model
const ServiceRequest = require("./ServiceRequest") // Import the ServiceRequest model
const Notification = require("./Notification") // Import the Notification model
const AdminProfile = require("./AdminProfile")
const SparePart = require("./SparePart") // Make sure this line exists
const Order = require("./Order") // Import the Order model
const OrderItem = require("./OrderItem") // Import the OrderItem model

// Define associations
User.hasOne(VehicleOwnerProfiles, { foreignKey: "user_id", as: "vehicleOwnerProfile" })
VehicleOwnerProfiles.belongsTo(User, { foreignKey: "user_id", as: "user" })

// Define associations for MechanicProfiles and User
User.hasOne(MechanicProfiles, { foreignKey: "user_id", as: "mechanicProfile" })
MechanicProfiles.belongsTo(User, { foreignKey: "user_id", as: "user" })

// Define associations for MechanicProfiles and MechEarnings
MechanicProfiles.hasMany(MechEarnings, { foreignKey: "user_id", as: "earnings" })
MechEarnings.belongsTo(MechanicProfiles, { foreignKey: "user_id", targetKey: "id", as: "mechanic" })

// Define associations for MechanicProfiles and Booking
MechanicProfiles.hasMany(Booking, { foreignKey: "mechanicId", as: "bookings" })
Booking.belongsTo(MechanicProfiles, { foreignKey: "mechanicId", targetKey: "id", as: "mechanic" })

// Define associations for ServiceRequest
ServiceRequest.belongsTo(MechanicProfiles, { foreignKey: "mechanic_id", targetKey: "id", as: "mechanic" })
ServiceRequest.belongsTo(VehicleOwnerProfiles, { foreignKey: "user_id", targetKey: "id", as: "vehicleOwner" })

// Define associations for Booking and ServiceRequest
Booking.belongsTo(ServiceRequest, { foreignKey: "requestId", as: "serviceRequest" })
ServiceRequest.hasMany(Booking, { foreignKey: "requestId", as: "bookings" })

// Define associations for VehicleOwnerProfiles and ServiceRequest
VehicleOwnerProfiles.hasMany(ServiceRequest, { foreignKey: "user_id", sourceKey: "id", as: "serviceRequests" })

// Define associations for Notification
Notification.belongsTo(VehicleOwnerProfiles, { foreignKey: "user_id", targetKey: "id", as: "vehicleOwner" })
VehicleOwnerProfiles.hasMany(Notification, { foreignKey: "user_id", sourceKey: "id", as: "notifications" })

// Define associations for Notification and ServiceRequest
Notification.belongsTo(ServiceRequest, { foreignKey: "service_request_id", targetKey: "id", as: "serviceRequest" })
ServiceRequest.hasMany(Notification, { foreignKey: "service_request_id", sourceKey: "id", as: "notifications" })

// Define associations for AdminProfile and User
User.hasOne(AdminProfile, { foreignKey: "user_id", as: "adminProfile" })
AdminProfile.belongsTo(User, { foreignKey: "user_id", as: "user" })

// Define associations for SparePart and AdminProfile
SparePart.belongsTo(AdminProfile, { foreignKey: "adminId", as: "admin" })
AdminProfile.hasMany(SparePart, { foreignKey: "adminId", as: "spareParts" })

// Define associations for Order and User
User.hasMany(Order, { foreignKey: "userId", as: "orders" })
Order.belongsTo(User, { foreignKey: "userId", as: "user" })

// Define associations for Order and OrderItem
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "orderItems" })
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" })

// Define associations for OrderItem and SparePart
OrderItem.belongsTo(SparePart, { foreignKey: "partId", as: "part" })
SparePart.hasMany(OrderItem, { foreignKey: "partId", as: "orderItems" })

// Export all models
const db = {
  sequelize,
  Sequelize,
  User,
  VehicleOwnerProfiles,
  MechanicProfiles,
  MechEarnings,
  Booking,
  ServiceRequest,
  Notification,
  AdminProfile, // Add AdminProfile to the exports
  SparePart, // Make sure this is included in the exports
  Order, // Add Order to the exports
  OrderItem, // Add OrderItem to the exports
}

module.exports = db

