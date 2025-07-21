const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { validateObjectIdParam } = require('../utils/objectIdValidator');

const router = express.Router();

// Get notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const { isRead, limit = 50, page = 1 } = req.query;
    
    let query = { recipient: req.user._id };
    
    // Filter by read status if specified
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    
    // Only get non-expired notifications
    query.expiresAt = { $gt: new Date() };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(query)
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      message: 'Notifications retrieved successfully',
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve notifications', 
      error: error.message 
    });
  }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      message: 'Unread count retrieved successfully',
      unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve unread count', 
      error: error.message 
    });
  }
});

// Mark notification as read
router.put('/:id/read', auth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify that the notification belongs to the current user
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ 
      message: 'Failed to mark notification as read', 
      error: error.message 
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ 
      message: 'Failed to mark all notifications as read', 
      error: error.message 
    });
  }
});

// Delete notification
router.delete('/:id', auth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify that the notification belongs to the current user
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Notification deleted successfully',
      notification
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      message: 'Failed to delete notification', 
      error: error.message 
    });
  }
});

// Create notification (Admin/RM only - for manual notifications)
router.post('/', auth, async (req, res) => {
  try {
    // Only allow Admins and RMs to create manual notifications
    if (!['Admin', 'RM'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { recipient, type, title, message, link, priority } = req.body;

    // Basic validation
    if (!recipient || !type || !title || !message) {
      return res.status(400).json({ 
        message: 'Recipient, type, title, and message are required' 
      });
    }

    const notification = await Notification.createNotification({
      recipient,
      sender: req.user._id,
      type,
      title,
      message,
      link,
      priority: priority || 'Medium'
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email');

    res.status(201).json({
      message: 'Notification created successfully',
      notification: populatedNotification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ 
      message: 'Failed to create notification', 
      error: error.message 
    });
  }
});

module.exports = router;