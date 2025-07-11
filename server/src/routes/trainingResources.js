const express = require('express');
const TrainingResource = require('../models/TrainingResource');
const { auth, authorize } = require('../middleware/auth');
const { sanitizeInputMiddleware } = require('../middleware/validation');

const router = express.Router();

// Get all training resources
router.get('/', auth, async (req, res) => {
  try {
    const { category, type, difficulty, skill } = req.query;
    
    let query = { isActive: true };
    
    if (category) query.category = category;
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;
    if (skill) {
      query.$or = [
        { associatedSkills: { $regex: new RegExp(skill, 'i') } },
        { keywords: { $regex: new RegExp(skill, 'i') } },
        { title: { $regex: new RegExp(skill, 'i') } }
      ];
    }

    const resources = await TrainingResource.find(query)
      .populate('createdBy', 'name email')
      .sort({ rating: -1, createdAt: -1 });

    res.json({
      message: 'Training resources retrieved successfully',
      resources,
      count: resources.length
    });
  } catch (error) {
    console.error('Get training resources error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve training resources', 
      error: error.message 
    });
  }
});

// Get training resource by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const resource = await TrainingResource.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!resource) {
      return res.status(404).json({ message: 'Training resource not found' });
    }

    res.json({
      message: 'Training resource retrieved successfully',
      resource
    });
  } catch (error) {
    console.error('Get training resource error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve training resource', 
      error: error.message 
    });
  }
});

// Create new training resource
router.post('/', auth, authorize('Admin', 'RM'), sanitizeInputMiddleware, async (req, res) => {
  try {
    const resourceData = {
      ...req.body,
      createdBy: req.user._id
    };

    const resource = new TrainingResource(resourceData);
    await resource.save();

    const populatedResource = await TrainingResource.findById(resource._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Training resource created successfully',
      resource: populatedResource
    });
  } catch (error) {
    console.error('Create training resource error:', error);
    res.status(500).json({ 
      message: 'Failed to create training resource', 
      error: error.message 
    });
  }
});

// Update training resource
router.put('/:id', auth, authorize('Admin', 'RM'), sanitizeInputMiddleware, async (req, res) => {
  try {
    const resource = await TrainingResource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: 'Training resource not found' });
    }

    // Check if RM can update this resource
    if (req.user.role === 'RM' && resource.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedResource = await TrainingResource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      message: 'Training resource updated successfully',
      resource: updatedResource
    });
  } catch (error) {
    console.error('Update training resource error:', error);
    res.status(500).json({ 
      message: 'Failed to update training resource', 
      error: error.message 
    });
  }
});

// Delete training resource
router.delete('/:id', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const resource = await TrainingResource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: 'Training resource not found' });
    }

    // Check if RM can delete this resource
    if (req.user.role === 'RM' && resource.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await TrainingResource.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Training resource deleted successfully',
      resource
    });
  } catch (error) {
    console.error('Delete training resource error:', error);
    res.status(500).json({ 
      message: 'Failed to delete training resource', 
      error: error.message 
    });
  }
});

// Get resources for specific skill
router.get('/skill/:skill', auth, async (req, res) => {
  try {
    const { skill } = req.params;
    const { targetLevel = 1, difficulty } = req.query;
    
    const { findResourcesForSkill } = require('../services/trainingRecommendationService');
    
    const resources = await findResourcesForSkill(skill, parseInt(targetLevel));
    
    res.json({
      message: `Training resources for ${skill} retrieved successfully`,
      resources,
      count: resources.length
    });
  } catch (error) {
    console.error('Get resources for skill error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve resources for skill', 
      error: error.message 
    });
  }
});

// Bulk create training resources
router.post('/bulk', auth, authorize('Admin'), sanitizeInputMiddleware, async (req, res) => {
  try {
    const { resources } = req.body;
    
    if (!Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ message: 'Resources array is required' });
    }

    const resourcesWithCreator = resources.map(resource => ({
      ...resource,
      createdBy: req.user._id
    }));

    const createdResources = await TrainingResource.insertMany(resourcesWithCreator);

    res.status(201).json({
      message: 'Training resources created successfully',
      resources: createdResources,
      count: createdResources.length
    });
  } catch (error) {
    console.error('Bulk create training resources error:', error);
    res.status(500).json({ 
      message: 'Failed to create training resources', 
      error: error.message 
    });
  }
});

module.exports = router;