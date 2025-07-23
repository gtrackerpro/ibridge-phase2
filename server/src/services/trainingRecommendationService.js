const natural = require('natural');
const { areSkillsSimilar } = require('./matchingService');
const { SKILL_SYNONYMS, SKILL_CATEGORIES } = require('./skillData');

/**
 * Generate comprehensive training plan with basic resource links
 * Since training resources are removed, this returns basic placeholder resources
 */
async function generateTrainingPlanResources(skillsToTrain) {
  try {
    const resourceLinks = [];
    
    for (const skillData of skillsToTrain) {
      // Generate basic placeholder resources for each skill
      const basicResources = [
        {
          title: `${skillData.skill} - Online Course`,
          url: `https://www.google.com/search?q=${encodeURIComponent(skillData.skill + ' online course')}`,
          type: 'Course',
          estimatedHours: 20,
          difficulty: skillData.targetLevel >= 5 ? 'Advanced' : skillData.targetLevel >= 3 ? 'Intermediate' : 'Beginner',
          provider: 'Search Results',
          rating: 0,
          cost: 'Free',
          associatedSkill: skillData.skill,
          relevanceScore: 100
        },
        {
          title: `${skillData.skill} - Documentation`,
          url: `https://www.google.com/search?q=${encodeURIComponent(skillData.skill + ' documentation')}`,
          type: 'Documentation',
          estimatedHours: 10,
          difficulty: 'Beginner',
          provider: 'Search Results',
          rating: 0,
          cost: 'Free',
          associatedSkill: skillData.skill,
          relevanceScore: 90
        }
      ];
      
      resourceLinks.push(...basicResources);
    }
    
    return resourceLinks;
  } catch (error) {
    console.error('Generate training plan resources error:', error);
    return []; // Return empty array if there's an error
  }
}

module.exports = {
  generateTrainingPlanResources
};