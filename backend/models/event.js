// models/event.js
module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    eventType: {
      type: DataTypes.ENUM(
        'meditation',
        'support-group',
        'therapy-session',
        'wellness-workshop',
        'nature-therapy',
        'mindfulness-retreat',
        'other'
      ),
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    meetingLink: {
      type: DataTypes.STRING,
      allowNull: true
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hostId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    requirements: {
      type: DataTypes.JSON,
      allowNull: true
    },
    resources: {
      type: DataTypes.JSON,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    tableName: 'events'
  });

  Event.associate = function(models) {
    // Event belongs to a User (host)
    Event.belongsTo(models.User, {
      foreignKey: 'hostId',
      as: 'host'
    });
    
    // Event has many RSVPs
    Event.hasMany(models.RSVP, {
      foreignKey: 'eventId',
      as: 'rsvps'
    });
    
    // Event has many Comments
    Event.hasMany(models.Comment, {
      foreignKey: 'eventId',
      as: 'comments'
    });
  };

  return Event;
};