'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
      await queryInterface.addColumn('Users', 'resetToken', {
          type: Sequelize.STRING,
          allowNull: true,
      });
      await queryInterface.addColumn('Users', 'resetTokenExpiration', {
          type: Sequelize.DATE,
          allowNull: true,
      });
  },

  down: async (queryInterface, Sequelize) => {
      await queryInterface.removeColumn('Users', 'resetToken');
      await queryInterface.removeColumn('Users', 'resetTokenExpiration');
  }
};
