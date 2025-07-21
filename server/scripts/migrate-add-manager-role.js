#!/usr/bin/env node

/**
 * Migration Script: Add Manager Role and Approval Workflow Fields
 * 
 * This script migrates the existing database to support the new Manager role
 * and approval workflow functionality.
 * 
 * Usage:
 *   node scripts/migrate-add-manager-role.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const readline = require('readline');

// Import models
const User = require('../src/models/User');
const EmployeeProfile = require('../src/models/EmployeeProfile');
const Match = require('../src/models/Match');

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompts user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} - User's response
 */
const askConfirmation = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
};

/**
 * Migration functions
 */
async function migrateUserRoles() {
  console.log('\n📊 Checking User roles...');
  
  // Check if any users already have the Manager role
  const existingManagers = await User.countDocuments({ role: 'Manager' });
  console.log(`   Found ${existingManagers} existing Manager users`);
  
  // Get count of users by role
  const roleCounts = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);
  
  console.log('   Current role distribution:');
  roleCounts.forEach(role => {
    console.log(`     ${role._id}: ${role.count}`);
  });
  
  return true;
}

async function migrateEmployeeProfiles() {
  console.log('\n👥 Migrating EmployeeProfile documents...');
  
  // Count profiles without managerUser field
  const profilesWithoutManager = await EmployeeProfile.countDocuments({ 
    managerUser: { $exists: false } 
  });
  
  console.log(`   Found ${profilesWithoutManager} employee profiles without manager assignment`);
  
  if (profilesWithoutManager > 0) {
    // Add managerUser field to existing profiles (set to null initially)
    const result = await EmployeeProfile.updateMany(
      { managerUser: { $exists: false } },
      { $set: { managerUser: null } }
    );
    
    console.log(`   ✅ Updated ${result.modifiedCount} employee profiles with managerUser field`);
  }
  
  return true;
}

async function migrateMatches() {
  console.log('\n🔄 Migrating Match documents...');
  
  // Count matches without approval fields
  const matchesWithoutApproval = await Match.countDocuments({ 
    approvalStatus: { $exists: false } 
  });
  
  console.log(`   Found ${matchesWithoutApproval} matches without approval workflow fields`);
  
  if (matchesWithoutApproval > 0) {
    // Add approval fields to existing matches
    const result = await Match.updateMany(
      { approvalStatus: { $exists: false } },
      { 
        $set: { 
          approvalStatus: 'Pending',
          approverUser: null
        } 
      }
    );
    
    console.log(`   ✅ Updated ${result.modifiedCount} matches with approval workflow fields`);
  }
  
  return true;
}

async function createSampleManagerUser() {
  console.log('\n👤 Creating sample Manager user...');
  
  const existingManager = await User.findOne({ role: 'Manager' });
  
  if (existingManager) {
    console.log(`   ✅ Manager user already exists: ${existingManager.name} (${existingManager.email})`);
    return existingManager;
  }
  
  const createSample = await askConfirmation('   Create a sample Manager user for testing? (yes/no): ');
  
  if (createSample) {
    try {
      const sampleManager = new User({
        name: 'Sample Manager',
        email: 'manager@ibridge.ai',
        passwordHash: 'Manager@123', // Will be hashed by pre-save hook
        role: 'Manager',
        isActive: true
      });
      
      await sampleManager.save();
      console.log(`   ✅ Created sample Manager user: ${sampleManager.name} (${sampleManager.email})`);
      console.log(`   🔑 Default password: Manager@123`);
      return sampleManager;
    } catch (error) {
      console.error(`   ❌ Error creating sample Manager user:`, error.message);
      return null;
    }
  }
  
  return null;
}

async function assignManagerToEmployees(managerUser) {
  if (!managerUser) {
    console.log('\n⏭️  Skipping manager assignment (no manager user available)');
    return;
  }
  
  console.log('\n🔗 Assigning manager to employee profiles...');
  
  const unassignedEmployees = await EmployeeProfile.find({ 
    managerUser: null 
  }).limit(5); // Limit to first 5 for demo
  
  if (unassignedEmployees.length === 0) {
    console.log('   ✅ All employees already have managers assigned');
    return;
  }
  
  const assignManager = await askConfirmation(
    `   Assign sample manager to ${unassignedEmployees.length} employees for testing? (yes/no): `
  );
  
  if (assignManager) {
    const result = await EmployeeProfile.updateMany(
      { _id: { $in: unassignedEmployees.map(emp => emp._id) } },
      { $set: { managerUser: managerUser._id } }
    );
    
    console.log(`   ✅ Assigned manager to ${result.modifiedCount} employees`);
    
    // List assigned employees
    unassignedEmployees.forEach(emp => {
      console.log(`     - ${emp.name} (${emp.employeeId})`);
    });
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting Manager Role Migration...\n');
    
    // Get database connection info
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ibridge-ai';
    const dbName = mongoose.connection.db?.databaseName || 'ibridge-ai';
    
    console.log(`📊 Database: ${dbName}`);
    console.log(`🔗 Connection: ${dbUri.replace(/\/\/.*@/, '//***:***@')}\n`);
    
    // Show what will be migrated
    console.log('📋 Migration Plan:');
    console.log('   1. ✅ User model already supports Manager role');
    console.log('   2. 🔄 Add managerUser field to EmployeeProfile documents');
    console.log('   3. 🔄 Add approval workflow fields to Match documents');
    console.log('   4. 👤 Create sample Manager user (optional)');
    console.log('   5. 🔗 Assign manager to employees (optional)');
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will modify your database!');
    const confirmed = await askConfirmation('Do you want to continue? (yes/no): ');
    
    if (!confirmed) {
      console.log('❌ Migration cancelled by user.');
      return;
    }
    
    console.log('\n🔧 Starting migration...');
    
    // Run migration steps
    await migrateUserRoles();
    await migrateEmployeeProfiles();
    await migrateMatches();
    
    // Optional: Create sample data
    const managerUser = await createSampleManagerUser();
    await assignManagerToEmployees(managerUser);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Update your application code to use the new Manager role');
    console.log('   2. Assign real managers to employee profiles');
    console.log('   3. Test the approval workflow functionality');
    console.log('   4. Update user documentation');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibridge-ai');
    console.log('✅ Connected to MongoDB\n');
    
    // Run migration
    await runMigration();
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  } finally {
    // Clean up
    rl.close();
    
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Process interrupted by user');
  rl.close();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Process terminated');
  rl.close();
  await mongoose.disconnect();
  process.exit(0);
});

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { runMigration };