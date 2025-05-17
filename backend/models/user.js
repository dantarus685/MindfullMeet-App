// models/user.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('user', 'support-member', 'admin'),
      defaultValue: 'user'
    },
    interests: {
      type: DataTypes.JSON,
      allowNull: true
    },
    wellnessGoals: {
      type: DataTypes.JSON,
      allowNull: true
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    tableName: 'users',
    defaultScope: {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] }
      }
    }
  });

  User.associate = function(models) {
    // User has many Events as host
    User.hasMany(models.Event, {
      foreignKey: 'hostId',
      as: 'hostedEvents'
    });
    
    // User has many RSVPs
    User.hasMany(models.RSVP, {
      foreignKey: 'userId',
      as: 'rsvps'
    });
    
    // User has many Comments
    User.hasMany(models.Comment, {
      foreignKey: 'userId',
      as: 'comments'
    });
    
    // User has many WellnessTrackings
    User.hasMany(models.WellnessTracking, {
      foreignKey: 'userId',
      as: 'wellnessTrackings'
    });
    
    // User can be in many support chat rooms
    User.belongsToMany(models.SupportRoom, {
      through: 'UserRooms',
      foreignKey: 'userId',
      as: 'supportRooms'
    });
  };

  return User;
};