'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.dropTable('User  s');
  },

  async down (queryInterface, Sequelize) {
    // If you want to recreate the table in case of a rollback, you can add the createTable logic here.
    await queryInterface.createTable('User  s', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      user_type: {
        type: Sequelize.ENUM('vehicle-owner', 'vendor', 'mechanic', 'admin'),
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      activationToken: {
        type: Sequelize.STRING,
      },
      resetToken: {
        type: Sequelize.STRING,
      },
      resetTokenExpiration: {
        type: Sequelize.DATE,
      },
      currentToken: {
        type: Sequelize.STRING,
      },
      currentRefreshToken: {
        type: Sequelize.STRING,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  }
};