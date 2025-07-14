const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const demandRoutes = require('./routes/demands');
const matchRoutes = require('./routes/matches');
const trainingRoutes = require('./routes/training');
const trainingResourceRoutes = require('./routes/trainingResources');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/users');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure mongoose to prevent duplicate index warnings
mongoose.set('strictQuery', false);

// Disable automatic index creation in production
if (process.env.NODE_ENV === 'production') {
  mongoose.set('autoIndex', false);
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibridge-ai')
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/demands', demandRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/training-resources', trainingResourceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'iBridge AI Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', notFoundHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 iBridge AI Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});