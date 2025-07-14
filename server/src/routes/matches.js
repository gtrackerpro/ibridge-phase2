const express = require('express');
const Match = require('../models/Match');
const EmployeeProfile = require('../models/EmployeeProfile');
const Demand = require('../models/Demand');
const { auth, authorize } = require('../middleware/auth');
const { generateMatches, analyzeSkillGaps, getEmployeeRecommendations } = require('../services/matchingService');
const { validateObjectIdParam, validateObjectIdBody, isValidObjectId } = require('../utils/objectIdValidator');

const router = express.Router();

// Generate matches for a specific demand
router.post('/generate', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const { demandId } = req.body;

    if (!demandId) {
      return res.status(400).json({ message: 'Demand ID is required' });
    }

    // Validate demandId format
    if (!isValidObjectId(demandId)) {
      return res.status(400).json({ message: 'Invalid demand ID format' });
    }

    // Check if demand exists
    const demand = await Demand.findById(demandId);
    if (!demand) {
      return res.status(404).json({ message: 'Demand not found' });
    }

    // Check if RM can generate matches for this demand
    if (req.user.role === 'RM' && demand.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate matches using AI matching service
    const matches = await generateMatches(demandId);

    res.json({
      message: 'Matches generated successfully',
      matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Generate matches error:', error);
    res.status(500).json({ 
      message: 'Failed to generate matches', 
      error: error.message 
    });
  }
});

// Get all matches
router.get('/results', auth, async (req, res) => {
  try {
    let query = {};
    
    // If user is RM, they can only see matches for demands they created
    if (req.user.role === 'RM') {
      const userDemands = await Demand.find({ createdBy: req.user._id }).select('_id');
      const demandIds = userDemands.map(d => d._id);
      query.demandId = { $in: demandIds };
    }
    // If user is Employee, they can only see matches where they are the employee
    else if (req.user.role === 'Employee') {
      const employee = await EmployeeProfile.findOne({ email: req.user.email });
      if (employee) {
        query.employeeId = employee._id;
      } else {
        // If no employee profile found, return empty results
        return res.json({
          message: 'No employee profile found',
          matches: [],
          count: 0
        });
      }
    }

    const matches = await Match.find(query)
      .populate('demandId', 'demandId accountName projectName positionTitle primarySkill')
      .populate('employeeId', 'employeeId name email primarySkill primarySkillExperience')
      .populate('reviewedBy', 'name email')
      .sort({ matchScore: -1, createdAt: -1 });

    res.json({
      message: 'Match results retrieved successfully',
      matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Get match results error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve match results', 
      error: error.message 
    });
  }
});

// Get matches for a specific demand
router.get('/demand/:demandId', auth, async (req, res) => {
  try {
const { demandId } = req.params;

    // Validate demandId
    if (!isValidObjectId(demandId)) {
      return res.status(400).json({ message: 'Invalid demand ID format' });
    }
    
    // Check if demand exists and user has access
    const demand = await Demand.findById(demandId);
    if (!demand) {
      return res.status(404).json({ message: 'Demand not found' });
    }

    if (req.user.role === 'RM' && demand.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const matches = await Match.find({ demandId })
      .populate('employeeId', 'employeeId name email primarySkill primarySkillExperience secondarySkills')
      .populate('reviewedBy', 'name email')
      .sort({ matchScore: -1 });

    res.json({
      message: 'Matches for demand retrieved successfully',
      matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Get matches for demand error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve matches for demand', 
      error: error.message 
    });
  }
});

// Get matches for a specific employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate employeeId
    if (!isValidObjectId(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }

    // Check if employee exists
    const employee = await EmployeeProfile.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if user can access this employee's matches
    if (req.user.role === 'Employee' && employee.email !== req.user.email) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const matches = await Match.find({ employeeId })
      .populate('demandId', 'demandId accountName projectName positionTitle primarySkill experienceRange')
      .populate('reviewedBy', 'name email')
      .sort({ matchScore: -1, createdAt: -1 });

    res.json({
      message: 'Matches for employee retrieved successfully',
      matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Get matches for employee error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve matches for employee', 
      error: error.message 
    });
  }
});

// Get skill gap analysis
router.get('/skill-gaps', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const skillGaps = await analyzeSkillGaps();

    res.json({
      message: 'Skill gap analysis completed successfully',
      skillGaps,
      count: skillGaps.length
    });
  } catch (error) {
    console.error('Skill gap analysis error:', error);
    res.status(500).json({ 
      message: 'Failed to analyze skill gaps', 
      error: error.message 
    });
  }
});

// Get employee recommendations
router.get('/recommendations/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate employeeId
    if (!isValidObjectId(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }

    // Check if employee exists
    const employee = await EmployeeProfile.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if user can access this employee's recommendations
    if (req.user.role === 'Employee' && employee.email !== req.user.email) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const recommendations = await getEmployeeRecommendations(employeeId);

    res.json({
      message: 'Employee recommendations retrieved successfully',
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Get employee recommendations error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve employee recommendations', 
      error: error.message 
    });
  }
});

// Update match status
router.put('/:id/status', auth, authorize('Admin', 'RM'), validateObjectIdParam('id'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const match = await Match.findById(req.params.id)
      .populate('demandId');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Check if RM can update this match
    if (req.user.role === 'RM' && match.demandId.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        notes,
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true, runValidators: true }
    )
    .populate('demandId', 'demandId accountName projectName positionTitle')
    .populate('employeeId', 'employeeId name email primarySkill')
    .populate('reviewedBy', 'name email');

    res.json({
      message: 'Match status updated successfully',
      match: updatedMatch
    });
  } catch (error) {
    console.error('Update match status error:', error);
    res.status(500).json({ 
      message: 'Failed to update match status', 
      error: error.message 
    });
  }
});

// Get match statistics
router.get('/stats', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    let matchQuery = {};
    
    // If user is RM, only show stats for their demands
    if (req.user.role === 'RM') {
      const userDemands = await Demand.find({ createdBy: req.user._id }).select('_id');
      const demandIds = userDemands.map(d => d._id);
      matchQuery.demandId = { $in: demandIds };
    }

    const stats = await Match.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalMatches: { $sum: 1 },
          exactMatches: { $sum: { $cond: [{ $eq: ['$matchType', 'Exact'] }, 1, 0] } },
          nearMatches: { $sum: { $cond: [{ $eq: ['$matchType', 'Near'] }, 1, 0] } },
          notEligibleMatches: { $sum: { $cond: [{ $eq: ['$matchType', 'Not Eligible'] }, 1, 0] } },
          averageScore: { $avg: '$matchScore' },
          approvedMatches: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          pendingMatches: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          trainingRequiredMatches: { $sum: { $cond: [{ $eq: ['$status', 'Training Required'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalMatches: 0,
      exactMatches: 0,
      nearMatches: 0,
      notEligibleMatches: 0,
      averageScore: 0,
      approvedMatches: 0,
      pendingMatches: 0,
      trainingRequiredMatches: 0
    };

    res.json({
      message: 'Match statistics retrieved successfully',
      stats: result
    });
  } catch (error) {
    console.error('Get match stats error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve match statistics', 
      error: error.message 
    });
  }
});

module.exports = router;