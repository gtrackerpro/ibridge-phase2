const User = require('../../models/User');

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a valid user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashedpassword123',
        role: 'Employee'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isActive).toBe(true);
    });

    it('should require name field', async () => {
      const userData = {
        email: 'john@example.com',
        passwordHash: 'hashedpassword123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should require email field', async () => {
      const userData = {
        name: 'John Doe',
        passwordHash: 'hashedpassword123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        passwordHash: 'hashedpassword123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashedpassword123'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      
      await expect(user2.save()).rejects.toThrow();
    });

    it('should validate role enum', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashedpassword123',
        role: 'InvalidRole'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    it('should compare password correctly', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'password123'
      });

      await user.save();

      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should exclude password from JSON output', async () => {
      const user = new User({
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'password123'
      });

      await user.save();

      const userJSON = user.toJSON();
      expect(userJSON.passwordHash).toBeUndefined();
      expect(userJSON.name).toBe('John Doe');
    });
  });
});