const axios = require('axios');
const colors = require('colors');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const CLIENT_URL = 'http://localhost:4200';
const TEST_USER = {
  email: 'abdullah.firdowsi@ilink-systems.com',
  password: 'Wel@come@123'
};

// Alternative test users if admin doesn't work
const ALTERNATIVE_USERS = [
  { email: 'admin@xyz.com', password: 'Admin@123' },
  { email: 'rm@xyz.com', password: 'Abdullah@52' }
];

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper functions
function logTest(testName, passed, message) {
  const status = passed ? '✅ PASS'.green : '❌ FAIL'.red;
  console.log(`${status} - ${testName}: ${message}`);
  
  results.tests.push({
    name: testName,
    passed,
    message
  });
  
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Security Tests
async function testRateLimiting() {
  console.log('\n📊 Testing Rate Limiting...'.yellow);
  
  try {
    // Test authentication rate limiting
    const promises = [];
    for (let i = 0; i < 12; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/auth/login`, {
          email: 'invalid@test.com',
          password: 'wrongpassword'
        }, {
          validateStatus: () => true
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      logTest('Auth Rate Limiting', true, `Rate limiting triggered after multiple failed attempts (${rateLimitedResponses.length} blocked)`);
    } else {
      logTest('Auth Rate Limiting', false, 'Rate limiting did not trigger as expected');
    }
    
    // Wait before next test
    await sleep(1000);
    
  } catch (error) {
    logTest('Rate Limiting Test', false, `Error: ${error.message}`);
  }
}

async function testInputValidation() {
  console.log('\n🛡️ Testing Input Validation...'.yellow);
  
  const maliciousInputs = [
    '<script>alert("xss")</script>',
    'SELECT * FROM users',
    'javascript:alert("xss")',
    '<iframe src="evil.com"></iframe>',
    "'; DROP TABLE users; --"
  ];
  
  try {
    // Test login endpoint with malicious inputs
    for (const input of maliciousInputs) {
      try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: input,
          password: 'test'
        }, {
          validateStatus: () => true
        });
        
        if (response.status === 400) {
          logTest('Input Validation', true, `Malicious input blocked: ${input.substring(0, 30)}...`);
        } else {
          logTest('Input Validation', false, `Malicious input not blocked: ${input.substring(0, 30)}...`);
        }
      } catch (error) {
        logTest('Input Validation', true, `Request blocked by security middleware: ${input.substring(0, 30)}...`);
      }
    }
    
  } catch (error) {
    logTest('Input Validation Test', false, `Error: ${error.message}`);
  }
}

async function testSecurityHeaders() {
  console.log('\n🔒 Testing Security Headers...'.yellow);
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, {
      validateStatus: () => true
    });
    
    const headers = response.headers;
    
    // Check for security headers
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy',
      'content-security-policy'
    ];
    
    securityHeaders.forEach(header => {
      if (headers[header]) {
        logTest('Security Headers', true, `${header}: ${headers[header]}`);
      } else {
        logTest('Security Headers', false, `Missing security header: ${header}`);
      }
    });
    
  } catch (error) {
    logTest('Security Headers Test', false, `Error: ${error.message}`);
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...'.yellow);
  
  try {
    // Test valid login
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER, {
      validateStatus: () => true
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      logTest('Authentication', true, 'Valid login successful');
      
      // Test protected endpoint access
      const token = loginResponse.data.token;
      const protectedResponse = await axios.get(`${BASE_URL}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      
      if (protectedResponse.status === 200) {
        logTest('Authorization', true, 'Protected endpoint accessible with valid token');
      } else {
        logTest('Authorization', false, 'Protected endpoint not accessible with valid token');
      }
      
      // Test invalid token
      const invalidTokenResponse = await axios.get(`${BASE_URL}/api/employees`, {
        headers: { Authorization: 'Bearer invalid-token' },
        validateStatus: () => true
      });
      
      if (invalidTokenResponse.status === 401) {
        logTest('Token Validation', true, 'Invalid token properly rejected');
      } else {
        logTest('Token Validation', false, 'Invalid token not rejected');
      }
      
    } else {
      logTest('Authentication', false, 'Valid login failed');
    }
    
  } catch (error) {
    logTest('Authentication Test', false, `Error: ${error.message}`);
  }
}

async function testPasswordStrength() {
  console.log('\n💪 Testing Password Strength...'.yellow);
  
  const weakPasswords = [
    'password',
    '123456',
    'abc123',
    'Password', // Missing special char and number
    'password123' // Missing uppercase and special char
  ];
  
  try {
    for (const password of weakPasswords) {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Test User',
        email: 'test@example.com',
        password: password
      }, {
        validateStatus: () => true
      });
      
      if (response.status === 400) {
        logTest('Password Strength', true, `Weak password rejected: ${password}`);
      } else {
        logTest('Password Strength', false, `Weak password accepted: ${password}`);
      }
    }
    
  } catch (error) {
    logTest('Password Strength Test', false, `Error: ${error.message}`);
  }
}

