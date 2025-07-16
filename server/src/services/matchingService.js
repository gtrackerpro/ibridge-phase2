const natural = require('natural');
const EmployeeProfile = require('../models/EmployeeProfile');
const Demand = require('../models/Demand');
const Match = require('../models/Match');
const semanticMatchingService = require('./semanticMatchingService');

// Initialize stemmer for better text matching
const stemmer = natural.PorterStemmer;

// Enhanced skill similarity threshold (lowered for better matching)
const SIMILARITY_THRESHOLD = 0.65;

// Comprehensive skill synonyms and related terms
const SKILL_SYNONYMS = {
  // Programming Languages
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'node.js', 'nodejs', 'typescript', 'ts'],
  'python': ['py', 'python3', 'django', 'flask', 'fastapi'],
  'java': ['jvm', 'spring', 'spring boot', 'hibernate'],
  'c#': ['csharp', 'dotnet', '.net', 'asp.net'],
  'php': ['laravel', 'symfony', 'codeigniter'],
  'ruby': ['rails', 'ruby on rails', 'ror'],
  'go': ['golang'],
  'kotlin': ['android kotlin'],
  'swift': ['ios swift'],
  
  // Frontend Technologies
  'react': ['reactjs', 'react.js', 'react native', 'jsx'],
  'angular': ['angularjs', 'angular2', 'angular4', 'angular8', 'angular12', 'typescript'],
  'vue': ['vuejs', 'vue.js', 'nuxt', 'nuxt.js'],
  'html': ['html5', 'markup', 'web markup'],
  'css': ['css3', 'scss', 'sass', 'less', 'stylus'],
  'bootstrap': ['bootstrap4', 'bootstrap5', 'responsive design'],
  'tailwind': ['tailwindcss', 'utility-first css'],
  
  // Backend Technologies
  'node.js': ['nodejs', 'express', 'express.js', 'javascript backend'],
  'spring': ['spring boot', 'spring framework', 'java backend'],
  'django': ['python web', 'python backend'],
  'flask': ['python microframework'],
  'laravel': ['php framework'],
  'rails': ['ruby on rails', 'ror'],
  
  // Databases
  'database': ['db', 'sql', 'nosql', 'rdbms'],
  'mysql': ['sql', 'relational database', 'rdbms'],
  'postgresql': ['postgres', 'sql', 'relational database'],
  'mongodb': ['mongo', 'nosql', 'document database'],
  'redis': ['cache', 'in-memory database'],
  'elasticsearch': ['elastic', 'search engine'],
  'oracle': ['oracle db', 'sql'],
  'sql server': ['mssql', 'microsoft sql'],
  
  // Cloud & DevOps
  'aws': ['amazon web services', 'ec2', 's3', 'lambda', 'cloudformation'],
  'azure': ['microsoft azure', 'azure cloud'],
  'gcp': ['google cloud', 'google cloud platform'],
  'docker': ['containerization', 'containers'],
  'kubernetes': ['k8s', 'container orchestration'],
  'jenkins': ['ci/cd', 'continuous integration'],
  'terraform': ['infrastructure as code', 'iac'],
  'ansible': ['configuration management', 'automation'],
  
  // Development Practices
  'devops': ['deployment', 'ci/cd', 'docker', 'kubernetes', 'automation'],
  'agile': ['scrum', 'kanban', 'sprint planning'],
  'testing': ['qa', 'quality assurance', 'automation testing', 'unit testing'],
  'tdd': ['test driven development', 'unit testing'],
  'microservices': ['service oriented architecture', 'soa', 'distributed systems'],
  
  // UI/UX
  'frontend': ['front-end', 'ui', 'user interface', 'client-side'],
  'backend': ['back-end', 'server-side', 'api development'],
  'fullstack': ['full-stack', 'full stack developer'],
  'ui/ux': ['user interface', 'user experience', 'design'],
  'responsive design': ['mobile first', 'adaptive design'],
  
  // Data & Analytics
  'data science': ['machine learning', 'ml', 'data analysis', 'statistics'],
  'machine learning': ['ml', 'ai', 'artificial intelligence', 'deep learning'],
  'data analysis': ['analytics', 'business intelligence', 'bi'],
  'big data': ['hadoop', 'spark', 'data processing'],
  
  // Mobile Development
  'mobile': ['ios', 'android', 'react native', 'flutter'],
  'ios': ['swift', 'objective-c', 'xcode'],
  'android': ['kotlin', 'java android', 'android studio'],
  'react native': ['cross-platform mobile', 'mobile development'],
  'flutter': ['dart', 'cross-platform mobile'],
  
  // Project Management
  'project management': ['pm', 'pmp', 'agile', 'scrum master'],
  'business analysis': ['ba', 'requirements gathering', 'stakeholder management'],
  'product management': ['product owner', 'roadmap planning', 'feature prioritization']
};

