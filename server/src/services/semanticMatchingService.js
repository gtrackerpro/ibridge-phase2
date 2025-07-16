const axios = require('axios');
const natural = require('natural');
const { SKILL_SYNONYMS, SKILL_CATEGORIES } = require('./skillData');

// Configuration for the semantic matching service
const SEMANTIC_MATCHING_API_URL = process.env.SEMANTIC_MATCHING_API_URL || 'http://localhost:8000';
const FALLBACK_TO_LEGACY = process.env.FALLBACK_TO_LEGACY === 'true' || true;
const SIMILARITY_THRESHOLD = 0.65; // Threshold for semantic similarity

/**
 * Calculate semantic similarity between two skills using the AI service
 * @param {string} skill1 - First skill
 * @param {string} skill2 - Second skill
 * @returns {Promise<number>} - Similarity score between 0 and 1
 */
async function calculateSemanticSimilarity(skill1, skill2) {
  try {
    const response = await axios.post(`${SEMANTIC_MATCHING_API_URL}/match-skills`, {
      skill1: skill1.toLowerCase().trim(),
      skill2: skill2.toLowerCase().trim()
    });
    
    return response.data.similarity;
  } catch (error) {
    console.error('Semantic matching service error:', error.message);
    
    // Fallback to legacy matching if semantic service fails
    if (FALLBACK_TO_LEGACY) {
      console.log('Falling back to legacy matching method');
      return calculateLegacySimilarity(skill1, skill2);
    }
    
    throw error;
  }
}

/**
 * Legacy similarity calculation as fallback
 * @param {string} skill1 - First skill
 * @param {string} skill2 - Second skill
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateLegacySimilarity(skill1, skill2) {
  const normalizedSkill1 = skill1.toLowerCase().trim();
  const normalizedSkill2 = skill2.toLowerCase().trim();
  
  if (normalizedSkill1 === normalizedSkill2) {
    return 1.0;
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
 * Check if two skills are semantically similar
 * @param {string} skill1 - First skill
 * @param {string} skill2 - Second skill
 * @returns {Promise<boolean>} - True if skills are similar
 */
async function areSkillsSemanticallyRelated(skill1, skill2) {
  try {
    const similarity = await calculateSemanticSimilarity(skill1, skill2);
    return similarity >= SIMILARITY_THRESHOLD;
  } catch (error) {
    console.error('Semantic skill relation check error:', error.message);
    
    // Fallback to legacy matching
    if (FALLBACK_TO_LEGACY) {
      console.log('Falling back to legacy skill relation check');
      return areSkillsDirectlyRelated(skill1.toLowerCase().trim(), skill2.toLowerCase().trim());
    }
    
    throw error;
  }
}

/**
 * Legacy check if skills are directly related (from existing code)
 */
function areSkillsDirectlyRelated(skill, categorySkill) {
  const synonyms = SKILL_SYNONYMS[categorySkill] || [];
  return skill.includes(categorySkill) || 
         categorySkill.includes(skill) ||
         synonyms.some(syn => skill.includes(syn) || syn.includes(skill));
}

/**
 * Get semantic embeddings for a list of skills
 * @param {string[]} skills - List of skills to embed
 * @returns {Promise<Object>} - Object with skill embeddings
 */
async function getSkillEmbeddings(skills) {
  try {
    const response = await axios.post(`${SEMANTIC_MATCHING_API_URL}/embed-skills`, {
      skills: skills.map(s => s.toLowerCase().trim())
    });
    
    return response.data.embeddings;
  } catch (error) {
    console.error('Skill embedding error:', error.message);
    throw error;
  }
}

/**
 * Find semantically similar skills from a list
 * @param {string} targetSkill - Skill to find similar skills for
 * @param {string[]} skillList - List of skills to search in
 * @returns {Promise<Array<{skill: string, similarity: number}>>} - Sorted list of similar skills with scores
 */
async function findSimilarSkills(targetSkill, skillList) {
  try {
    const response = await axios.post(`${SEMANTIC_MATCHING_API_URL}/find-similar-skills`, {
      targetSkill: targetSkill.toLowerCase().trim(),
      skillList: skillList.map(s => s.toLowerCase().trim())
    });
    
    return response.data.similarSkills;
  } catch (error) {
    console.error('Find similar skills error:', error.message);
    
    // Fallback to legacy matching
    if (FALLBACK_TO_LEGACY) {
      console.log('Falling back to legacy similar skills finder');
      return skillList.map(skill => ({
        skill,
        similarity: calculateLegacySimilarity(targetSkill, skill)
      })).sort((a, b) => b.similarity - a.similarity);
    }
    
    throw error;
  }
}

/**
 * Generate semantic match analysis between employee and demand
 * @param {Object} employee - Employee profile with skills
 * @param {Object} demand - Demand with required skills
 * @returns {Promise<Object>} - Comprehensive match analysis
 */
async function generateSemanticMatchAnalysis(employee, demand) {
  try {
    const employeeSkills = [
      employee.primarySkill,
      ...employee.secondarySkills.map(s => s.skill)
    ];
    
    const demandSkills = [
      demand.primarySkill,
      ...(demand.secondarySkills || [])
    ];
    
    const response = await axios.post(`${SEMANTIC_MATCHING_API_URL}/analyze-match`, {
      employeeSkills,
      employeeExperience: {
        [employee.primarySkill]: employee.primarySkillExperience,
        ...Object.fromEntries(employee.secondarySkills.map(s => [s.skill, s.experience]))
      },
      demandSkills,
      demandRequirements: {
        primarySkill: demand.primarySkill,
        experienceRange: demand.experienceRange
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Semantic match analysis error:', error.message);
    
    // No fallback for this comprehensive analysis
    // Return a simplified response instead
    return {
      matchScore: 0,
      matchType: 'Unknown',
      missingSkills: [],
      skillsMatched: [],
      error: 'Semantic matching service unavailable'
    };
  }
}

module.exports = {
  calculateSemanticSimilarity,
  areSkillsSemanticallyRelated,
  getSkillEmbeddings,
  findSimilarSkills,
  generateSemanticMatchAnalysis
};