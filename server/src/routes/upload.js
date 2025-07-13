const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const FileUpload = require('../models/FileUpload');
const { auth, authorize } = require('../middleware/auth');
const { processCSVUpload } = require('../services/csvProcessor');
const { validateObjectIdParam, validateObjectIdBody } = require('../utils/objectIdValidator');

const router = express.Router();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow CSV, PDF, DOC, DOCX files
    const allowedMimes = [
      'text/csv',
      'application/csv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// Upload resume
router.post('/resume', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { employeeId } = req.body;
    
    // Validate employeeId
    const { isValidObjectId } = require('../utils/objectIdValidator');
    if (!employeeId || !isValidObjectId(employeeId)) {
      return res.status(400).json({ message: 'Valid employee ID is required' });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `resumes/${timestamp}-${req.file.originalname}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'private' // Keep resumes private
    };

    const s3Result = await s3.upload(uploadParams).promise();

    // Save file metadata to database
    const fileUpload = new FileUpload({
      fileName,
      originalName: req.file.originalname,
      fileType: 'Resume',
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      s3Url: s3Result.Location,
      s3Key: s3Result.Key,
      uploadedBy: req.user._id,
      associatedEntity: {
        entityType: 'Employee',
        entityId: employeeId
      }
    });

    await fileUpload.save();

    res.status(201).json({
      message: 'Resume uploaded successfully',
      fileUpload: {
        id: fileUpload._id,
        fileName: fileUpload.originalName,
        fileType: fileUpload.fileType,
        uploadedAt: fileUpload.createdAt,
        s3Url: fileUpload.s3Url
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload resume', 
      error: error.message 
    });
  }
});

// Upload CSV
router.post('/csv', auth, authorize('Admin', 'RM'), upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { type } = req.body; // 'employees' or 'demands'
    
    if (!['employees', 'demands'].includes(type)) {
      return res.status(400).json({ message: 'Invalid CSV type. Must be "employees" or "demands"' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `csv/${type}/${timestamp}-${req.file.originalname}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'private'
    };

    const s3Result = await s3.upload(uploadParams).promise();

    // Save file metadata to database
    const fileUpload = new FileUpload({
      fileName,
      originalName: req.file.originalname,
      fileType: 'CSV',
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      s3Url: s3Result.Location,
      s3Key: s3Result.Key,
      uploadedBy: req.user._id,
      metadata: { csvType: type }
    });

    await fileUpload.save();

    // Process CSV file
    try {
      fileUpload.status = 'Processing';
      await fileUpload.save();

      const processResult = await processCSVUpload(req.file.buffer, type, req.user._id);

      fileUpload.status = 'Processed';
      fileUpload.metadata = {
        ...fileUpload.metadata,
        processResult
      };
      await fileUpload.save();

      res.status(201).json({
        message: 'CSV uploaded and processed successfully',
        fileUpload: {
          id: fileUpload._id,
          fileName: fileUpload.originalName,
          fileType: fileUpload.fileType,
          uploadedAt: fileUpload.createdAt,
          status: fileUpload.status,
          processResult
        }
      });
    } catch (processError) {
      fileUpload.status = 'Failed';
      fileUpload.metadata = {
        ...fileUpload.metadata,
        error: processError.message
      };
      await fileUpload.save();

      res.status(500).json({
        message: 'CSV uploaded but processing failed',
        error: processError.message
      });
    }
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload CSV', 
      error: error.message 
    });
  }
});

// Get file upload history
router.get('/history', auth, async (req, res) => {
  try {
    let query = {};
    
    // If user is not Admin, they can only see their own uploads
    if (req.user.role !== 'Admin') {
      query.uploadedBy = req.user._id;
    }

    const uploads = await FileUpload.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      message: 'File upload history retrieved successfully',
      uploads,
      count: uploads.length
    });
  } catch (error) {
    console.error('Get upload history error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve upload history', 
      error: error.message 
    });
  }
});

// Get file by ID (with signed URL for download)
router.get('/:id', auth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const fileUpload = await FileUpload.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!fileUpload) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user can access this file
    if (req.user.role !== 'Admin' && fileUpload.uploadedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate signed URL for download
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileUpload.s3Key,
      Expires: 3600 // 1 hour
    });

    res.json({
      message: 'File retrieved successfully',
      fileUpload: {
        ...fileUpload.toObject(),
        downloadUrl: signedUrl
      }
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve file', 
      error: error.message 
    });
  }
});

// Delete file
router.delete('/:id', auth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const fileUpload = await FileUpload.findById(req.params.id);

    if (!fileUpload) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user can delete this file
    if (req.user.role !== 'Admin' && fileUpload.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete from S3
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileUpload.s3Key
    }).promise();

    // Delete from database
    await FileUpload.findByIdAndDelete(req.params.id);

    res.json({
      message: 'File deleted successfully',
      fileUpload
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ 
      message: 'Failed to delete file', 
      error: error.message 
    });
  }
});

module.exports = router;