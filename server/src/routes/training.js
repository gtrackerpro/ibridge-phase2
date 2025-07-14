const express = require('express');
const TrainingPlan = require('../models/TrainingPlan');
const EmployeeProfile = require('../models/EmployeeProfile');
const Match = require('../models/Match');
const { generateTrainingPlanResources } = require('../services/trainingRecommendationService');
const { auth, authorize } = require('../middleware/auth');
const { validateTrainingPlanMiddleware, sanitizeInputMiddleware } = require('../middleware/validation');
const { validateObjectIdParam, isValidObjectId } = require('../utils/objectIdValidator');

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

// Get training plan by ID
router.get('/:id', auth, validateObjectIdParam('id'), async (req, res) => {
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
router.post('/', auth, authorize('Admin', 'RM'), sanitizeInputMiddleware, validateTrainingPlanMiddleware, async (req, res) => {
  try {
    // Validate that employee exists
    const employee = await EmployeeProfile.findById(req.body.employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

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
router.put('/:id', auth, validateObjectIdParam('id'), sanitizeInputMiddleware, async (req, res) => {
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
          // Validate progress
          if (field === 'progress') {
            const progress = Number(req.body[field]);
            if (isNaN(progress) || progress < 0 || progress > 100) {
              return res.status(400).json({
                message: 'Progress must be a number between 0 and 100'
              });
            }
            updateData[field] = progress;
          }
          // Validate status
          else if (field === 'status') {
            if (!['Assigned', 'In Progress', 'Completed', 'On Hold'].includes(req.body[field])) {
              return res.status(400).json({
                message: 'Invalid status. Must be one of: Assigned, In Progress, Completed, On Hold'
              });
            }
            updateData[field] = req.body[field];
          }
          else {
            updateData[field] = req.body[field];
          }
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
router.delete('/:id', auth, authorize('Admin', 'RM'), validateObjectIdParam('id'), async (req, res) => {
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
router.post('/generate-from-match', auth, authorize('Admin', 'RM'), sanitizeInputMiddleware, async (req, res) => {
  try {
    const { matchId } = req.body;

    // Validate matchId
    if (!matchId) {
      return res.status(400).json({ message: 'Match ID is required' });
    }

    if (!isValidObjectId(matchId)) {
      return res.status(400).json({ message: 'Invalid match ID format' });
    }

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

    // Generate dynamic resource links using the training recommendation service
    const resourceLinks = await generateTrainingPlanResources(skillsToTrain);

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

// Update training plan progress (enhanced for employee self-updates)
router.put('/:id/progress', auth, validateObjectIdParam('id'), sanitizeInputMiddleware, async (req, res) => {
  try {
    const { progress, status, notes } = req.body;
    
    // Validate progress
    if (progress !== undefined && (isNaN(progress) || progress < 0 || progress > 100)) {
      return res.status(400).json({
        message: 'Progress must be a number between 0 and 100'
      });
    }
    
    // Validate status
    if (status && !['Assigned', 'In Progress', 'Completed', 'On Hold'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Must be one of: Assigned, In Progress, Completed, On Hold'
      });
    }

    const trainingPlan = await TrainingPlan.findById(req.params.id)
      .populate('employeeId', 'email');

    if (!trainingPlan) {
      return res.status(404).json({ message: 'Training plan not found' });
    }

    // Check permissions - employees can only update their own plans
    if (req.user.role === 'Employee') {
      if (trainingPlan.employeeId.email !== req.user.email) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const updateData = {};
    if (progress !== undefined) updateData.progress = progress;
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    
    // Auto-complete if progress reaches 100%
    if (progress === 100 && status !== 'Completed') {
      updateData.status = 'Completed';
      updateData.actualCompletionDate = new Date();
    }

    const updatedTrainingPlan = await TrainingPlan.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('employeeId', 'employeeId name email primarySkill')
    .populate('demandId', 'demandId accountName projectName positionTitle')
    .populate('assignedBy', 'name email');

    res.json({
      message: 'Training plan progress updated successfully',
      trainingPlan: updatedTrainingPlan
    });
  } catch (error) {
    console.error('Update training plan progress error:', error);
    res.status(500).json({ 
      message: 'Failed to update training plan progress', 
      error: error.message 
    });
  }
});

// Get training plan recommendations for skill gaps
router.get('/recommendations/skill-gaps', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const { analyzeSkillGaps } = require('../services/matchingService');
    const { getSkillGapRecommendations } = require('../services/trainingRecommendationService');
    
    const skillGaps = await analyzeSkillGaps();
    const recommendations = await getSkillGapRecommendations(skillGaps);

    res.json({
      message: 'Training recommendations for skill gaps retrieved successfully',
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Get skill gap recommendations error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve skill gap recommendations', 
      error: error.message 
    });
  }
});


module.exports = router;