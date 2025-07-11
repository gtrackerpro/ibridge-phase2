const { 
  calculateMatchScore, 
  areSkillsSimilar, 
  generateMatches,
  calculateSkillSimilarity,
  analyzeSkillGaps,
  SKILL_SYNONYMS
} = require('../../services/matchingService');
const EmployeeProfile = require('../../models/EmployeeProfile');
const Demand = require('../../models/Demand');
const User = require('../../models/User');

describe('Matching Service', () => {
  let testUser;

  beforeEach(async () => {
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashedpassword'
    });
    await testUser.save();
  });

  describe('areSkillsSimilar', () => {
    it('should match exact skills', () => {
      expect(areSkillsSimilar('JavaScript', 'JavaScript')).toBe(true);
      expect(areSkillsSimilar('Python', 'Python')).toBe(true);
    });

    it('should match case-insensitive skills', () => {
      expect(areSkillsSimilar('javascript', 'JavaScript')).toBe(true);
      expect(areSkillsSimilar('PYTHON', 'python')).toBe(true);
    });

    it('should match similar skills using enhanced synonyms', () => {
      expect(areSkillsSimilar('JavaScript', 'JS')).toBe(true);
      expect(areSkillsSimilar('React', 'ReactJS')).toBe(true);
      expect(areSkillsSimilar('Node.js', 'NodeJS')).toBe(true);
      expect(areSkillsSimilar('TypeScript', 'JavaScript')).toBe(true);
      expect(areSkillsSimilar('AWS', 'Amazon Web Services')).toBe(true);
    });

    it('should not match different skills', () => {
      expect(areSkillsSimilar('JavaScript', 'Python')).toBe(false);
      expect(areSkillsSimilar('React', 'Angular')).toBe(false);
    });

    it('should handle comprehensive synonyms', () => {
      expect(areSkillsSimilar('Database', 'SQL')).toBe(true);
      expect(areSkillsSimilar('Frontend', 'UI')).toBe(true);
      expect(areSkillsSimilar('Backend', 'Server-side')).toBe(true);
      expect(areSkillsSimilar('Machine Learning', 'ML')).toBe(true);
      expect(areSkillsSimilar('Docker', 'Containerization')).toBe(true);
    });

    it('should match skills in same category', () => {
      expect(areSkillsSimilar('React', 'Angular')).toBe(false); // Different frameworks
      expect(areSkillsSimilar('MySQL', 'PostgreSQL')).toBe(true); // Both SQL databases
      expect(areSkillsSimilar('AWS', 'Azure')).toBe(true); // Both cloud platforms
    });
  });

  describe('calculateSkillSimilarity', () => {
    it('should return 1.0 for identical skills', () => {
      expect(calculateSkillSimilarity('JavaScript', 'JavaScript')).toBe(1.0);
    });

    it('should return high similarity for very similar skills', () => {
      const similarity = calculateSkillSimilarity('JavaScript', 'Javascript');
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should return low similarity for different skills', () => {
      const similarity = calculateSkillSimilarity('JavaScript', 'Python');
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('calculateMatchScore', () => {
    it('should give high score for exact match with refined weights', () => {
      const employee = {
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        secondarySkills: [
          { skill: 'React', experience: 3 },
          { skill: 'Node.js', experience: 2 }
        ],
        status: 'Available'
      };

      const demand = {
        primarySkill: 'JavaScript',
        experienceRange: { min: 3, max: 7 },
        secondarySkills: ['React', 'Node.js']
      };

      const score = calculateMatchScore(employee, demand);
      expect(score).toBeGreaterThan(85);
    });

    it('should penalize under-qualified candidates appropriately', () => {
      const employee = {
        primarySkill: 'JavaScript',
        primarySkillExperience: 2,
        secondarySkills: [],
        status: 'Available'
      };

      const demand = {
        primarySkill: 'JavaScript',
        experienceRange: { min: 5, max: 8 },
        secondarySkills: []
      };

      const score = calculateMatchScore(employee, demand);
      expect(score).toBeLessThan(65);
    });

    it('should handle over-qualified candidates with minimal penalty', () => {
      const employee = {
        primarySkill: 'JavaScript',
        primarySkillExperience: 10,
        secondarySkills: [],
        status: 'Available'
      };

      const demand = {
        primarySkill: 'JavaScript',
        experienceRange: { min: 3, max: 5 },
        secondarySkills: []
      };

      const score = calculateMatchScore(employee, demand);
      expect(score).toBeGreaterThan(75);
    });

    it('should consider availability status', () => {
      const availableEmployee = {
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        secondarySkills: [],
        status: 'Available'
      };

      const allocatedEmployee = {
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        secondarySkills: [],
        status: 'Allocated'
      };

      const demand = {
        primarySkill: 'JavaScript',
        experienceRange: { min: 3, max: 7 },
        secondarySkills: []
      };

      const availableScore = calculateMatchScore(availableEmployee, demand);
      const allocatedScore = calculateMatchScore(allocatedEmployee, demand);

      expect(availableScore).toBeGreaterThan(allocatedScore);
    });

    it('should properly weight secondary skills with experience', () => {
      const employee = {
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        secondarySkills: [
          { skill: 'React', experience: 4 },
          { skill: 'Node.js', experience: 3 }
        ],
        status: 'Available'
      };

      const demand = {
        primarySkill: 'JavaScript',
        experienceRange: { min: 3, max: 7 },
        secondarySkills: ['React', 'Node.js']
      };

      const score = calculateMatchScore(employee, demand);
      expect(score).toBeGreaterThan(90);
    });
  });

  describe('analyzeSkillGaps', () => {
    it('should identify skill gaps across organization', async () => {
      // Create test data
      const employee = new EmployeeProfile({
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john@example.com',
        primarySkill: 'JavaScript',
        primarySkillExperience: 3,
        BU: 'Technology',
        status: 'Available',
        createdBy: testUser._id
      });
      await employee.save();

      const demand = new Demand({
        demandId: 'DEM001',
        accountName: 'Test Account',
        projectName: 'Test Project',
        positionTitle: 'Senior Developer',
        primarySkill: 'Python', // Different skill
        experienceRange: { min: 5, max: 8 },
        startDate: new Date(),
        priority: 'High',
        createdBy: testUser._id
      });
      await demand.save();

      const skillGaps = await analyzeSkillGaps();

      expect(skillGaps).toBeDefined();
      expect(Array.isArray(skillGaps)).toBe(true);
      if (skillGaps.length > 0) {
        expect(skillGaps[0]).toHaveProperty('skill');
        expect(skillGaps[0]).toHaveProperty('demandCount');
        expect(skillGaps[0]).toHaveProperty('urgency');
      }
    });
  });

  describe('generateMatches', () => {
    it('should generate matches for a demand', async () => {
      // Create test employee
      const employee = new EmployeeProfile({
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john@example.com',
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        BU: 'Technology',
        status: 'Available',
        createdBy: testUser._id
      });
      await employee.save();

      // Create test demand
      const demand = new Demand({
        demandId: 'DEM001',
        accountName: 'Test Account',
        projectName: 'Test Project',
        positionTitle: 'Developer',
        primarySkill: 'JavaScript',
        experienceRange: { min: 3, max: 7 },
        startDate: new Date(),
        createdBy: testUser._id
      });
      await demand.save();

      const matches = await generateMatches(demand._id);

      expect(matches).toHaveLength(1);
      expect(matches[0].employeeId.toString()).toBe(employee._id.toString());
      expect(matches[0].matchScore).toBeGreaterThan(0);
      expect(['Exact', 'Near', 'Not Eligible']).toContain(matches[0].matchType);
    });
  });
});