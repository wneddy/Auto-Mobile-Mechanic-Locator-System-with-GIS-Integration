'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     */
    await queryInterface.addColumn('service_requests', 'rating', {
      type: Sequelize.DECIMAL(3, 2), // Adjust the data type as necessary
      allowNull: true, // Set to false if you want to make it a required field
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     */
    await queryInterface.removeColumn('service_requests', 'rating');
  }
};