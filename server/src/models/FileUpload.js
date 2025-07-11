const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true
  },
  fileType: {
    type: String,
    enum: ['Resume', 'CSV', 'Document'],
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  s3Url: {
    type: String,
    required: [true, 'S3 URL is required'],
    trim: true
  },
  s3Key: {
    type: String,
    required: [true, 'S3 Key is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Uploaded', 'Processing', 'Processed', 'Failed'],
    default: 'Uploaded'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  associatedEntity: {
    entityType: {
      type: String,
      enum: ['Employee', 'Demand', 'Training']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient querying
fileUploadSchema.index({ uploadedBy: 1, fileType: 1 });
fileUploadSchema.index({ status: 1 });

module.exports = mongoose.model('FileUpload', fileUploadSchema);