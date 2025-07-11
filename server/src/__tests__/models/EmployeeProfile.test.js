const EmployeeProfile = require('../../models/EmployeeProfile');
const User = require('../../models/User');

describe('EmployeeProfile Model', () => {
  let testUser;

  beforeEach(async () => {
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashedpassword'
    });
    await testUser.save();
  });

  describe('Employee Creation', () => {
    it('should create a valid employee profile', async () => {
      const employeeData = {
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john@example.com',
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        BU: 'Technology',
        createdBy: testUser._id
      };

      const employee = new EmployeeProfile(employeeData);
      const savedEmployee = await employee.save();

      expect(savedEmployee._id).toBeDefined();
      expect(savedEmployee.employeeId).toBe(employeeData.employeeId);
      expect(savedEmployee.status).toBe('Available');
    });

    it('should require employeeId field', async () => {
      const employeeData = {
        name: 'John Doe',
        email: 'john@example.com',
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        BU: 'Technology',
        createdBy: testUser._id
      };

      const employee = new EmployeeProfile(employeeData);
      
      await expect(employee.save()).rejects.toThrow();
    });

    it('should validate status enum', async () => {
      const employeeData = {
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john@example.com',
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        BU: 'Technology',
        status: 'InvalidStatus',
        createdBy: testUser._id
      };

      const employee = new EmployeeProfile(employeeData);
      
      await expect(employee.save()).rejects.toThrow();
    });

    it('should validate negative experience', async () => {
      const employeeData = {
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john@example.com',
        primarySkill: 'JavaScript',
        primarySkillExperience: -1,
        BU: 'Technology',
        createdBy: testUser._id
      };

      const employee = new EmployeeProfile(employeeData);
      
      await expect(employee.save()).rejects.toThrow();
    });

    it('should handle secondary skills correctly', async () => {
      const employeeData = {
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john@example.com',
        primarySkill: 'JavaScript',
        primarySkillExperience: 5,
        secondarySkills: [
          { skill: 'React', experience: 3 },
          { skill: 'Node.js', experience: 2 }
        ],
        BU: 'Technology',
        createdBy: testUser._id
      };

      const employee = new EmployeeProfile(employeeData);
      const savedEmployee = await employee.save();

      expect(savedEmployee.secondarySkills).toHaveLength(2);
      expect(savedEmployee.secondarySkills[0].skill).toBe('React');
      expect(savedEmployee.secondarySkills[0].experience).toBe(3);
    });
  });
});