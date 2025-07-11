const natural = require('natural');
const TrainingResource = require('../models/TrainingResource');
const { areSkillsSimilar, SKILL_SYNONYMS, SKILL_CATEGORIES } = require('./matchingService');

// Skill to category mapping for better resource matching
const SKILL_TO_CATEGORY = {
  'javascript': 'Programming',
  'python': 'Programming',
  'java': 'Programming',
  'react': 'Frontend',
  'angular': 'Frontend',
  'vue': 'Frontend',
  'node.js': 'Backend',
  'spring': 'Backend',
  'django': 'Backend',
  'mysql': 'Database',
  'mongodb': 'Database',
  'postgresql': 'Database',
  'aws': 'Cloud',
  'azure': 'Cloud',
  'docker': 'DevOps',
  'kubernetes': 'DevOps',
  'ios': 'Mobile',
  'android': 'Mobile',
  'machine learning': 'Data',
  'data science': 'Data'
};

/**
 * Find training resources for a specific skill
 */
async function findResourcesForSkill(skill, targetLevel = 1, currentLevel = 0) {
  try {
    const normalizedSkill = skill.toLowerCase().trim();
    
    // Determine difficulty based on experience levels
    let difficulty = 'Beginner';
    if (targetLevel >= 5) {
      difficulty = 'Advanced';
    } else if (targetLevel >= 3) {
      difficulty = 'Intermediate';
    }
    
    // Build search criteria
    const searchCriteria = {
      isActive: true,
      $or: [
        // Direct skill match
        { associatedSkills: { $regex: new RegExp(normalizedSkill, 'i') } },
        // Keyword match
        { keywords: { $regex: new RegExp(normalizedSkill, 'i') } },
        // Title match
        { title: { $regex: new RegExp(normalizedSkill, 'i') } }
      ]
    };
    
    // Add difficulty filter if not beginner
    if (difficulty !== 'Beginner') {
      searchCriteria.difficulty = { $in: [difficulty, 'Intermediate'] };
    }
    
    // Find category for the skill
    const category = findSkillCategory(normalizedSkill);
    if (category) {
      searchCriteria.category = category;
    }
    
    let resources = await TrainingResource.find(searchCriteria)
      .populate('createdBy', 'name email')
      .sort({ rating: -1, estimatedHours: 1 });
    
    // If no direct matches, try synonym matching
    if (resources.length === 0) {
      const synonymResources = await findResourcesBySynonyms(normalizedSkill);
      resources = synonymResources;
    }
    
    // Score and rank resources
    const scoredResources = resources.map(resource => ({
      ...resource.toObject(),
      relevanceScore: calculateResourceRelevance(resource, normalizedSkill, targetLevel)
    }));
    
    // Sort by relevance score and return top results
    return scoredResources
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Limit to top 5 resources per skill
      
  } catch (error) {
    console.error('Find resources for skill error:', error);
    throw error;
  }
}

/**
 * Find resources using skill synonyms
 */
async function findResourcesBySynonyms(skill) {
  const synonyms = [];
  
  // Find synonyms from SKILL_SYNONYMS
  for (const [key, values] of Object.entries(SKILL_SYNONYMS)) {
    if (key.includes(skill) || skill.includes(key)) {
      synonyms.push(key, ...values);
    } else {
      for (const synonym of values) {
        if (synonym.includes(skill) || skill.includes(synonym)) {
          synonyms.push(key, ...values);
          break;
        }
      }
    }
  }
  
  if (synonyms.length === 0) return [];
  
  const searchCriteria = {
    isActive: true,
    $or: synonyms.map(synonym => ({
      $or: [
        { associatedSkills: { $regex: new RegExp(synonym, 'i') } },
        { keywords: { $regex: new RegExp(synonym, 'i') } },
        { title: { $regex: new RegExp(synonym, 'i') } }
      ]
    }))
  };
  
  return await TrainingResource.find(searchCriteria)
    .populate('createdBy', 'name email')
    .sort({ rating: -1 });
}

