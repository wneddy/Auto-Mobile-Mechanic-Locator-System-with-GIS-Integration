'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add the 'available' column to the 'MechanicProfiles' table.
     */
    await queryInterface.addColumn('MechanicProfiles', 'available', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true // Set a default value if needed
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Remove the 'available' column from the 'MechanicProfiles' table.
     */
    await queryInterface.removeColumn('MechanicProfiles', 'available');
  }
};