const express = require('express');
const EmployeeProfile = require('../models/EmployeeProfile');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { validateEmployeeProfileMiddleware, sanitizeInputMiddleware } = require('../middleware/validation');
const { validateObjectIdParam, isValidObjectId } = require('../utils/objectIdValidator');

const router = express.Router();

// Get all employees (Admin and RM can see all, Employee can see only their own)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // If user is Employee, they can only see their own profile
    if (req.user.role === 'Employee') {
      query.email = req.user.email;
    }

    const employees = await EmployeeProfile.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Employees retrieved successfully',
      employees,
      count: employees.length
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve employees', 
      error: error.message 
    });
  }
});

// Get employee by ID
router.get('/:id', auth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const employee = await EmployeeProfile.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if user can access this employee profile
    if (req.user.role === 'Employee' && employee.email !== req.user.email) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      message: 'Employee retrieved successfully',
      employee
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve employee', 
      error: error.message 
    });
  }
});

// Create new employee profile
router.post('/', auth, authorize('Admin', 'RM'), sanitizeInputMiddleware, validateEmployeeProfileMiddleware, async (req, res) => {
  try {
    const employeeData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate managerUser if provided
    if (employeeData.managerUser) {
      if (!isValidObjectId(employeeData.managerUser)) {
        return res.status(400).json({ message: 'Invalid manager user ID format' });
      }
      
      const manager = await User.findById(employeeData.managerUser);
      if (!manager) {
        return res.status(400).json({ message: 'Manager user not found' });
      }
      
      if (manager.role !== 'Manager') {
        return res.status(400).json({ message: 'Assigned user must have Manager role' });
      }
    }
    const employee = new EmployeeProfile(employeeData);
    await employee.save();

    // Check if a user account already exists for this employee
    const existingUser = await User.findOne({ email: employee.email });
    
    // If no user account exists, create one with default password
    if (!existingUser) {
      try {
        const defaultPassword = "Wel@come@123";
        const newUser = new User({
          name: employee.name,
          email: employee.email,
          passwordHash: defaultPassword, // Will be hashed by the pre-save hook
          role: 'Employee',
          isActive: true
        });
        
        await newUser.save();
        console.log(`User account created for employee: ${employee.email}`);
      } catch (userError) {
        console.error('Error creating user account for employee:', userError);
        // Continue with the response even if user creation fails
        // We don't want to roll back the employee profile creation
      }
    }

    const populatedEmployee = await EmployeeProfile.findById(employee._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Employee profile created successfully',
      employee: populatedEmployee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Employee ID already exists' 
      });
    }
    res.status(500).json({ 
      message: 'Failed to create employee profile', 
      error: error.message 
    });
  }
});

// Update employee profile
router.put('/:id', auth, validateObjectIdParam('id'), sanitizeInputMiddleware, async (req, res) => {
  try {

    const employee = await EmployeeProfile.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check permissions
    if (req.user.role === 'Employee' && employee.email !== req.user.email) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate managerUser if being updated
    if (req.body.managerUser) {
      if (!isValidObjectId(req.body.managerUser)) {
        return res.status(400).json({ message: 'Invalid manager user ID format' });
      }
      
      const manager = await User.findById(req.body.managerUser);
      if (!manager) {
        return res.status(400).json({ message: 'Manager user not found' });
      }
      
      if (manager.role !== 'Manager') {
        return res.status(400).json({ message: 'Assigned user must have Manager role' });
      }
    }
    // Validate update data if provided
    if (Object.keys(req.body).length > 0) {
      const { validateEmployeeProfile } = require('../utils/validation');
      const validation = validateEmployeeProfile({ ...employee.toObject(), ...req.body });
      
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: validation.errors
        });
      }
    }

    const updatedEmployee = await EmployeeProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      message: 'Employee profile updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ 
      message: 'Failed to update employee profile', 
      error: error.message 
    });
  }
});

// Delete employee profile
router.delete('/:id', auth, authorize('Admin'), validateObjectIdParam('id'), async (req, res) => {
  try {
    const employee = await EmployeeProfile.findByIdAndDelete(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      message: 'Employee profile deleted successfully',
      employee
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ 
      message: 'Failed to delete employee profile', 
      error: error.message 
    });
  }
});

// Search employees by skills
router.get('/search/skills', auth, authorize('Admin', 'RM'), sanitizeInputMiddleware, async (req, res) => {
  try {
    const { skill, minExperience, status } = req.query;
    
    // Validate query parameters
    if (minExperience && (isNaN(minExperience) || parseInt(minExperience) < 0)) {
      return res.status(400).json({
        message: 'Minimum experience must be a non-negative number'
      });
    }
    
    if (status && !['Available', 'Allocated', 'On Leave', 'Training'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Must be one of: Available, Allocated, On Leave, Training'
      });
    }
    
    let query = {};
    
    if (skill) {
      query.$or = [
        { primarySkill: new RegExp(skill, 'i') },
        { 'secondarySkills.skill': new RegExp(skill, 'i') }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const employees = await EmployeeProfile.find(query)
      .populate('createdBy', 'name email');

    // Filter by minimum experience if provided
    let filteredEmployees = employees;
    if (minExperience) {
      filteredEmployees = employees.filter(emp => {
        if (emp.primarySkill.toLowerCase().includes(skill.toLowerCase())) {
          return emp.primarySkillExperience >= parseInt(minExperience);
        }
        return emp.secondarySkills.some(sec => 
          sec.skill.toLowerCase().includes(skill.toLowerCase()) && 
          sec.experience >= parseInt(minExperience)
        );
      });
    }

    res.json({
      message: 'Employee search completed',
      employees: filteredEmployees,
      count: filteredEmployees.length
    });
  } catch (error) {
    console.error('Search employees error:', error);
    res.status(500).json({ 
      message: 'Failed to search employees', 
      error: error.message 
    });
  }
});

// Get managers list (for assignment dropdown)
router.get('/managers/list', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const managers = await User.find({ 
      role: 'Manager', 
      isActive: true 
    res.json({
      message: 'Managers retrieved successfully',
      managers,
      count: managers.length
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve managers', 
      error: error.message 
    });
  }
});
    }).select('_id name email').sort({ name: 1 });
module.exports = router;