// Skill categories for better matching
const SKILL_CATEGORIES = {
  'programming': ['javascript', 'python', 'java', 'c#', 'php', 'ruby', 'go', 'kotlin', 'swift'],
  'frontend': ['react', 'angular', 'vue', 'html', 'css', 'bootstrap', 'tailwind'],
  'backend': ['node.js', 'spring', 'django', 'flask', 'laravel', 'rails'],
  'database': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle'],
  'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
  'mobile': ['ios', 'android', 'react native', 'flutter'],
  'data': ['data science', 'machine learning', 'data analysis', 'big data']
};

/**
 * Enhanced skill similarity calculation using multiple algorithms
 */
async function calculateSkillSimilarity(skill1, skill2) {
  const normalizedSkill1 = skill1.toLowerCase().trim();
  const normalizedSkill2 = skill2.toLowerCase().trim();
  
  if (normalizedSkill1 === normalizedSkill2) {
    return 1.0;
  }
  
  try {
    // Try semantic similarity first
    const semanticSimilarity = await semanticMatchingService.calculateSemanticSimilarity(normalizedSkill1, normalizedSkill2);
    return semanticSimilarity;
  } catch (error) {
    console.log('Falling back to legacy similarity calculation:', error.message);
    // Fall back to legacy calculation if semantic service fails
  }
  
  // Jaro-Winkler distance
  const jaroWinkler = natural.JaroWinklerDistance(normalizedSkill1, normalizedSkill2);
  
  // Levenshtein distance normalized
  const levenshtein = 1 - (natural.LevenshteinDistance(normalizedSkill1, normalizedSkill2) / 
    Math.max(normalizedSkill1.length, normalizedSkill2.length));
  
  // Dice coefficient for better substring matching
  const dice = natural.DiceCoefficient(normalizedSkill1, normalizedSkill2);
  
  // Combined score with weights
  return (jaroWinkler * 0.4) + (levenshtein * 0.3) + (dice * 0.3);
}

/**
 * Enhanced skill similarity check with comprehensive synonym matching
 */
async function areSkillsSimilar(skill1, skill2) {
  try {
    // Try semantic similarity first
    return await semanticMatchingService.areSkillsSemanticallyRelated(skill1, skill2);
  } catch (error) {
    console.log('Falling back to legacy skill similarity check:', error.message);
    // Fall back to legacy check if semantic service fails
  }
  
  const similarity = await calculateSkillSimilarity(skill1, skill2);
  
  if (similarity >= SIMILARITY_THRESHOLD) {
    return true;
  }
  
  const skill1Lower = skill1.toLowerCase().trim();
  const skill2Lower = skill2.toLowerCase().trim();
  
  // Check direct synonyms
  for (const [key, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    const allVariants = [key, ...synonyms];
    const skill1Match = allVariants.some(variant => 
      skill1Lower.includes(variant) || variant.includes(skill1Lower)
    );
    const skill2Match = allVariants.some(variant => 
      skill2Lower.includes(variant) || variant.includes(skill2Lower)
    );
    
    if (skill1Match && skill2Match) {
      return true;
    }
  }
  
  // Check category matching (skills in same category are somewhat related)
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    const skill1InCategory = skills.some(skill => areSkillsDirectlyRelated(skill1Lower, skill));
    const skill2InCategory = skills.some(skill => areSkillsDirectlyRelated(skill2Lower, skill));
    
    if (skill1InCategory && skill2InCategory) {
      // Lower threshold for same category skills
      return similarity >= 0.4;
    }
  }
  
  return false;
}

