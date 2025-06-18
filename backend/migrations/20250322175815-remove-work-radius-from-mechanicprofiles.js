"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Remove the work_radius_km column from the MechanicProfiles table.
     */
    await queryInterface.removeColumn("MechanicProfiles", "work_radius_km");
  },

  async down(queryInterface, Sequelize) {
    /**
     * Re-add the work_radius_km column in case of rollback.
     */
    await queryInterface.addColumn("MechanicProfiles", "work_radius_km", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
