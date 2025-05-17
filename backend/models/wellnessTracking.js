// models/wellnessTracking.js
module.exports = (sequelize, DataTypes) => {
  const WellnessTracking = sequelize.define('WellnessTracking', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    mood: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10
      }
    },
    sleepHours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 24
      }
    },
    meditationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    didMeditate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    activities: {
      type: DataTypes.JSON,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stressLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10
      }
    },
    gratitude: {
      type: DataTypes.JSON,
      allowNull: true
    },
    goals: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'wellness_trackings',
    indexes: [
      {
        fields: ['userId', 'date']
      }
    ]
  });

  WellnessTracking.associate = function(models) {
    // WellnessTracking belongs to a User
    WellnessTracking.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return WellnessTracking;
};