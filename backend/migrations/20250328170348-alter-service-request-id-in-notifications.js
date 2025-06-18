'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Alter the service_request_id column to set allowNull to false
    await queryInterface.changeColumn('notifications', 'service_request_id', {
      type: Sequelize.INTEGER,
      allowNull: false, // Enforce that this field must have a value
      references: {
        model: 'service_requests', // Reference the ServiceRequest model
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert the change to allowNull to true
    await queryInterface.changeColumn('notifications', 'service_request_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null again if rolling back
      references: {
        model: 'service_requests',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};