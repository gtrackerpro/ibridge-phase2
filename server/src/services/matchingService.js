const natural = require('natural');
const EmployeeProfile = require('../models/EmployeeProfile');
const Demand = require('../models/Demand');
const Match = require('../models/Match');

// Initialize stemmer for better text matching
const stemmer = natural.PorterStemmer;

// Skill similarity threshold
const SIMILARITY_THRESHOLD = 0.7;

/**
 * Calculate similarity between two skills using Jaro-Winkler distance
 */
function calculateSkillSimilarity(skill1, skill2) {
  const normalizedSkill1 = skill1.toLowerCase().trim();
  const normalizedSkill2 = skill2.toLowerCase().trim();
  
  if (normalizedSkill1 === normalizedSkill2) {
    return 1.0;
  }
  
  return natural.JaroWinklerDistance(normalizedSkill1, normalizedSkill2);
}

/**
 * Check if skills are similar based on stemming and synonyms
 */
function areSkillsSimilar(skill1, skill2) {
  const similarity = calculateSkillSimilarity(skill1, skill2);
  
  if (similarity >= SIMILARITY_THRESHOLD) {
    return true;
  }
  
  // Check for common skill synonyms
  const synonyms = {
    'javascript': ['js', 'ecmascript', 'node.js', 'nodejs'],
    'python': ['py'],
    'react': ['reactjs', 'react.js'],
    'angular': ['angularjs'],
    'vue': ['vuejs', 'vue.js'],
    'database': ['db', 'sql', 'mysql', 'postgresql', 'mongodb'],
    'frontend': ['front-end', 'ui', 'user interface'],
    'backend': ['back-end', 'server-side'],
    'devops': ['deployment', 'ci/cd', 'docker', 'kubernetes'],
    'testing': ['qa', 'quality assurance', 'automation testing']
  };
  
  const skill1Lower = skill1.toLowerCase();
  const skill2Lower = skill2.toLowerCase();
  
  for (const [key, values] of Object.entries(synonyms)) {
    if ((skill1Lower.includes(key) || values.some(v => skill1Lower.includes(v))) &&
        (skill2Lower.includes(key) || values.some(v => skill2Lower.includes(v)))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate match score for an employee against a demand
 */
function calculateMatchScore(employee, demand) {
  let score = 0;
  let maxScore = 100;
  
  // Primary skill match (60% weight)
  const primarySkillWeight = 60;
  let primarySkillScore = 0;
  
  if (areSkillsSimilar(employee.primarySkill, demand.primarySkill)) {
    // Check experience requirement
    const minExp = demand.experienceRange.min;
    const maxExp = demand.experienceRange.max;
    const empExp = employee.primarySkillExperience;
    
    if (empExp >= minExp && empExp <= maxExp) {
      primarySkillScore = primarySkillWeight; // Perfect match
    } else if (empExp >= minExp) {
      primarySkillScore = primarySkillWeight * 0.9; // Over-qualified
    } else {
      // Under-qualified but similar skill
      const experienceRatio = empExp / minExp;
      primarySkillScore = primarySkillWeight * Math.max(0.3, experienceRatio);
    }
  }
  
  score += primarySkillScore;
  
  // Secondary skills match (30% weight)
  const secondarySkillWeight = 30;
  let secondarySkillScore = 0;
  
  if (demand.secondarySkills && demand.secondarySkills.length > 0) {
    let matchedSecondarySkills = 0;
    
    demand.secondarySkills.forEach(demandSecSkill => {
      const hasSkill = employee.secondarySkills.some(empSecSkill => 
        areSkillsSimilar(empSecSkill.skill, demandSecSkill)
      );
      if (hasSkill) {
        matchedSecondarySkills++;
      }
    });
    
    secondarySkillScore = (matchedSecondarySkills / demand.secondarySkills.length) * secondarySkillWeight;
  } else {
    // If no secondary skills required, give full points
    secondarySkillScore = secondarySkillWeight;
  }
  
  score += secondarySkillScore;
  
  // Availability bonus (10% weight)
  const availabilityWeight = 10;
  if (employee.status === 'Available') {
    score += availabilityWeight;
  } else if (employee.status === 'Training') {
    score += availabilityWeight * 0.5;
  }
  
  return Math.min(Math.round(score), 100);
}

/**
 * Determine match type based on score and missing skills
 */
function determineMatchType(score, missingSkills) {
  if (score >= 80 && missingSkills.length === 0) {
    return 'Exact';
  } else if (score >= 60) {
    return 'Near';
  } else {
    return 'Not Eligible';
  }
}

/**
 * Find missing skills for an employee against a demand
 */
function findMissingSkills(employee, demand) {
  const missingSkills = [];
  
  // Check primary skill experience gap
  if (areSkillsSimilar(employee.primarySkill, demand.primarySkill)) {
    if (employee.primarySkillExperience < demand.experienceRange.min) {
      const experienceGap = demand.experienceRange.min - employee.primarySkillExperience;
      missingSkills.push(`${demand.primarySkill} (${experienceGap} more years needed)`);
    }
  } else {
    missingSkills.push(demand.primarySkill);
  }
  
  // Check secondary skills
  if (demand.secondarySkills && demand.secondarySkills.length > 0) {
    demand.secondarySkills.forEach(demandSecSkill => {
      const hasSkill = employee.secondarySkills.some(empSecSkill => 
        areSkillsSimilar(empSecSkill.skill, demandSecSkill)
      );
      if (!hasSkill) {
        missingSkills.push(demandSecSkill);
      }
    });
  }
  
  return missingSkills;
}

/**
 * Generate skills matched details
 */
function generateSkillsMatched(employee, demand) {
  const skillsMatched = [];
  
  // Primary skill
  if (areSkillsSimilar(employee.primarySkill, demand.primarySkill)) {
    skillsMatched.push({
      skill: employee.primarySkill,
      required: true,
      employeeExperience: employee.primarySkillExperience,
      requiredExperience: demand.experienceRange.min
    });
  }
  
  // Secondary skills
  if (demand.secondarySkills && demand.secondarySkills.length > 0) {
    demand.secondarySkills.forEach(demandSecSkill => {
      const matchedSecSkill = employee.secondarySkills.find(empSecSkill => 
        areSkillsSimilar(empSecSkill.skill, demandSecSkill)
      );
      if (matchedSecSkill) {
        skillsMatched.push({
          skill: matchedSecSkill.skill,
          required: false,
          employeeExperience: matchedSecSkill.experience,
          requiredExperience: 0 // Secondary skills don't have specific experience requirements
        });
      }
    });
  }
  
  return skillsMatched;
}

/**
 * Main function to generate matches for a demand
 */
async function generateMatches(demandId) {
  try {
    // Get the demand
    const demand = await Demand.findById(demandId);
    if (!demand) {
      throw new Error('Demand not found');
    }
    
    // Get all available employees
    const employees = await EmployeeProfile.find({
      status: { $in: ['Available', 'Training'] }
    });
    
    // Clear existing matches for this demand
    await Match.deleteMany({ demandId });
    
    const matches = [];
    
    for (const employee of employees) {
      // Calculate match score
      const matchScore = calculateMatchScore(employee, demand);
      
      // Find missing skills
      const missingSkills = findMissingSkills(employee, demand);
      
      // Determine match type
      const matchType = determineMatchType(matchScore, missingSkills);
      
      // Generate skills matched
      const skillsMatched = generateSkillsMatched(employee, demand);
      
      // Create match record
      const match = new Match({
        demandId: demand._id,
        employeeId: employee._id,
        matchType,
        matchScore,
        missingSkills,
        skillsMatched,
        status: 'Pending'
      });
      
      await match.save();
      matches.push(match);
    }
    
    // Sort matches by score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Populate the matches before returning
    const populatedMatches = await Match.find({ demandId })
      .populate('employeeId', 'employeeId name email primarySkill primarySkillExperience secondarySkills')
      .sort({ matchScore: -1 });
    
    return populatedMatches;
  } catch (error) {
    console.error('Generate matches error:', error);
    throw error;
  }
}

/**
 * Get match recommendations for an employee
 */
async function getEmployeeRecommendations(employeeId) {
  try {
    const employee = await EmployeeProfile.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Get open demands
    const demands = await Demand.find({ status: 'Open' });
    
    const recommendations = [];
    
    for (const demand of demands) {
      const matchScore = calculateMatchScore(employee, demand);
      const missingSkills = findMissingSkills(employee, demand);
      const matchType = determineMatchType(matchScore, missingSkills);
      
      if (matchScore >= 40) { // Only recommend if there's reasonable potential
        recommendations.push({
          demand,
          matchScore,
          matchType,
          missingSkills
        });
      }
    }
    
    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);
    
    return recommendations;
  } catch (error) {
    console.error('Get employee recommendations error:', error);
    throw error;
  }
}

module.exports = {
  generateMatches,
  getEmployeeRecommendations,
  calculateMatchScore,
  areSkillsSimilar
};