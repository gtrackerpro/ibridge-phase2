#!/usr/bin/env node

/**
 * Script to create sample training data for testing
 * 
 * This script creates sample training plans with different statuses
 * to populate the Training Overview statistics.
 * 
 * Usage:
 *   node scripts/create-sample-training-data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const TrainingPlan = require('../src/models/TrainingPlan');
const EmployeeProfile = require('../src/models/EmployeeProfile');
const User = require('../src/models/User');

async function createSampleTrainingData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibridge-ai');
    console.log('✅ Connected to MongoDB\n');
    
    // Check if we already have training plans
    const existingPlans = await TrainingPlan.countDocuments();
    console.log(`📊 Existing training plans: ${existingPlans}`);
    
    if (existingPlans >= 10) {
      console.log('✅ Sufficient training plans already exist. No need to create more.');
      return;
    }
    
    // Get some employees and a manager/admin user
    const employees = await EmployeeProfile.find().limit(5);
    if (employees.length === 0) {
      console.log('❌ No employees found. Please create some employees first.');
      return;
    }
    
    let assignedBy = await User.findOne({ role: 'Manager' });
    if (!assignedBy) {
      assignedBy = await User.findOne({ role: 'Admin' });
    }
    if (!assignedBy) {
      console.log('❌ No Manager or Admin user found. Please create a Manager or Admin user first.');
      return;
    }
    
    console.log(`👤 Using ${assignedBy.name} (${assignedBy.role}) as the assigner`);
    console.log(`👥 Found ${employees.length} employees to create training plans for\n`);
    
    // Sample training plans with different statuses
    const samplePlans = [
      {
        employeeId: employees[0]._id,
        skillsToTrain: [
          { skill: 'React', currentLevel: 2, targetLevel: 4, priority: 'High' },
          { skill: 'TypeScript', currentLevel: 1, targetLevel: 3, priority: 'Medium' }
        ],
        status: 'In Progress',
        progress: 65,
        assignedBy: assignedBy._id,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        targetCompletionDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        resourceLinks: [
          {
            title: 'React Advanced Concepts',
            url: 'https://reactjs.org/docs/advanced-guides.html',
            type: 'Documentation',
            estimatedHours: 20
          }
        ]
      },
      {
        employeeId: employees[1]._id,
        skillsToTrain: [
          { skill: 'Python', currentLevel: 1, targetLevel: 3, priority: 'High' },
          { skill: 'Django', currentLevel: 0, targetLevel: 2, priority: 'Medium' }
        ],
        status: 'Assigned',
        progress: 0,
        assignedBy: assignedBy._id,
        targetCompletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        resourceLinks: [
          {
            title: 'Python for Beginners',
            url: 'https://www.python.org/about/gettingstarted/',
            type: 'Course',
            estimatedHours: 40
          }
        ]
      },
      {
        employeeId: employees[2]._id,
        skillsToTrain: [
          { skill: 'AWS', currentLevel: 2, targetLevel: 4, priority: 'High' }
        ],
        status: 'Completed',
        progress: 100,
        assignedBy: assignedBy._id,
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        actualCompletionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        resourceLinks: [
          {
            title: 'AWS Solutions Architect',
            url: 'https://aws.amazon.com/certification/',
            type: 'Certification',
            estimatedHours: 60
          }
        ]
      }
    ];
    
    // Add more plans if we have more employees
    if (employees.length > 3) {
      samplePlans.push({
        employeeId: employees[3]._id,
        skillsToTrain: [
          { skill: 'Docker', currentLevel: 1, targetLevel: 3, priority: 'Medium' },
          { skill: 'Kubernetes', currentLevel: 0, targetLevel: 2, priority: 'Low' }
        ],
        status: 'In Progress',
        progress: 30,
        assignedBy: assignedBy._id,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        targetCompletionDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), // 75 days from now
        resourceLinks: [
          {
            title: 'Docker Getting Started',
            url: 'https://docs.docker.com/get-started/',
            type: 'Documentation',
            estimatedHours: 25
          }
        ]
      });
    }
    
    if (employees.length > 4) {
      samplePlans.push({
        employeeId: employees[4]._id,
        skillsToTrain: [
          { skill: 'Machine Learning', currentLevel: 0, targetLevel: 2, priority: 'High' }
        ],
        status: 'On Hold',
        progress: 15,
        assignedBy: assignedBy._id,
        notes: 'Paused due to project priorities',
        resourceLinks: [
          {
            title: 'Introduction to Machine Learning',
            url: 'https://www.coursera.org/learn/machine-learning',
            type: 'Course',
            estimatedHours: 50
          }
        ]
      });
    }
    
    console.log('🔄 Creating sample training plans...\n');
    
    let created = 0;
    for (const planData of samplePlans) {
      try {
        // Check if a plan already exists for this employee
        const existingPlan = await TrainingPlan.findOne({ employeeId: planData.employeeId });
        
        if (!existingPlan) {
          const plan = new TrainingPlan(planData);
          await plan.save();
          
          const employee = employees.find(emp => emp._id.toString() === planData.employeeId.toString());
          console.log(`✅ Created ${planData.status} training plan for ${employee.name}`);
          console.log(`   Skills: ${planData.skillsToTrain.map(s => s.skill).join(', ')}`);
          console.log(`   Progress: ${planData.progress}%\n`);
          created++;
        } else {
          const employee = employees.find(emp => emp._id.toString() === planData.employeeId.toString());
          console.log(`⏭️  Training plan already exists for ${employee.name}`);
        }
      } catch (error) {
        console.error(`❌ Error creating training plan:`, error.message);
      }
    }
    
    console.log(`🎉 Created ${created} new training plans!`);
    
    // Verify the statistics
    console.log('\n📊 Verifying training statistics...');
    const stats = await TrainingPlan.aggregate([
      {
        $group: {
          _id: null,
          totalPlans: { $sum: 1 },
          draftPlans: { $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] } },
          assignedPlans: { $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] } },
          inProgressPlans: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
          completedPlans: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          onHoldPlans: { $sum: { $cond: [{ $eq: ['$status', 'On Hold'] }, 1, 0] } },
          averageProgress: { $avg: '$progress' }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalPlans: 0,
      draftPlans: 0,
      assignedPlans: 0,
      inProgressPlans: 0,
      completedPlans: 0,
      onHoldPlans: 0,
      averageProgress: 0
    };
    
    console.log('📈 Current Training Statistics:');
    console.log(`   Total Plans: ${result.totalPlans}`);
    console.log(`   Draft: ${result.draftPlans}`);
    console.log(`   Assigned: ${result.assignedPlans}`);
    console.log(`   In Progress: ${result.inProgressPlans}`);
    console.log(`   Completed: ${result.completedPlans}`);
    console.log(`   On Hold: ${result.onHoldPlans}`);
    console.log(`   Average Progress: ${result.averageProgress.toFixed(1)}%`);
    
    console.log('\n✅ Sample training data creation completed!');
    console.log('💡 Now refresh your dashboard to see the updated Training Overview statistics.');
    
  } catch (error) {
    console.error('❌ Error creating sample training data:', error.message);
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
  createSampleTrainingData();
}

module.exports = { createSampleTrainingData };