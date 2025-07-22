const csv = require('csv-parser');
const { Readable } = require('stream');
const EmployeeProfile = require('../models/EmployeeProfile');
const Demand = require('../models/Demand');
const User = require('../models/User'); // Import User model

/**
 * Process CSV buffer and convert to array of objects
 */
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);
    
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Validate employee data
 */
function validateEmployeeData(data) {
  const errors = [];
  
  if (!data.employeeId || data.employeeId.trim() === '') {
    errors.push('Employee ID is required');
  }
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  }
  
  if (!data.primarySkill || data.primarySkill.trim() === '') {
    errors.push('Primary skill is required');
  }
  
  if (!data.primarySkillExperience || isNaN(parseInt(data.primarySkillExperience))) {
    errors.push('Primary skill experience must be a valid number');
  }
  
  if (!data.BU || data.BU.trim() === '') {
    errors.push('Business Unit (BU) is required');
  }
  
  // Add validation for managerEmail if it's expected in CSV
  if (data.managerEmail && data.managerEmail.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.managerEmail)) {
    errors.push('Manager email must be a valid email address');
  }

  return errors;
}

/**
 * Validate demand data
 */
function validateDemandData(data) {
  const errors = [];
  
  if (!data.demandId || data.demandId.trim() === '') {
    errors.push('Demand ID is required');
  }
  
  if (!data.accountName || data.accountName.trim() === '') {
    errors.push('Account name is required');
  }
  
  if (!data.projectName || data.projectName.trim() === '') {
    errors.push('Project name is required');
  }
  
  if (!data.positionTitle || data.positionTitle.trim() === '') {
    errors.push('Position title is required');
  }
  
  if (!data.primarySkill || data.primarySkill.trim() === '') {
    errors.push('Primary skill is required');
  }
  
  if (!data.minExperience || isNaN(parseInt(data.minExperience))) {
    errors.push('Minimum experience must be a valid number');
  }
  
  if (!data.maxExperience || isNaN(parseInt(data.maxExperience))) {
    errors.push('Maximum experience must be a valid number');
  }
  
  if (!data.startDate || isNaN(Date.parse(data.startDate))) {
    errors.push('Start date must be a valid date');
  }
  
  return errors;
}

/**
 * Process secondary skills string
 */
function processSecondarySkills(secondarySkillsStr) {
  if (!secondarySkillsStr || secondarySkillsStr.trim() === '') {
    return [];
  }
  
  // Expected format: "Skill1:Experience1,Skill2:Experience2"
  const skills = [];
  const skillPairs = secondarySkillsStr.split(',');
  
  skillPairs.forEach(pair => {
    const [skill, experience] = pair.split(':');
    if (skill && experience && !isNaN(parseInt(experience))) {
      skills.push({
        skill: skill.trim(),
        experience: parseInt(experience)
      });
    }
  });
  
  return skills;
}

/**
 * Process employees CSV
 */
