const { validateInput } = require('./src/middleware/security');

// Mock request and response objects
const mockReq = {
  body: {
    email: '<script>alert("xss")</script>',
    password: 'test'
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
  console.log('✅ Validation passed - next() called');
};

console.log('Testing input validation middleware...');
console.log('Input:', mockReq.body);

validateInput(mockReq, mockRes, mockNext);

if (mockRes.statusCode === 400) {
  console.log('✅ Input validation working - malicious input blocked');
  console.log('Response:', mockRes.jsonData);
} else {
  console.log('❌ Input validation not working - malicious input allowed');
}
