'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Change user_id to add foreign key constraint
    await queryInterface.changeColumn('service_requests', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'VehicleOwnerProfiles', // Reference the VehicleOwnerProfiles table
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Change mechanic_id to add foreign key constraint
    await queryInterface.changeColumn('service_requests', 'mechanic_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'MechanicProfiles', // Reference the MechanicProfiles table
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove foreign key constraint for user_id
    await queryInterface.removeConstraint('service_requests', 'service_requests_user_id_fkey');

    // Remove foreign key constraint for mechanic_id
    await queryInterface.removeConstraint('service_requests', 'service_requests_mechanic_id_fkey');
  }
};