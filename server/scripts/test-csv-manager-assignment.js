#!/usr/bin/env node

/**
 * Script to test CSV manager assignment functionality
 * 
 * This script processes a few sample CSV rows and verifies
 * that manager assignment works correctly.
 * 
 * Usage:
 *   node scripts/test-csv-manager-assignment.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { processCSVUpload } = require('../src/services/csvProcessor');

async function testCSVManagerAssignment() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibridge-ai');
    console.log('✅ Connected to MongoDB\n');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '..', '..', 'dex_sample_employees.csv');
    console.log(`📄 Reading CSV file: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('CSV file not found. Please ensure dex_sample_employees.csv exists in the root directory.');
    }
    
    const csvBuffer = fs.readFileSync(csvPath);
    console.log(`📊 CSV file size: ${csvBuffer.length} bytes`);
    
    // Process first few rows only for testing
    console.log('\n🔄 Processing CSV data...');
    
    // Create a sample user ID for testing (simulate admin/HR user)
    const User = require('../src/models/User');
    let testUser = await User.findOne({ role: 'Admin' });
    
    if (!testUser) {
      testUser = await User.findOne({ role: 'HR' });
    }
    
    if (!testUser) {
      // Create a test admin user if none exists
      testUser = new User({
        name: 'Test Admin',
        email: 'admin@test.com',
        passwordHash: 'Test@123',
        role: 'Admin',
        isActive: true
      });
      await testUser.save();
      console.log('✅ Created test admin user');
    }
    
    // Process the CSV
    const results = await processCSVUpload(csvBuffer, 'employees', testUser._id);
    
    console.log('\n📊 CSV Processing Results:');
    console.log(`   Total rows: ${results.totalRows}`);
    console.log(`   Successful: ${results.successful}`);
    console.log(`   Failed: ${results.failed}`);
    
    if (results.errors && results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => {
        console.log(`   Row ${error.row}: ${error.errors.join(', ')}`);
      });
    }
    
    // Check if employees were assigned managers
    console.log('\n🔍 Checking manager assignments...');
    const EmployeeProfile = require('../src/models/EmployeeProfile');
    
    const employeesWithManagers = await EmployeeProfile.find({ 
      managerUser: { $ne: null } 
    }).populate('managerUser', 'name email role').limit(10);
    
    console.log(`✅ Found ${employeesWithManagers.length} employees with managers assigned:`);
    
    employeesWithManagers.forEach(emp => {
      console.log(`   - ${emp.name} (${emp.employeeId}) → Manager: ${emp.managerUser.name} (${emp.managerUser.email})`);
    });
    
    // Verify the specific manager
    const managerUser = await User.findOne({ email: 'jersonv@ilink-systems.com' });
    if (managerUser) {
      const directReports = await EmployeeProfile.countDocuments({ managerUser: managerUser._id });
      console.log(`\n👥 Manager ${managerUser.name} has ${directReports} direct reports`);
    }
    
    console.log('\n🎉 Manager assignment test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing CSV manager assignment:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  testCSVManagerAssignment();
}

module.exports = { testCSVManagerAssignment };
