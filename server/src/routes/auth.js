const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateUserRegistrationMiddleware, sanitizeInputMiddleware } = require('../middleware/validation');
const { authLimiter, validatePasswordStrength, validateInput } = require('../middleware/security');

const router = express.Router();

// Register
router.post('/register', authLimiter, validateInput, sanitizeInputMiddleware, validateUserRegistrationMiddleware, validatePasswordStrength, async (req, res) => {
  try {
    console.log('Registration request received:', {
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
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

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed', 
      error: error.message 
    });
  }
});

// Login
router.post('/login', authLimiter, validateInput, sanitizeInputMiddleware, async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email, timestamp: new Date().toISOString() });
    
    const { email, password } = req.body;

    // Basic validation for login
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();
    console.log('Searching for user:', sanitizedEmail);

    // Find user by email with error handling
    let user;
    try {
      user = await User.findOne({ email: sanitizedEmail });
    } catch (dbError) {
      console.error('Database error during user lookup:', dbError);
      return res.status(500).json({ 
        message: 'Database connection error. Please try again.' 
      });
    }

    if (!user) {
      console.log('Login failed: User not found for email:', sanitizedEmail);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('User found:', { id: user._id, email: user.email, role: user.role, isActive: user.isActive });

    // Check if account is active
    if (!user.isActive) {
      console.log('Login failed: Account deactivated for user:', user.email);
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password with error handling
    let isPasswordValid;
    try {
      isPasswordValid = await user.comparePassword(password);
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError);
      return res.status(500).json({ 
        message: 'Authentication error. Please try again.' 
      });
    }

    if (!isPasswordValid) {
      console.log('Login failed: Invalid password for user:', user.email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login with error handling
    try {
      user.lastLogin = new Date();
      await user.save();
      console.log('Last login updated for user:', user.email);
    } catch (saveError) {
      console.error('Error updating last login:', saveError);
      // Continue with login even if last login update fails
    }

    // Generate JWT token with error handling
    let token;
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
      }
      
      token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
    } catch (tokenError) {
      console.error('JWT token generation error:', tokenError);
      return res.status(500).json({ 
        message: 'Authentication token generation failed. Please try again.' 
      });
    }

    console.log('Login successful for user:', { 
      id: user._id, 
      email: user.email, 
      role: user.role,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Unexpected login error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Ensure we always send a response
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Internal server error. Please try again later.'
      });
    }
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch profile', 
      error: error.message 
    });
  }
});

// Update user profile
router.put('/profile', auth, sanitizeInputMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Name is required'
      });
    }
    
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        message: 'Name must be between 2 and 100 characters'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      message: 'Failed to update profile', 
      error: error.message 
    });
  }
});

// Change password
router.put('/change-password', auth, sanitizeInputMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Current password, new password, and confirmation are required'
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'New password and confirmation do not match'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long'
      });
    }
    
    if (newPassword.length > 128) {
      return res.status(400).json({
        message: 'New password cannot exceed 128 characters'
      });
    }
    
    // Get user with password hash
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }
    
    // Check if new password is different from current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        message: 'New password must be different from current password'
      });
    }
    
    // Update password
    user.passwordHash = newPassword;
    await user.save();
    
    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Failed to change password', 
      error: error.message 
    });
  }
});
module.exports = router;