const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const FileUpload = require('../models/FileUpload');
const EmployeeProfile = require('../models/EmployeeProfile');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { processCSVUpload } = require('../services/csvProcessor');
const { validateObjectIdParam, validateObjectIdBody } = require('../utils/objectIdValidator');

const router = express.Router();

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
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
      ContentType: req.file.mimetype
    };

    const command = new PutObjectCommand(uploadParams);
    const s3Result = await s3Client.send(command);
    
    // Construct the S3 URL
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Save file metadata to database
    const fileUpload = new FileUpload({
      fileName,
      originalName: req.file.originalname,
      fileType: 'Resume',
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      s3Url: s3Url,
      s3Key: fileName,
      uploadedBy: req.user._id,
      associatedEntity: {
        entityType: 'Employee',
        entityId: employeeId
      }
    });

    await fileUpload.save();

    // Update employee profile with resume URL
    try {
      await EmployeeProfile.findByIdAndUpdate(employeeId, {
        resumeUrl: s3Url
      });
    } catch (updateError) {
      console.error('Error updating employee profile with resume URL:', updateError);
      // Continue with response even if profile update fails
    }

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
router.post('/csv', auth, authorize('Admin', 'RM', 'HR'), upload.single('csv'), async (req, res) => {
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
      ContentType: req.file.mimetype
    };

    const command = new PutObjectCommand(uploadParams);
    const s3Result = await s3Client.send(command);
    
    // Construct the S3 URL
    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Save file metadata to database
    const fileUpload = new FileUpload({
      fileName,
      originalName: req.file.originalname,
      fileType: 'CSV',
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      s3Url: s3Url,
      s3Key: fileName,
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
      
      // If this was an employee CSV upload, create user accounts for new employees
      if (type === 'employees' && processResult.successful > 0) {
        try {
          // Get all employees that were just created/updated
          const employeeEmails = processResult.processedEmails || [];
          if (employeeEmails && employeeEmails.length > 0) {
            for (const email of employeeEmails) {
              // Check if a user account already exists
              const existingUser = await User.findOne({ email });
              
              if (!existingUser) {
                // Get the employee profile to get the name
                const employee = await EmployeeProfile.findOne({ email });
                
                if (employee) {
                  const defaultPassword = "Wel@come@123";
                  const newUser = new User({
                    name: employee.name,
                    email: employee.email,
                    passwordHash: defaultPassword, // Will be hashed by the pre-save hook
                    role: 'Employee',
                    isActive: true
                  });
                  
                  await newUser.save();
                  console.log(`User account created for employee from CSV: ${employee.email}`);
                }
              }
            }
          }
        } catch (userError) {
          console.error('Error creating user accounts from CSV:', userError);
          // Continue with the response even if user creation fails
        }
      }

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
    let canAccess = false;
    
    if (req.user.role === 'Admin') {
      canAccess = true;
    } else if (fileUpload.uploadedBy._id.toString() === req.user._id.toString()) {
      canAccess = true;
    } else if (req.user.role === 'Employee' && fileUpload.fileType === 'Resume') {
      const EmployeeProfile = require('../models/EmployeeProfile');
      const employeeProfile = await EmployeeProfile.findOne({ email: req.user.email });
      
      if (employeeProfile && fileUpload.associatedEntity && 
          fileUpload.associatedEntity.entityType === 'Employee' && 
          fileUpload.associatedEntity.entityId && 
          fileUpload.associatedEntity.entityId.toString() === employeeProfile._id.toString()) {
        canAccess = true;
      }
    }
    
    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate signed URL for download
    const getObjectParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileUpload.s3Key
    };
    
    const command = new GetObjectCommand(getObjectParams);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

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
    const deleteParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileUpload.s3Key
    };
    
    const deleteCommand = new DeleteObjectCommand(deleteParams);
    await s3Client.send(deleteCommand);

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