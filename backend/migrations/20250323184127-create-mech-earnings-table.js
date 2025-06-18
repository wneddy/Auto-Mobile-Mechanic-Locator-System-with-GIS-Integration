'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('mech_earnings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      mechanic_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'MechanicProfiles', // Reference the MechanicProfiles table
          key: 'id', // Reference the id in MechanicProfiles
        },
        onDelete: 'CASCADE', // If a mechanic is deleted, delete their earnings
        onUpdate: 'CASCADE', // If a mechanic's id is updated, update the earnings
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('Pending', 'Completed'),
        defaultValue: 'Pending',
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
    await queryInterface.dropTable('mech_earnings');
  }
};