'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Drop the tables in the correct order to avoid foreign key constraint issues.
     */
    await queryInterface.dropTable('VehicleDetails'); // Drop VehicleDetails first
    await queryInterface.dropTable('ServiceHistories'); // Drop ServiceHistories next
    await queryInterface.dropTable('VehicleOwnerPersonalProfiles'); // Finally, drop VehicleOwnerPersonalProfiles
  },

  async down (queryInterface, Sequelize) {
    /**
     * Recreate the tables if needed (optional).
     */
    await queryInterface.createTable('VehicleOwnerPersonalProfiles', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      profile_picture: {
        type: Sequelize.STRING,
      },
      county: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sub_county: {
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

    await queryInterface.createTable('ServiceHistories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      vehicle_owner_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'VehicleOwnerPersonalProfiles',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      last_service_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      service_frequency: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      common_issues: {
        type: Sequelize.TEXT,
      },
      next_scheduled_service: {
        type: Sequelize.DATE,
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

    await queryInterface.createTable('VehicleDetails', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      vehicle_owner_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'VehicleOwnerPersonalProfiles',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
  }
};