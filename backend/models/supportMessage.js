// models/supportMessage.js
module.exports = (sequelize, DataTypes) => {
  const SupportMessage = sequelize.define('SupportMessage', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    tableName: 'support_messages'
  });

  SupportMessage.associate = function(models) {
    // SupportMessage belongs to a SupportRoom
    SupportMessage.belongsTo(models.SupportRoom, {
      foreignKey: 'roomId',
      as: 'room'
    });
    
    // SupportMessage belongs to a User (sender)
    SupportMessage.belongsTo(models.User, {
      foreignKey: 'senderId',
      as: 'sender'
    });
  };

  return SupportMessage;
};