const mongoose = require('mongoose');
const TrainingResource = require('../models/TrainingResource');
const User = require('../models/User');
require('dotenv').config();

const sampleResources = [
  // JavaScript Resources
  {
    title: 'JavaScript: The Complete Guide',
    description: 'Comprehensive JavaScript course covering ES6+, async programming, and modern development practices',
    url: 'https://www.udemy.com/course/javascript-the-complete-guide-2020-beginner-advanced/',
    type: 'Course',
    provider: 'Udemy',
    estimatedHours: 52,
    difficulty: 'Intermediate',
    associatedSkills: ['JavaScript', 'ES6', 'Async Programming'],
    keywords: ['javascript', 'es6', 'promises', 'async', 'await'],
    category: 'Programming',
    rating: 4.6,
    cost: 'Paid',
    language: 'English'
  },
  {
    title: 'MDN JavaScript Documentation',
    description: 'Official Mozilla documentation for JavaScript',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    type: 'Documentation',
    provider: 'Mozilla',
    estimatedHours: 0,
    difficulty: 'Beginner',
    associatedSkills: ['JavaScript'],
    keywords: ['javascript', 'documentation', 'reference'],
    category: 'Programming',
    rating: 4.8,
    cost: 'Free',
    language: 'English'
  },
  
  // React Resources
  {
    title: 'React - The Complete Guide',
    description: 'Learn React from basics to advanced concepts including hooks, context, and testing',
    url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
    type: 'Course',
    provider: 'Udemy',
    estimatedHours: 48,
    difficulty: 'Intermediate',
    associatedSkills: ['React', 'Redux', 'JavaScript'],
    keywords: ['react', 'hooks', 'components', 'jsx', 'redux'],
    category: 'Frontend',
    rating: 4.7,
    cost: 'Paid',
    language: 'English'
  },
  {
    title: 'Official React Documentation',
    description: 'Official React documentation with tutorials and API reference',
    url: 'https://reactjs.org/docs/getting-started.html',
    type: 'Documentation',
    provider: 'Facebook',
    estimatedHours: 0,
    difficulty: 'Beginner',
    associatedSkills: ['React'],
    keywords: ['react', 'documentation', 'tutorial'],
    category: 'Frontend',
    rating: 4.9,
    cost: 'Free',
    language: 'English'
  },
  
  // Python Resources
  {
    title: 'Python for Everybody Specialization',
    description: 'Learn Python programming fundamentals and data structures',
    url: 'https://www.coursera.org/specializations/python',
    type: 'Course',
    provider: 'Coursera',
    estimatedHours: 32,
    difficulty: 'Beginner',
    associatedSkills: ['Python', 'Data Structures'],
    keywords: ['python', 'programming', 'data structures'],
    category: 'Programming',
    rating: 4.8,
    cost: 'Subscription',
    language: 'English'
  },
  {
    title: 'Django for Beginners',
    description: 'Build web applications with Django framework',
    url: 'https://djangoforbeginners.com/',
    type: 'Book',
    provider: 'William S. Vincent',
    estimatedHours: 20,
    difficulty: 'Beginner',
    associatedSkills: ['Django', 'Python', 'Web Development'],
    keywords: ['django', 'python', 'web', 'framework'],
    category: 'Backend',
    rating: 4.5,
    cost: 'Paid',
    language: 'English'
  },
  
  // Node.js Resources
  {
    title: 'Node.js: The Complete Guide',
    description: 'Master Node.js, Express, MongoDB, and build REST APIs',
    url: 'https://www.udemy.com/course/nodejs-the-complete-guide/',
    type: 'Course',
    provider: 'Udemy',
    estimatedHours: 40,
    difficulty: 'Intermediate',
    associatedSkills: ['Node.js', 'Express', 'MongoDB'],
    keywords: ['nodejs', 'express', 'api', 'backend'],
    category: 'Backend',
    rating: 4.6,
    cost: 'Paid',
    language: 'English'
  },
  
  // Database Resources
  {
    title: 'MongoDB University',
    description: 'Free MongoDB courses from basics to advanced',
    url: 'https://university.mongodb.com/',
    type: 'Course',
    provider: 'MongoDB',
    estimatedHours: 25,
    difficulty: 'Beginner',
    associatedSkills: ['MongoDB', 'NoSQL', 'Database'],
    keywords: ['mongodb', 'nosql', 'database'],
    category: 'Database',
    rating: 4.7,
    cost: 'Free',
    language: 'English'
  },
  {
    title: 'PostgreSQL Tutorial',
    description: 'Complete PostgreSQL tutorial for beginners',
    url: 'https://www.postgresqltutorial.com/',
    type: 'Tutorial',
    provider: 'PostgreSQL Tutorial',
    estimatedHours: 15,
    difficulty: 'Beginner',
    associatedSkills: ['PostgreSQL', 'SQL', 'Database'],
    keywords: ['postgresql', 'sql', 'database'],
    category: 'Database',
    rating: 4.4,
    cost: 'Free',
    language: 'English'
  },
  
  // Cloud Resources
  {
    title: 'AWS Certified Solutions Architect',
    description: 'Prepare for AWS certification and learn cloud architecture',
    url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
    type: 'Certification',
    provider: 'Amazon',
    estimatedHours: 60,
    difficulty: 'Advanced',
    associatedSkills: ['AWS', 'Cloud Architecture', 'DevOps'],
    keywords: ['aws', 'cloud', 'architecture', 'certification'],
    category: 'Cloud',
    rating: 4.8,
    cost: 'Paid',
    language: 'English'
  },
  {
    title: 'Docker Mastery',
    description: 'Complete Docker course from basics to production',
    url: 'https://www.udemy.com/course/docker-mastery/',
    type: 'Course',
    provider: 'Udemy',
    estimatedHours: 19,
    difficulty: 'Intermediate',
    associatedSkills: ['Docker', 'Containerization', 'DevOps'],
    keywords: ['docker', 'containers', 'devops'],
    category: 'DevOps',
    rating: 4.7,
    cost: 'Paid',
    language: 'English'
  },
  
  // Data Science Resources
  {
    title: 'Machine Learning Course',
    description: 'Stanford Machine Learning course by Andrew Ng',
    url: 'https://www.coursera.org/learn/machine-learning',
    type: 'Course',
    provider: 'Stanford/Coursera',
    estimatedHours: 55,
    difficulty: 'Advanced',
    associatedSkills: ['Machine Learning', 'Data Science', 'Python'],
    keywords: ['machine learning', 'ml', 'data science', 'algorithms'],
    category: 'Data',
    rating: 4.9,
    cost: 'Subscription',
    language: 'English'
  }
];

async function seedTrainingResources() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibridge-ai');
    console.log('Connected to MongoDB');

    // Find an admin user to assign as creator
    let adminUser = await User.findOne({ role: 'Admin' });
    
    if (!adminUser) {
      // Create a default admin user if none exists
      adminUser = new User({
        name: 'System Admin',
        email: 'admin@ibridge.ai',
        passwordHash: 'defaultpassword123',
        role: 'Admin'
      });
      await adminUser.save();
      console.log('Created default admin user');
    }

    // Clear existing resources
    await TrainingResource.deleteMany({});
    console.log('Cleared existing training resources');

    // Add createdBy field to all resources
    const resourcesWithCreator = sampleResources.map(resource => ({
      ...resource,
      createdBy: adminUser._id
    }));

    // Insert sample resources
    const insertedResources = await TrainingResource.insertMany(resourcesWithCreator);
    console.log(`Inserted ${insertedResources.length} training resources`);

    console.log('Training resources seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding training resources:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedTrainingResources();