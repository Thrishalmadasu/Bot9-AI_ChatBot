const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

const Message = sequelize.define('Message', {
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

sequelize.sync();

module.exports = { sequelize, Message };