/**
 * Find skill category
 */
function findSkillCategory(skill) {
  // Direct mapping
  if (SKILL_TO_CATEGORY[skill]) {
    return SKILL_TO_CATEGORY[skill];
  }
  
  // Check SKILL_CATEGORIES
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    for (const categorySkill of skills) {
      if (areSkillsSimilar(skill, categorySkill)) {
        return category.charAt(0).toUpperCase() + category.slice(1);
      }
    }
  }
  
  return null;
}

/**
 * Calculate resource relevance score
 */
function calculateResourceRelevance(resource, skill, targetLevel) {
  let score = 0;
  
  // Direct skill match in associatedSkills (highest weight)
  const directMatch = resource.associatedSkills.some(s => 
    areSkillsSimilar(s, skill)
  );
  if (directMatch) score += 50;
  
  // Title relevance
  const titleSimilarity = natural.JaroWinklerDistance(
    resource.title.toLowerCase(), 
    skill.toLowerCase()
  );
  score += titleSimilarity * 20;
  
  // Keyword match
  const keywordMatch = resource.keywords.some(k => 
    areSkillsSimilar(k, skill)
  );
  if (keywordMatch) score += 15;
  
  // Difficulty appropriateness
  const difficultyScore = calculateDifficultyScore(resource.difficulty, targetLevel);
  score += difficultyScore * 10;
  
  // Rating bonus
  score += resource.rating * 2;
  
  // Cost preference (free resources get slight bonus)
  if (resource.cost === 'Free') score += 3;
  
  return Math.round(score);
}

/**
 * Calculate difficulty appropriateness score
 */
function calculateDifficultyScore(resourceDifficulty, targetLevel) {
  const difficultyMap = {
    'Beginner': 1,
    'Intermediate': 3,
    'Advanced': 5
  };
  
  const resourceLevel = difficultyMap[resourceDifficulty] || 1;
  const difference = Math.abs(resourceLevel - targetLevel);
  
  // Perfect match gets full score, decreasing with difference
  return Math.max(0, 10 - difference * 2);
}

/**
 * Generate comprehensive training plan with dynamic resources
 */
async function generateTrainingPlanResources(skillsToTrain) {
  try {
    const resourceLinks = [];
    
    for (const skillData of skillsToTrain) {
      const resources = await findResourcesForSkill(
        skillData.skill, 
        skillData.targetLevel, 
        skillData.currentLevel
      );
      
      // Add top resources for this skill
      resources.forEach(resource => {
        resourceLinks.push({
          title: resource.title,
          url: resource.url,
          type: resource.type,
          estimatedHours: resource.estimatedHours,
          difficulty: resource.difficulty,
          provider: resource.provider,
          rating: resource.rating,
          cost: resource.cost,
          associatedSkill: skillData.skill,
          relevanceScore: resource.relevanceScore
        });
      });
    }
    
    // Sort by relevance and remove duplicates
    const uniqueResources = resourceLinks
      .filter((resource, index, self) => 
        index === self.findIndex(r => r.url === resource.url)
      )
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return uniqueResources;
  } catch (error) {
    console.error('Generate training plan resources error:', error);
    throw error;
  }
}

/**
 * Get recommended resources for skill gaps
 */
async function getSkillGapRecommendations(skillGaps) {
  try {
    const recommendations = [];
    
    for (const gap of skillGaps) {
      const resources = await findResourcesForSkill(gap.skill, 3, 0); // Assume intermediate target
      
      recommendations.push({
        skill: gap.skill,
        urgency: gap.urgency,
        demandCount: gap.demandCount,
        recommendedResources: resources.slice(0, 3) // Top 3 resources per skill
      });
    }
    
    return recommendations.sort((a, b) => b.demandCount - a.demandCount);
  } catch (error) {
    console.error('Get skill gap recommendations error:', error);
    throw error;
  }
}

module.exports = {
  findResourcesForSkill,
  generateTrainingPlanResources,
  getSkillGapRecommendations,
  calculateResourceRelevance,
  findSkillCategory
};