const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  type: {
    type: String,
    enum: [
      'match_approval_request',
      'match_approved', 
      'match_rejected',
      'training_assigned',
      'training_completed',
      'demand_created',
      'system_notification'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  link: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^\/[a-zA-Z0-9\-_\/]*(\?[a-zA-Z0-9\-_=&]*)?$/.test(v);
      },
      message: 'Link must be a valid internal application path'
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Match', 'TrainingPlan', 'Demand', 'EmployeeProfile', 'User'],
      required: function() {
        return this.relatedEntity && this.relatedEntity.entityId;
      }
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function() {
        return this.relatedEntity && this.relatedEntity.entityType;
      }
    }
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Mark notification as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    return await this.countDocuments({ 
      recipient: userId, 
      isRead: false,
      expiresAt: { $gt: new Date() }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  try {
    return await this.updateMany(
      { recipient: userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);