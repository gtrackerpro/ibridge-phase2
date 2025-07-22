#!/usr/bin/env node

/**
 * Script to create the manager user referenced in the CSV file
 * 
 * This script creates the manager user "jersonv@ilink-systems.com"
 * that is referenced in the CSV file for manager assignments.
 * 
 * Usage:
 *   node scripts/create-csv-manager.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function createCSVManager() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibridge-ai');
    console.log('✅ Connected to MongoDB\n');
    
    // Check if manager already exists
    const existingManager = await User.findOne({ email: 'jersonv@ilink-systems.com' });
    
    if (existingManager) {
      console.log(`✅ Manager user already exists: ${existingManager.name} (${existingManager.email})`);
      console.log(`   Role: ${existingManager.role}`);
      
      // Update role to Manager if it's not already
      if (existingManager.role !== 'Manager') {
        console.log('🔄 Updating user role to Manager...');
        existingManager.role = 'Manager';
        await existingManager.save();
        console.log('✅ Updated user role to Manager');
      }
      
    } else {
      console.log('👤 Creating CSV Manager user...');
      
      const csvManager = new User({
        name: 'Jerson Vaz',
        email: 'jersonv@ilink-systems.com',
        passwordHash: 'Manager@123', // Will be hashed by pre-save hook
        role: 'Manager',
        isActive: true
      });
      
      await csvManager.save();
      console.log(`✅ Created CSV Manager user: ${csvManager.name} (${csvManager.email})`);
      console.log(`🔑 Default password: Manager@123`);
    }
    
    console.log('\n🎉 CSV Manager user is ready!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Now you can upload the CSV file');
    console.log('   2. Manager assignments should work correctly');
    console.log('   3. The manager can login and access their direct reports');
    
  } catch (error) {
    console.error('❌ Error creating CSV manager:', error.message);
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
  createCSVManager();
}

module.exports = { createCSVManager };