/**
 * Check if skills are directly related
 */
function areSkillsDirectlyRelated(skill, categorySkill) {
  const synonyms = SKILL_SYNONYMS[categorySkill] || [];
  return skill.includes(categorySkill) || 
         categorySkill.includes(skill) ||
         synonyms.some(syn => skill.includes(syn) || syn.includes(skill));
}

/**
 * Enhanced match score calculation with refined weights and logic
 */
async function calculateMatchScore(employee, demand) {
  let score = 0;
  const weights = {
    primarySkill: 50,      // Reduced from 60 to allow other factors more influence
    secondarySkills: 25,   // Reduced from 30
    experience: 15,        // New factor for experience quality
    availability: 10       // Same as before
  };
  
  // Primary skill match with enhanced experience evaluation
  let primarySkillScore = 0;
  const primarySkillMatch = await areSkillsSimilar(employee.primarySkill, demand.primarySkill);
  
  if (primarySkillMatch) {
    const minExp = demand.experienceRange.min;
    const maxExp = demand.experienceRange.max;
    const empExp = employee.primarySkillExperience;
    
    if (empExp >= minExp && empExp <= maxExp) {
      // Perfect experience range match
      primarySkillScore = weights.primarySkill;
    } else if (empExp > maxExp) {
      // Over-qualified - still good but slight penalty
      const overQualificationPenalty = Math.min(0.1, (empExp - maxExp) / maxExp * 0.1);
      primarySkillScore = weights.primarySkill * (0.95 - overQualificationPenalty);
    } else if (empExp >= minExp * 0.8) {
      // Slightly under-qualified but close
      const experienceRatio = empExp / minExp;
      primarySkillScore = weights.primarySkill * (0.7 + (experienceRatio * 0.25));
    } else {
      // Significantly under-qualified
      const experienceRatio = empExp / minExp;
      primarySkillScore = weights.primarySkill * Math.max(0.3, experienceRatio * 0.6);
    }
  } else {
    // Check for related skills in same category
    const skillSimilarity = await calculateSkillSimilarity(employee.primarySkill, demand.primarySkill);
    if (skillSimilarity >= 0.4) {
      primarySkillScore = weights.primarySkill * skillSimilarity * 0.6;
    }
  }
  
  score += primarySkillScore;
  
  // Secondary skills match with improved logic
  let secondarySkillScore = 0;
  if (demand.secondarySkills && demand.secondarySkills.length > 0) {
    let matchedSecondarySkills = 0;
    let totalSecondarySkillScore = 0;
    
    demand.secondarySkills.forEach(demandSecSkill => {
      let bestMatch = 0;
      employee.secondarySkills.forEach(async (empSecSkill) => {
        if (areSkillsSimilar(empSecSkill.skill, demandSecSkill)) {
          // Consider experience level for secondary skills too
          const skillScore = Math.min(1, empSecSkill.experience / 2); // Normalize to max 1
          bestMatch = Math.max(bestMatch, skillScore);
        }
      });
      
      if (bestMatch > 0) {
        matchedSecondarySkills++;
        totalSecondarySkillScore += bestMatch;
      }
    });
    
    if (matchedSecondarySkills > 0) {
      const matchRatio = matchedSecondarySkills / demand.secondarySkills.length;
      const avgSkillScore = totalSecondarySkillScore / matchedSecondarySkills;
      secondarySkillScore = weights.secondarySkills * matchRatio * avgSkillScore;
    }
  } else {
    // If no secondary skills required, give full points
    secondarySkillScore = weights.secondarySkills;
  }
  
  score += secondarySkillScore;
  
  // Experience quality bonus
  let experienceScore = 0;
  const minExp = demand.experienceRange.min;
  const maxExp = demand.experienceRange.max;
  const empExp = employee.primarySkillExperience;
  
  if (empExp >= minExp && empExp <= maxExp) {
    // Perfect range
    experienceScore = weights.experience;
  } else if (empExp > maxExp) {
    // Over-qualified
    experienceScore = weights.experience * 0.9;
  } else {
    // Under-qualified
    const ratio = empExp / minExp;
    experienceScore = weights.experience * Math.max(0.2, ratio);
  }
  
  score += experienceScore;
  
  // Availability bonus
  let availabilityScore = 0;
  if (employee.status === 'Available') {
    availabilityScore = weights.availability;
  } else if (employee.status === 'Training') {
    availabilityScore = weights.availability * 0.7;
  } else if (employee.status === 'Allocated') {
    availabilityScore = weights.availability * 0.3;
  }
  
  score += availabilityScore;
  
  return Math.min(Math.round(score), 100);
}

