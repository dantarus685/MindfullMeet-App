// models/rsvp.js
module.exports = (sequelize, DataTypes) => {
  const RSVP = sequelize.define('RSVP', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('going', 'interested', 'not-going'),
      defaultValue: 'going'
    },
    checkedIn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    feedbackSubmittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'rsvps',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'eventId']
      }
    ]
  });

  RSVP.associate = function(models) {
    // RSVP belongs to a User
    RSVP.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // RSVP belongs to an Event
    RSVP.belongsTo(models.Event, {
      foreignKey: 'eventId',
      as: 'event'
    });
  };

  return RSVP;
};