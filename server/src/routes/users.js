const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { validateUserRegistrationMiddleware, sanitizeInputMiddleware } = require('../middleware/validation');
const { validateObjectIdParam } = require('../utils/objectIdValidator');

const router = express.Router();

// Get all users (Admin only)
router.get('/', auth, authorize('Admin'), async (req, res) => {
  try {
    const { search, role, status } = req.query;
    
    let query = {};
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { email: { $regex: new RegExp(search, 'i') } }
      ];
    }
    
    // Filter by role
    if (role && ['Admin', 'RM', 'Employee'].includes(role)) {
      query.role = role;
    }
    
    // Filter by active status
    if (status) {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Users retrieved successfully',
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve users', 
      error: error.message 
    });
  }
});

// Get user by ID (Admin only)
router.get('/:id', auth, authorize('Admin'), validateObjectIdParam('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve user', 
      error: error.message 
    });
  }
});

// Create new user (Admin only)
router.post('/', auth, authorize('Admin'), sanitizeInputMiddleware, validateUserRegistrationMiddleware, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      passwordHash: password,
      role: role || 'Employee'
    });

    await user.save();

    // Return user without password
    const userResponse = await User.findById(user._id).select('-passwordHash');

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      message: 'Failed to create user', 
      error: error.message 
    });
  }
});

// Update user (Admin only)
router.put('/:id', auth, authorize('Admin'), validateObjectIdParam('id'), sanitizeInputMiddleware, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === req.params.id && isActive === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    // Validate email uniqueness if email is being changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Validate role
    if (role && !['Admin', 'RM', 'Manager', 'Employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be one of: Admin, RM, Manager, Employee' });
    }

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      message: 'Failed to update user', 
      error: error.message 
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', auth, authorize('Admin'), validateObjectIdParam('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: 'User deleted successfully',
      user: { ...user.toObject(), passwordHash: undefined }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      message: 'Failed to delete user', 
      error: error.message 
    });
  }
});

// Toggle user active status (Admin only)
router.patch('/:id/toggle-status', auth, authorize('Admin'), validateObjectIdParam('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === req.params.id && user.isActive) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: !user.isActive },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ 
      message: 'Failed to toggle user status', 
      error: error.message 
    });
  }
});

// Get user statistics (Admin only)
router.get('/stats/overview', auth, authorize('Admin'), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveUsers: { $sum: { $cond: ['$isActive', 0, 1] } },
          adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'Admin'] }, 1, 0] } },
          rmUsers: { $sum: { $cond: [{ $eq: ['$role', 'RM'] }, 1, 0] } },
          employeeUsers: { $sum: { $cond: [{ $eq: ['$role', 'Employee'] }, 1, 0] } },
          managerUsers: { $sum: { $cond: [{ $eq: ['$role', 'Manager'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      adminUsers: 0,
      rmUsers: 0,
      employeeUsers: 0,
      managerUsers: 0
    };

    res.json({
      message: 'User statistics retrieved successfully',
      stats: result
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve user statistics', 
      error: error.message 
    });
  }
});

module.exports = router;