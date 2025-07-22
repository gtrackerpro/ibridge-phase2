const express = require('express');
const Match = require('../models/Match');
const EmployeeProfile = require('../models/EmployeeProfile');
const Demand = require('../models/Demand');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const { 
  generateMatches, 
  analyzeSkillGaps, 
  getEmployeeRecommendations,
  semanticMatchingService 
} = require('../services/matchingService');
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

    // For each match, set up approval workflow if needed
    for (const match of matches) {
      if (match.matchType === 'Exact' || match.matchType === 'Near') {
        try {
          // Find the employee's manager
          const employee = await EmployeeProfile.findById(match.employeeId).populate('managerUser');
          
          if (employee && employee.managerUser) {
            // Set approval status and approver
            match.approvalStatus = 'Pending';
            match.approverUser = employee.managerUser._id;
            await match.save();
            
            // Create notification for the manager
            await Notification.createNotification({
              recipient: employee.managerUser._id,
              sender: req.user._id,
              type: 'match_approval_request',
              title: 'New Match Approval Required',
              message: `A new match for ${employee.name} requires your approval for position: ${demand.positionTitle}`,
              link: `/matches?showDetails=${match._id}`,
              relatedEntity: {
                entityType: 'Match',
                entityId: match._id
              },
              priority: 'High'
            });
          }
        } catch (notificationError) {
          console.error('Error setting up approval workflow:', notificationError);
          // Continue with other matches even if one fails
        }
      }
    }

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
      .populate('employeeId', 'employeeId name email primarySkill primarySkillExperience secondarySkills')
     .populate('approverUser', 'name email')
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
     .populate('demandId', 'demandId accountName projectName positionTitle primarySkill experienceRange priority status')
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
     .populate('approverUser', 'name email')
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
   .populate('approverUser', 'name email')
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

// Approve or decline match (Manager only)
router.put('/:id/approve-decline', auth, authorize('Manager'), validateObjectIdParam('id'), async (req, res) => {
  try {
    const { approvalStatus, notes } = req.body;
    
    // Validate approval status
    if (!['Approved', 'Rejected'].includes(approvalStatus)) {
      return res.status(400).json({ 
        message: 'Invalid approval status. Must be Approved or Rejected' 
      });
    }
    
    const match = await Match.findById(req.params.id)
      .populate('demandId', 'demandId accountName projectName positionTitle createdBy')
      .populate('employeeId', 'employeeId name email');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Verify that the current user is the designated approver
    if (!match.approverUser || match.approverUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'You are not authorized to approve this match' 
      });
    }

    // Verify that the match is in pending status
    if (match.approvalStatus !== 'Pending') {
      return res.status(400).json({ 
        message: 'This match has already been reviewed' 
      });
    }

    // Update match status
    match.approvalStatus = approvalStatus;
    match.reviewedBy = req.user._id;
    match.reviewedAt = new Date();
    
    if (notes) {
      match.notes = notes;
    }
    
    // Update overall status based on approval
    if (approvalStatus === 'Approved') {
      match.status = 'Approved';
    } else {
      match.status = 'Rejected';
    }
    
    await match.save();

    // Create notifications for RM and Employee
    const notificationPromises = [];
    
    // Notify the RM who created the demand
    if (match.demandId.createdBy) {
      notificationPromises.push(
        Notification.createNotification({
          recipient: match.demandId.createdBy,
          sender: req.user._id,
          type: approvalStatus === 'Approved' ? 'match_approved' : 'match_rejected',
          title: `Match ${approvalStatus}`,
          message: `Your match for ${match.employeeId.name} has been ${approvalStatus.toLowerCase()} for position: ${match.demandId.positionTitle}${notes ? '. Notes: ' + notes : ''}`,
          link: `/matches?showDetails=${match._id}`,
          relatedEntity: {
            entityType: 'Match',
            entityId: match._id
          },
          priority: 'Medium'
        })
      );
    }
    
    // Notify the employee
    const employee = await EmployeeProfile.findById(match.employeeId);
    if (employee) {
      const employeeUser = await User.findOne({ email: employee.email });
      if (employeeUser) {
        notificationPromises.push(
          Notification.createNotification({
            recipient: employeeUser._id,
            sender: req.user._id,
            type: approvalStatus === 'Approved' ? 'match_approved' : 'match_rejected',
            title: `Project Assignment ${approvalStatus}`,
            message: `Your assignment to ${match.demandId.positionTitle} has been ${approvalStatus.toLowerCase()}${notes ? '. Notes: ' + notes : ''}`,
            link: `/matches`,
            relatedEntity: {
              entityType: 'Match',
              entityId: match._id
            },
            priority: 'High'
          })
        );
      }
    }
    
    // Send all notifications
    await Promise.all(notificationPromises);

    const updatedMatch = await Match.findById(match._id)
      .populate('demandId', 'demandId accountName projectName positionTitle')
      .populate('employeeId', 'employeeId name email primarySkill')
      .populate('approverUser', 'name email')
      .populate('reviewedBy', 'name email');

    res.json({
      message: `Match ${approvalStatus.toLowerCase()} successfully`,
      match: updatedMatch
    });
  } catch (error) {
    console.error('Approve/decline match error:', error);
    res.status(500).json({ 
      message: 'Failed to process match approval', 
      error: error.message 
    });
  }
});

