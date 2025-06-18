'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add the service_request_id column without the foreign key constraint
    await queryInterface.addColumn('notifications', 'service_request_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null temporarily
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove the service_request_id column
    await queryInterface.removeColumn('notifications', 'service_request_id');
  }
};