/**
 * Enhanced match type determination with more nuanced categories
 */
function determineMatchType(score, missingSkills, employee, demand) {
  const primarySkillMatch = areSkillsSimilar(employee.primarySkill, demand.primarySkill);
  const experienceGap = demand.experienceRange.min - employee.primarySkillExperience;
  
  if (score >= 85 && missingSkills.length === 0 && primarySkillMatch) {
    return 'Exact';
  } else if (score >= 70 && primarySkillMatch) {
    return 'Near';
  } else if (score >= 50 && (primarySkillMatch || missingSkills.length <= 2)) {
    return 'Near';
  } else {
    return 'Not Eligible';
  }
}

/**
 * Enhanced missing skills identification with prioritization
 */
async function findMissingSkills(employee, demand) {
  const missingSkills = [];
  
  // Check primary skill and experience gap
  const primarySkillMatch = await areSkillsSimilar(employee.primarySkill, demand.primarySkill);
  
  if (!primarySkillMatch) {
    missingSkills.push({
      skill: demand.primarySkill,
      type: 'primary',
      priority: 'high',
      reason: 'Primary skill not matched'
    });
  } else if (employee.primarySkillExperience < demand.experienceRange.min) {
    const experienceGap = demand.experienceRange.min - employee.primarySkillExperience;
    missingSkills.push({
      skill: `${demand.primarySkill} (${experienceGap} more years needed)`,
      type: 'experience',
      priority: experienceGap > 2 ? 'high' : 'medium',
      reason: 'Insufficient experience in primary skill'
    });
  }
  
  // Check secondary skills
  if (demand.secondarySkills && demand.secondarySkills.length > 0) {
    demand.secondarySkills.forEach(demandSecSkill => {
      const hasSkill = employee.secondarySkills.some(async (empSecSkill) => 
        await areSkillsSimilar(empSecSkill.skill, demandSecSkill)
      );
      if (!hasSkill) {
        missingSkills.push({
          skill: demandSecSkill,
          type: 'secondary',
          priority: 'medium',
          reason: 'Secondary skill not found'
        });
      }
    });
  }
  
  // Return simplified array for backward compatibility
  return missingSkills.map(item => item.skill);
}

/**
 * Enhanced skills matched details with better analysis
 */
async function generateSkillsMatched(employee, demand) {
  const skillsMatched = [];
  
  // Primary skill analysis
  const primarySkillMatch = await areSkillsSimilar(employee.primarySkill, demand.primarySkill);
  if (primarySkillMatch) {
    const similarity = await calculateSkillSimilarity(employee.primarySkill, demand.primarySkill);
    skillsMatched.push({
      skill: employee.primarySkill,
      required: true,
      employeeExperience: employee.primarySkillExperience,
      requiredExperience: demand.experienceRange.min,
      similarity: Math.round(similarity * 100),
      matchQuality: employee.primarySkillExperience >= demand.experienceRange.min ? 'good' : 'needs_improvement'
    });
  }
  
  // Secondary skills analysis
  if (demand.secondarySkills && demand.secondarySkills.length > 0) {
    demand.secondarySkills.forEach(demandSecSkill => {
      const matchedSecSkill = employee.secondarySkills.find(async (empSecSkill) => 
        await areSkillsSimilar(empSecSkill.skill, demandSecSkill)
      );
      if (matchedSecSkill) {
        const similarity = await calculateSkillSimilarity(matchedSecSkill.skill, demandSecSkill);
        skillsMatched.push({
          skill: matchedSecSkill.skill,
          required: false,
          employeeExperience: matchedSecSkill.experience,
          requiredExperience: 0,
          similarity: Math.round(similarity * 100),
          matchQuality: 'good'
        });
      }
    });
  }
  
  return skillsMatched;
}