async function processEmployeesCSV(csvData, createdBy) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [],
    processedEmails: [],
    employeesToAssignManager: [], // New array to store employees needing manager assignment
    
  };
  
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 2; // +2 because CSV starts from row 2 (after header)
    
    try {
      // Validate data
      const validationErrors = validateEmployeeData(row);
      if (validationErrors.length > 0) {
        results.errors.push({
          row: rowNumber,
          errors: validationErrors
        });
        results.failed++;
        continue;
      }
      
      // Process secondary skills
      const secondarySkills = processSecondarySkills(row.secondarySkills);
      
      // Create employee profile
      const employeeData = {
        employeeId: row.employeeId.trim(),
        name: row.name.trim(),
        email: row.email.trim().toLowerCase(),
        status: row.status || 'Available',
        primarySkill: row.primarySkill.trim(),
        primarySkillExperience: parseInt(row.primarySkillExperience),
        secondarySkills,
        BU: row.BU.trim(),
        location: row.location ? row.location.trim() : undefined,
        createdBy
      };
      
      // Check if employee already exists
      const existingEmployee = await EmployeeProfile.findOne({ 
        employeeId: employeeData.employeeId 
      });
      
      if (existingEmployee) {
        // Update existing employee
        await EmployeeProfile.findByIdAndUpdate(
          existingEmployee._id,
          employeeData,
          { runValidators: true }
        );
      } else {
        // Create new employee
        const employee = new EmployeeProfile(employeeData);
        await employee.save();
      }
      
      // Add email to processed list for user account creation
      results.processedEmails.push(employeeData.email);
      results.successful++;
    } catch (error) {
      results.errors.push({
        row: rowNumber,
        errors: [error.message]
      });
      results.failed++;
    }
  }

  // --- Post-processing for Manager Assignment ---
  for (const empToAssign of results.employeesToAssignManager) {
    try {
      // Skip if managerEmail is empty or null
      if (!empToAssign.managerEmail || empToAssign.managerEmail.trim() === '') {
        continue;
      }
      
      const managerUser = await User.findOne({ email: empToAssign.managerEmail });

      if (managerUser && managerUser.role === 'Manager') {
        await EmployeeProfile.findByIdAndUpdate(
          empToAssign.employeeId,
          { managerUser: managerUser._id },
          { runValidators: true }
        );
      } else {
        results.errors.push({
          row: empToAssign.rowNumber,
          errors: [`Manager with email '${empToAssign.managerEmail}' not found or does not have 'Manager' role.`]
        });
      }
    } catch (error) {
      results.errors.push({
        row: empToAssign.rowNumber,
        errors: [`Error assigning manager '${empToAssign.managerEmail}': ${error.message}`]
      });
    }
  }
  
  return results;
}

/**
 * Process demands CSV
 */
async function processDemandCSV(csvData, createdBy) {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 2;
    
    try {
      // Validate data
      const validationErrors = validateDemandData(row);
      if (validationErrors.length > 0) {
        results.errors.push({
          row: rowNumber,
          errors: validationErrors
        });
        results.failed++;
        continue;
      }
      
      // Process secondary skills
      const secondarySkills = row.secondarySkills ? 
        row.secondarySkills.split(',').map(skill => skill.trim()).filter(skill => skill) : [];
      
      // Create demand
      const demandData = {
        demandId: row.demandId.trim(),
        accountName: row.accountName.trim(),
        projectName: row.projectName.trim(),
        positionTitle: row.positionTitle.trim(),
        primarySkill: row.primarySkill.trim(),
        experienceRange: {
          min: parseInt(row.minExperience),
          max: parseInt(row.maxExperience)
        },
        secondarySkills,
        startDate: new Date(row.startDate),
        endDate: row.endDate ? new Date(row.endDate) : undefined,
        priority: row.priority || 'Medium',
        location: row.location ? row.location.trim() : undefined,
        description: row.description ? row.description.trim() : undefined,
        createdBy
      };
      
      // Check if demand already exists
      const existingDemand = await Demand.findOne({ 
        demandId: demandData.demandId 
      });
      
      if (existingDemand) {
        // Update existing demand
        await Demand.findByIdAndUpdate(
          existingDemand._id,
          demandData,
          { runValidators: true }
        );
      } else {
        // Create new demand
        const demand = new Demand(demandData);
        await demand.save();
      }
      
      results.successful++;
    } catch (error) {
      results.errors.push({
        row: rowNumber,
        errors: [error.message]
      });
      results.failed++;
    }
  }
  
  return results;
}

/**
 * Main CSV processing function
 */
async function processCSVUpload(buffer, type, createdBy) {
  try {
    // Parse CSV
    const csvData = await parseCSV(buffer);
    
    if (csvData.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    let results;
    
    if (type === 'employees') {
      results = await processEmployeesCSV(csvData, createdBy);
    } else if (type === 'demands') {
      results = await processDemandCSV(csvData, createdBy);
    } else {
      throw new Error('Invalid CSV type');
    }
    
    return {
      type,
      totalRows: csvData.length,
      ...results
    };
  } catch (error) {
    console.error('CSV processing error:', error);
    throw error;
  }
}

module.exports = {
  processCSVUpload
};