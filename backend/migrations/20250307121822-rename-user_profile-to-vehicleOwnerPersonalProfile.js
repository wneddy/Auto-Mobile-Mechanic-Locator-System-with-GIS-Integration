'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameTable('user_profile', 'VehicleOwnerPersonalProfile');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameTable('VehicleOwnerPersonalProfile', 'user_profile');
  }
};