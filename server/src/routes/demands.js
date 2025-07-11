const express = require('express');
const Demand = require('../models/Demand');
const { auth, authorize } = require('../middleware/auth');
const { validateDemandMiddleware, sanitizeInputMiddleware } = require('../middleware/validation');

const router = express.Router();

// Get all demands
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // If user is RM, they can only see demands they created
    if (req.user.role === 'RM') {
      query.createdBy = req.user._id;
    }

    const demands = await Demand.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Demands retrieved successfully',
      demands,
      count: demands.length
    });
  } catch (error) {
    console.error('Get demands error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve demands', 
      error: error.message 
    });
  }
});

// Get demand by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const demand = await Demand.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!demand) {
      return res.status(404).json({ message: 'Demand not found' });
    }

    // Check if user can access this demand
    if (req.user.role === 'RM' && demand.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      message: 'Demand retrieved successfully',
      demand
    });
  } catch (error) {
    console.error('Get demand error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve demand', 
      error: error.message 
    });
  }
});

// Create new demand
router.post('/', auth, authorize('Admin', 'RM'), sanitizeInputMiddleware, validateDemandMiddleware, async (req, res) => {
  try {
    const demandData = {
      ...req.body,
      createdBy: req.user._id
    };

    const demand = new Demand(demandData);
    await demand.save();

    const populatedDemand = await Demand.findById(demand._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Demand created successfully',
      demand: populatedDemand
    });
  } catch (error) {
    console.error('Create demand error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Demand ID already exists' 
      });
    }
    res.status(500).json({ 
      message: 'Failed to create demand', 
      error: error.message 
    });
  }
});

// Update demand
router.put('/:id', auth, authorize('Admin', 'RM'), sanitizeInputMiddleware, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid demand ID format' });
    }

    const demand = await Demand.findById(req.params.id);
    
    if (!demand) {
      return res.status(404).json({ message: 'Demand not found' });
    }

    // Check if RM can update this demand
    if (req.user.role === 'RM' && demand.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate update data if provided
    if (Object.keys(req.body).length > 0) {
      const { validateDemand } = require('../utils/validation');
      const validation = validateDemand({ ...demand.toObject(), ...req.body });
      
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: validation.errors
        });
      }
    }

    const updatedDemand = await Demand.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      message: 'Demand updated successfully',
      demand: updatedDemand
    });
  } catch (error) {
    console.error('Update demand error:', error);
    res.status(500).json({ 
      message: 'Failed to update demand', 
      error: error.message 
    });
  }
});

// Delete demand
router.delete('/:id', auth, authorize('Admin', 'RM'), async (req, res) => {
  try {
    const demand = await Demand.findById(req.params.id);
    
    if (!demand) {
      return res.status(404).json({ message: 'Demand not found' });
    }

    // Check if RM can delete this demand
    if (req.user.role === 'RM' && demand.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Demand.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Demand deleted successfully',
      demand
    });
  } catch (error) {
    console.error('Delete demand error:', error);
    res.status(500).json({ 
      message: 'Failed to delete demand', 
      error: error.message 
    });
  }
});

// Get demands by status
router.get('/status/:status', auth, async (req, res) => {
  try {
    let query = { status: req.params.status };
    
    // If user is RM, they can only see demands they created
    if (req.user.role === 'RM') {
      query.createdBy = req.user._id;
    }

    const demands = await Demand.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      message: `Demands with status '${req.params.status}' retrieved successfully`,
      demands,
      count: demands.length
    });
  } catch (error) {
    console.error('Get demands by status error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve demands by status', 
      error: error.message 
    });
  }
});

module.exports = router;