// Get pending approvals for manager
router.get('/pending-approvals', auth, authorize('Manager'), async (req, res) => {
  try {
    const pendingMatches = await Match.find({
      approverUser: req.user._id,
      approvalStatus: 'Pending'
    })
    .populate('demandId', 'demandId accountName projectName positionTitle priority startDate')
    .populate('employeeId', 'employeeId name email primarySkill primarySkillExperience')
   .populate('approverUser', 'name email')
    .sort({ createdAt: -1 });

    res.json({
      message: 'Pending approvals retrieved successfully',
      matches: pendingMatches,
      count: pendingMatches.length
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve pending approvals', 
      error: error.message 
    });
  }
});

// Get allocations for manager's direct reports
router.get('/my-reports-allocations', auth, authorize('Manager'), async (req, res) => {
  try {
    // Find all employees managed by this manager
    const managedEmployees = await EmployeeProfile.find({
      managerUser: req.user._id
    }).select('_id');

    const employeeIds = managedEmployees.map(emp => emp._id);

    // Find all matches for these employees
    const allocations = await Match.find({
      employeeId: { $in: employeeIds }
    })
    .populate('demandId', 'demandId accountName projectName positionTitle priority startDate endDate')
    .populate('employeeId', 'employeeId name email primarySkill status')
   .populate('approverUser', 'name email')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

    res.json({
      message: 'Team allocations retrieved successfully',
      matches: allocations,
      count: allocations.length
    });
  } catch (error) {
    console.error('Get team allocations error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve team allocations', 
      error: error.message 
    });
  }
});

// Get approval statistics for manager
router.get('/approval-stats', auth, authorize('Manager'), async (req, res) => {
  try {
    const stats = await Match.aggregate([
      { 
        $match: { 
          approverUser: req.user._id 
        } 
      },
      {
        $group: {
          _id: null,
          totalMatches: { $sum: 1 },
          pendingApprovals: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Pending'] }, 1, 0] } },
          approvedMatches: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Approved'] }, 1, 0] } },
          rejectedMatches: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'Rejected'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalMatches: 0,
      pendingApprovals: 0,
      approvedMatches: 0,
      rejectedMatches: 0
    };

    res.json({
      message: 'Approval statistics retrieved successfully',
      stats: result
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve approval statistics', 
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

// Get semantic skill similarity
router.post('/semantic-similarity', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const { skill1, skill2 } = req.body;

    if (!skill1 || !skill2) {
      return res.status(400).json({ message: 'Both skills are required' });
    }

    const similarity = await semanticMatchingService.calculateSemanticSimilarity(skill1, skill2);

    res.json({
      message: 'Semantic similarity calculated successfully',
      skill1,
      skill2,
      similarity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Semantic similarity error:', error);
    res.status(500).json({ 
      message: 'Failed to calculate semantic similarity', 
      error: error.message 
    });
  }
});

// Find similar skills
router.post('/find-similar-skills', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const { targetSkill, skillList } = req.body;

    if (!targetSkill || !Array.isArray(skillList)) {
      return res.status(400).json({ message: 'Target skill and skill list are required' });
    }

    const similarSkills = await semanticMatchingService.findSimilarSkills(targetSkill, skillList);

    res.json({
      message: 'Similar skills found successfully',
      targetSkill,
      similarSkills
    });
  } catch (error) {
    console.error('Find similar skills error:', error);
    res.status(500).json({ 
      message: 'Failed to find similar skills', 
      error: error.message 
    });
  }
});

module.exports = router;