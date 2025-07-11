const express = require('express');
const TrainingPlan = require('../models/TrainingPlan');
const EmployeeProfile = require('../models/EmployeeProfile');
const Match = require('../models/Match');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all training plans
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // If user is Employee, they can only see their own training plans
    if (req.user.role === 'Employee') {
      const employee = await EmployeeProfile.findOne({ email: req.user.email });
      if (employee) {
        query.employeeId = employee._id;
      }
    }

    const trainingPlans = await TrainingPlan.find(query)
      .populate('employeeId', 'employeeId name email primarySkill')
      .populate('demandId', 'demandId accountName projectName positionTitle')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Training plans retrieved successfully',
      trainingPlans,
      count: trainingPlans.length
    });
  } catch (error) {
    console.error('Get training plans error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve training plans', 
      error: error.message 
    });
  }
});

// Get training plan by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const trainingPlan = await TrainingPlan.findById(req.params.id)
      .populate('employeeId', 'employeeId name email primarySkill')
      .populate('demandId', 'demandId accountName projectName positionTitle')
      .populate('assignedBy', 'name email');

    if (!trainingPlan) {
      return res.status(404).json({ message: 'Training plan not found' });
    }

    // Check if user can access this training plan
    if (req.user.role === 'Employee') {
      const employee = await EmployeeProfile.findOne({ email: req.user.email });
      if (!employee || trainingPlan.employeeId._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({
      message: 'Training plan retrieved successfully',
      trainingPlan
    });
  } catch (error) {
    console.error('Get training plan error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve training plan', 
      error: error.message 
    });
  }
});

// Create new training plan
router.post('/', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const trainingPlanData = {
      ...req.body,
      assignedBy: req.user._id
    };

    const trainingPlan = new TrainingPlan(trainingPlanData);
    await trainingPlan.save();

    const populatedTrainingPlan = await TrainingPlan.findById(trainingPlan._id)
      .populate('employeeId', 'employeeId name email primarySkill')
      .populate('demandId', 'demandId accountName projectName positionTitle')
      .populate('assignedBy', 'name email');

    res.status(201).json({
      message: 'Training plan created successfully',
      trainingPlan: populatedTrainingPlan
    });
  } catch (error) {
    console.error('Create training plan error:', error);
    res.status(500).json({ 
      message: 'Failed to create training plan', 
      error: error.message 
    });
  }
});

// Update training plan
router.put('/:id', auth, async (req, res) => {
  try {
    const trainingPlan = await TrainingPlan.findById(req.params.id);
    
    if (!trainingPlan) {
      return res.status(404).json({ message: 'Training plan not found' });
    }

    // Check permissions
    if (req.user.role === 'Employee') {
      const employee = await EmployeeProfile.findOne({ email: req.user.email });
      if (!employee || trainingPlan.employeeId.toString() !== employee._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      // Employees can only update progress and status
      const allowedFields = ['progress', 'status'];
      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      req.body = updateData;
    }

    const updatedTrainingPlan = await TrainingPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('employeeId', 'employeeId name email primarySkill')
    .populate('demandId', 'demandId accountName projectName positionTitle')
    .populate('assignedBy', 'name email');

    res.json({
      message: 'Training plan updated successfully',
      trainingPlan: updatedTrainingPlan
    });
  } catch (error) {
    console.error('Update training plan error:', error);
    res.status(500).json({ 
      message: 'Failed to update training plan', 
      error: error.message 
    });
  }
});

// Delete training plan
router.delete('/:id', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const trainingPlan = await TrainingPlan.findByIdAndDelete(req.params.id);
    
    if (!trainingPlan) {
      return res.status(404).json({ message: 'Training plan not found' });
    }

    res.json({
      message: 'Training plan deleted successfully',
      trainingPlan
    });
  } catch (error) {
    console.error('Delete training plan error:', error);
    res.status(500).json({ 
      message: 'Failed to delete training plan', 
      error: error.message 
    });
  }
});

// Generate training plan from match
router.post('/generate-from-match', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const { matchId } = req.body;

    const match = await Match.findById(matchId)
      .populate('demandId')
      .populate('employeeId');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.matchType === 'Exact') {
      return res.status(400).json({ message: 'No training needed for exact matches' });
    }

    // Create training plan based on missing skills
    const skillsToTrain = match.missingSkills.map(skill => ({
      skill,
      currentLevel: 0,
      targetLevel: match.demandId.experienceRange.min,
      priority: 'High'
    }));

    // Generate resource links (placeholder - in real implementation, this would be more sophisticated)
    const resourceLinks = match.missingSkills.map(skill => ({
      title: `${skill} Training Course`,
      url: `https://example-learning-platform.com/courses/${skill.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'Course',
      estimatedHours: 40
    }));

    const trainingPlan = new TrainingPlan({
      employeeId: match.employeeId._id,
      demandId: match.demandId._id,
      skillsToTrain,
      resourceLinks,
      status: 'Draft',
      assignedBy: req.user._id
    });

    await trainingPlan.save();

    const populatedTrainingPlan = await TrainingPlan.findById(trainingPlan._id)
      .populate('employeeId', 'employeeId name email primarySkill')
      .populate('demandId', 'demandId accountName projectName positionTitle')
      .populate('assignedBy', 'name email');

    res.status(201).json({
      message: 'Training plan generated successfully from match',
      trainingPlan: populatedTrainingPlan
    });
  } catch (error) {
    console.error('Generate training plan from match error:', error);
    res.status(500).json({ 
      message: 'Failed to generate training plan from match', 
      error: error.message 
    });
  }
});

// Get training statistics
router.get('/stats', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const stats = await TrainingPlan.aggregate([
      {
        $group: {
          _id: null,
          totalPlans: { $sum: 1 },
          draftPlans: { $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] } },
          assignedPlans: { $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] } },
          inProgressPlans: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
          completedPlans: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          averageProgress: { $avg: '$progress' }
        }
      }
    ]);

    const result = stats[0] || {
      totalPlans: 0,
      draftPlans: 0,
      assignedPlans: 0,
      inProgressPlans: 0,
      completedPlans: 0,
      averageProgress: 0
    };

    res.json({
      message: 'Training statistics retrieved successfully',
      stats: result
    });
  } catch (error) {
    console.error('Get training stats error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve training statistics', 
      error: error.message 
    });
  }
});

module.exports = router;