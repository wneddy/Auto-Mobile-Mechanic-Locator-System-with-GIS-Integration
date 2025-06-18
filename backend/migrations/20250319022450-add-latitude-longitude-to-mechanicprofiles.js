'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add latitude and longitude columns to MechanicProfiles table
    await queryInterface.addColumn('MechanicProfiles', 'latitude', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });
    await queryInterface.addColumn('MechanicProfiles', 'longitude', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove latitude and longitude columns from MechanicProfiles table
    await queryInterface.removeColumn('MechanicProfiles', 'latitude');
    await queryInterface.removeColumn('MechanicProfiles', 'longitude');
  }
};