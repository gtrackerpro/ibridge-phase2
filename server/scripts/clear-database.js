#!/usr/bin/env node

/**
 * Database Clear Script for iBridge-AI
 * 
 * This script clears all collections in the iBridge-AI database.
 * Use with caution - this will permanently delete all data!
 * 
 * Usage:
 *   node scripts/clear-database.js
 *   npm run db:clear
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const readline = require('readline');

// Import all models
const User = require('../src/models/User');
const EmployeeProfile = require('../src/models/EmployeeProfile');
const Demand = require('../src/models/Demand');
const Match = require('../src/models/Match');
const TrainingPlan = require('../src/models/TrainingPlan');
const TrainingResource = require('../src/models/TrainingResource');
const FileUpload = require('../src/models/FileUpload');

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
 * Clears all collections in the database
 */
async function clearDatabase() {
  try {
    console.log('🚀 Starting database clear process...\n');

    // Get database connection info
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ibridge-ai';
    const dbName = mongoose.connection.db?.databaseName || 'ibridge-ai';

    console.log(`📊 Database: ${dbName}`);
    console.log(`🔗 Connection: ${dbUri.replace(/\/\/.*@/, '//***:***@')}\n`);

    // Get counts before clearing
    const counts = {
      users: await User.countDocuments(),
      employeeProfiles: await EmployeeProfile.countDocuments(),
      demands: await Demand.countDocuments(),
      matches: await Match.countDocuments(),
      trainingPlans: await TrainingPlan.countDocuments(),
      trainingResources: await TrainingResource.countDocuments(),
      fileUploads: await FileUpload.countDocuments()
    };

    // Display current data counts
    console.log('📊 Current database contents:');
    console.log(`   Users: ${counts.users}`);
    console.log(`   Employee Profiles: ${counts.employeeProfiles}`);
    console.log(`   Demands: ${counts.demands}`);
    console.log(`   Matches: ${counts.matches}`);
    console.log(`   Training Plans: ${counts.trainingPlans}`);
    console.log(`   Training Resources: ${counts.trainingResources}`);
    console.log(`   File Uploads: ${counts.fileUploads}`);
    console.log(`   Total documents: ${Object.values(counts).reduce((a, b) => a + b, 0)}\n`);

    // Check if database is empty
    const totalDocs = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalDocs === 0) {
      console.log('✅ Database is already empty. Nothing to clear.');
      return;
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will permanently delete ALL data from the database!');
    console.log('⚠️  This action cannot be undone!\n');

    const confirmed = await askConfirmation('Are you sure you want to continue? (yes/no): ');
    
    if (!confirmed) {
      console.log('❌ Operation cancelled by user.');
      return;
    }

    // Final confirmation
    const finalConfirmed = await askConfirmation('\n🔥 FINAL CONFIRMATION: Type "yes" to proceed with clearing the database: ');
    
    if (!finalConfirmed) {
      console.log('❌ Operation cancelled by user.');
      return;
    }

    console.log('\n🧹 Clearing database...\n');

    // Clear collections in order (considering dependencies)
    const clearOperations = [
      { model: Match, name: 'Matches' },
      { model: TrainingPlan, name: 'Training Plans' },
      { model: FileUpload, name: 'File Uploads' },
      { model: TrainingResource, name: 'Training Resources' },
      { model: Demand, name: 'Demands' },
      { model: EmployeeProfile, name: 'Employee Profiles' },
      { model: User, name: 'Users' }
    ];

    let totalDeleted = 0;
    
    for (const operation of clearOperations) {
      try {
        const result = await operation.model.deleteMany({});
        console.log(`✅ ${operation.name}: ${result.deletedCount} documents deleted`);
        totalDeleted += result.deletedCount;
      } catch (error) {
        console.error(`❌ Error clearing ${operation.name}:`, error.message);
      }
    }

    console.log(`\n🎉 Database cleared successfully!`);
    console.log(`📊 Total documents deleted: ${totalDeleted}\n`);

    // Verify all collections are empty
    const finalCounts = {
      users: await User.countDocuments(),
      employeeProfiles: await EmployeeProfile.countDocuments(),
      demands: await Demand.countDocuments(),
      matches: await Match.countDocuments(),
      trainingPlans: await TrainingPlan.countDocuments(),
      trainingResources: await TrainingResource.countDocuments(),
      fileUploads: await FileUpload.countDocuments()
    };

    const finalTotal = Object.values(finalCounts).reduce((a, b) => a + b, 0);
    
    if (finalTotal === 0) {
      console.log('✅ Verification: Database is completely empty.');
    } else {
      console.log('⚠️  Warning: Some documents may remain:');
      Object.entries(finalCounts).forEach(([key, count]) => {
        if (count > 0) {
          console.log(`   ${key}: ${count} documents remaining`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error during database clear:', error.message);
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

    // Clear database
    await clearDatabase();

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  } finally {
    // Clean up
    rl.close();
    
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
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

// Run the script
if (require.main === module) {
  main();
}

module.exports = { clearDatabase };
