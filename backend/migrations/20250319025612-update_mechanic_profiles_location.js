'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn('MechanicProfiles', 'city', 'county');
    await queryInterface.renameColumn('MechanicProfiles', 'country', 'sub_county');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn('MechanicProfiles', 'county', 'city');
    await queryInterface.renameColumn('MechanicProfiles', 'sub_county', 'country');
  }
};
