'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     */
    await queryInterface.createTable('VehicleOwnerProfiles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // Assuming you have a users table
          key: 'id',
        },
        onDelete: 'CASCADE', // Optional: Define behavior on delete
        onUpdate: 'CASCADE', // Optional: Define behavior on update
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      county: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sub_county: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      last_service_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      service_frequency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      common_issues: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      next_scheduled_service: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      license_plate: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      make_model: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      vehicle_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      number_of_vehicles: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      year_manufacture: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      insurance_status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     */
    await queryInterface.dropTable('VehicleOwnerProfiles');
  }
};