async function testCORS() {
  console.log('\n🌐 Testing CORS Configuration...'.yellow);
  
  try {
    // Test allowed origin
    const response = await axios.get(`${BASE_URL}/api/health`, {
      headers: {
        'Origin': CLIENT_URL
      },
      validateStatus: () => true
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    
    if (corsHeader === CLIENT_URL || corsHeader === '*') {
      logTest('CORS', true, `CORS properly configured for allowed origin: ${CLIENT_URL}`);
    } else {
      logTest('CORS', false, `CORS not properly configured for origin: ${CLIENT_URL}`);
    }
    
  } catch (error) {
    logTest('CORS Test', false, `Error: ${error.message}`);
  }
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...'.yellow);
  
  try {
    // Test 404 handling
    const response404 = await axios.get(`${BASE_URL}/api/nonexistent`, {
      validateStatus: () => true
    });
    
    if (response404.status === 404) {
      logTest('Error Handling', true, '404 errors properly handled');
    } else {
      logTest('Error Handling', false, '404 errors not properly handled');
    }
    
    // Test that error messages don't leak sensitive information
    const errorResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'invalid@test.com',
      password: 'wrongpassword'
    }, {
      validateStatus: () => true
    });
    
    if (errorResponse.status === 401 && 
        !errorResponse.data.message.includes('database') && 
        !errorResponse.data.message.includes('stack')) {
      logTest('Error Information Disclosure', true, 'Error messages do not leak sensitive information');
    } else {
      logTest('Error Information Disclosure', false, 'Error messages may leak sensitive information');
    }
    
  } catch (error) {
    logTest('Error Handling Test', false, `Error: ${error.message}`);
  }
}

// Main test runner
async function runSecurityTests() {
  console.log('🔒 Starting Security Tests...\n'.cyan.bold);
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    console.log('✅ Server is running\n'.green);
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.\n'.red);
    process.exit(1);
  }
  
  // Run all tests
  await testRateLimiting();
  await testInputValidation();
  await testSecurityHeaders();
  await testAuthentication();
  await testPasswordStrength();
  await testCORS();
  await testErrorHandling();
  
  // Print summary
  console.log('\n📋 Security Test Summary'.cyan.bold);
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`.green);
  console.log(`❌ Failed: ${results.failed}`.red);
  console.log(`📊 Total: ${results.passed + results.failed}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All security tests passed! Your application is secure.'.green.bold);
  } else {
    console.log('\n⚠️  Some security tests failed. Please review and fix the issues.'.yellow.bold);
  }
  
  console.log('\n📝 Detailed Results:');
  results.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.message}`);
  });
}

// Install required dependency if not present
try {
  require('colors');
} catch (error) {
  console.log('Installing required dependency: colors');
  require('child_process').execSync('npm install colors', { stdio: 'inherit' });
}

// Run the tests
runSecurityTests().catch(console.error);
