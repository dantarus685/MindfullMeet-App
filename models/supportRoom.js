// models/supportRoom.js
module.exports = (sequelize, DataTypes) => {
  const SupportRoom = sequelize.define('SupportRoom', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('one-on-one', 'group'),
      defaultValue: 'one-on-one'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    tableName: 'support_rooms'
  });

  SupportRoom.associate = function(models) {
    // SupportRoom has many Messages
    SupportRoom.hasMany(models.SupportMessage, {
      foreignKey: 'roomId',
      as: 'messages'
    });
    
    // SupportRoom has many Users
    SupportRoom.belongsToMany(models.User, {
      through: 'UserRooms',
      foreignKey: 'roomId',
      as: 'participants'
    });
  };

  return SupportRoom;
};