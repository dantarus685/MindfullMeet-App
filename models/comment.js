// models/comment.js
module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    parentCommentId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'comments',
    indexes: [
      {
        fields: ['eventId', 'createdAt']
      }
    ]
  });

  Comment.associate = function(models) {
    // Comment belongs to a User
    Comment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // Comment belongs to an Event
    Comment.belongsTo(models.Event, {
      foreignKey: 'eventId',
      as: 'event'
    });
    
    // Comment may belong to a parent Comment
    Comment.belongsTo(models.Comment, {
      foreignKey: 'parentCommentId',
      as: 'parentComment'
    });
    
    // Comment has many replies (child Comments)
    Comment.hasMany(models.Comment, {
      foreignKey: 'parentCommentId',
      as: 'replies'
    });
  };

  return Comment;
};