'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Alter the national_id_passport column to remove the unique constraint.
     */
    await queryInterface.changeColumn('MechanicProfiles', 'national_id_passport', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: false // Remove the unique constraint
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Revert the national_id_passport column to add the unique constraint back.
     */
    await queryInterface.changeColumn('MechanicProfiles', 'national_id_passport', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true // Re-add the unique constraint
    });
  }
};