/**
 * Main function to generate matches for a demand with enhanced logic
 */
async function generateMatches(demandId) {
  try {
    // Get the demand
    const demand = await Demand.findById(demandId);
    if (!demand) {
      throw new Error('Demand not found');
    }
    
    // Get all available employees (expanded to include training status)
    const employees = await EmployeeProfile.find({
      status: { $in: ['Available', 'Training', 'Allocated'] }
    });
    
    // Clear existing matches for this demand
    await Match.deleteMany({ demandId });
    
    const matches = [];
    
    for (const employee of employees) {
      // Calculate enhanced match score
      const matchScore = await calculateMatchScore(employee, demand);
      
      // Find missing skills with enhanced analysis
      const missingSkills = await findMissingSkills(employee, demand);
      
      // Determine match type with refined logic
      const matchType = determineMatchType(matchScore, missingSkills, employee, demand);
      
      // Generate enhanced skills matched analysis
      const skillsMatched = await generateSkillsMatched(employee, demand);
      
      // Only create matches above a minimum threshold
      if (matchScore >= 30) {
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
    }
    
    // Sort matches by score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Populate the matches before returning
    const populatedMatches = await Match.find({ 
      demandId,
      matchScore: { $gte: 30 } // Only return matches above threshold
    })
      .populate('employeeId', 'employeeId name email primarySkill primarySkillExperience secondarySkills status')
      .sort({ matchScore: -1 });
    
    return populatedMatches;
  } catch (error) {
    console.error('Generate matches error:', error);
    throw error;
  }
}

/**
 * Get match recommendations for an employee with enhanced scoring
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
      const matchScore = await calculateMatchScore(employee, demand);
      const missingSkills = await findMissingSkills(employee, demand);
      const matchType = determineMatchType(matchScore, missingSkills, employee, demand);
      
      if (matchScore >= 40) { // Slightly higher threshold for recommendations
        recommendations.push({
          demand,
          matchScore,
          matchType,
          missingSkills,
          skillsMatched: await generateSkillsMatched(employee, demand)
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

/**
 * Analyze skill gaps across the organization
 */
async function analyzeSkillGaps() {
  try {
    const demands = await Demand.find({ status: { $in: ['Open', 'In Progress'] } });
    const employees = await EmployeeProfile.find({ status: { $in: ['Available', 'Training'] } });
    
    const skillGaps = {};
    
    for (const demand of demands) {
      const matches = [];
      
      for (const employee of employees) {
        const matchScore = calculateMatchScore(employee, demand);
        const missingSkills = findMissingSkills(employee, demand);
        
        matches.push({
          employee,
          matchScore,
          missingSkills
        });
      }
      
      // Find the best match for this demand
      const bestMatch = matches.reduce((best, current) => 
        current.matchScore > best.matchScore ? current : best
      );
      
      // If even the best match has missing skills, record them as gaps
      if (bestMatch.missingSkills.length > 0) {
        bestMatch.missingSkills.forEach(skill => {
          if (!skillGaps[skill]) {
            skillGaps[skill] = {
              skill,
              demandCount: 0,
              urgency: 'medium',
              affectedDemands: []
            };
          }
          skillGaps[skill].demandCount++;
          skillGaps[skill].affectedDemands.push(demand.demandId);
          
          // Increase urgency based on demand priority
          if (demand.priority === 'Critical' || demand.priority === 'High') {
            skillGaps[skill].urgency = 'high';
          }
        });
      }
    }
    
    return Object.values(skillGaps).sort((a, b) => b.demandCount - a.demandCount);
  } catch (error) {
    console.error('Analyze skill gaps error:', error);
    throw error;
  }
}

module.exports = {
  generateMatches,
  getEmployeeRecommendations,
  calculateMatchScore,
  areSkillsSimilar,
  calculateSkillSimilarity,
  analyzeSkillGaps,
  SKILL_SYNONYMS,
  SKILL_CATEGORIES,
  // Export semantic matching functions for direct use
  semanticMatchingService
};