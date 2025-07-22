const { validatePasswordStrength } = require('./src/middleware/security');

// Mock request and response objects
const mockReq = {
  body: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'weak'
  }
};

const mockRes = {
  statusCode: null,
  jsonData: null,
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.jsonData = data;
    return this;
  }
};

const mockNext = () => {
  console.log('✅ Password validation passed - next() called');
};

console.log('Testing password strength validation middleware...');
console.log('Password:', mockReq.body.password);

validatePasswordStrength(mockReq, mockRes, mockNext);

if (mockRes.statusCode === 400) {
  console.log('✅ Password strength validation working - weak password blocked');
  console.log('Response:', mockRes.jsonData);
} else {
  console.log('❌ Password strength validation not working - weak password allowed');
}
