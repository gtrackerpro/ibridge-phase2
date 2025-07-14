const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_BASE_URL = 'http://localhost:3001/api';

async function loginUser() {
  return new Promise((resolve) => {
    rl.question('Enter your email: ', (email) => {
      rl.question('Enter your password: ', async (password) => {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
          });
          
          if (response.data.token) {
            console.log('Login successful!');
            resolve(response.data.token);
          } else {
            console.log('Login failed: No token received');
            resolve(null);
          }
        } catch (error) {
          console.log('Login failed:', error.response?.data?.message || error.message);
          resolve(null);
        }
      });
    });
  });
}

async function getUploadHistory(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/upload/history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.uploads;
  } catch (error) {
    console.error('Error fetching upload history:', error.response?.data?.message || error.message);
    return [];
  }
}

async function getFileWithSignedUrl(fileId, token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/upload/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.fileUpload;
  } catch (error) {
    console.error('Error fetching file:', error.response?.data?.message || error.message);
    return null;
  }
}

async function findResumeByName(uploads, searchName) {
  const lowerSearchName = searchName.toLowerCase();
  return uploads.find(upload => 
    upload.fileType === 'Resume' && 
    upload.originalName.toLowerCase().includes(lowerSearchName)
  );
}

async function main() {
  console.log('=== Resume Access Tool ===\n');
  
  // Step 1: Login
  const token = await loginUser();
  if (!token) {
    console.log('Unable to login. Exiting...');
    rl.close();
    return;
  }
  
  // Step 2: Get upload history
  console.log('\nFetching upload history...');
  const uploads = await getUploadHistory(token);
  
  if (uploads.length === 0) {
    console.log('No uploads found.');
    rl.close();
    return;
  }
  
  // Step 3: Find resume files
  const resumes = uploads.filter(upload => upload.fileType === 'Resume');
  
  if (resumes.length === 0) {
    console.log('No resume files found.');
    rl.close();
    return;
  }
  
  console.log(`\nFound ${resumes.length} resume file(s):`);
  resumes.forEach((resume, index) => {
    console.log(`${index + 1}. ${resume.originalName} (uploaded: ${new Date(resume.createdAt).toLocaleDateString()})`);
  });
  
  // Step 4: Let user select a resume or search by name
  rl.question('\nEnter resume number to access, or search by name (e.g., "Abdullah"): ', async (input) => {
    let selectedResume = null;
    
    if (isNaN(input)) {
      // Search by name
      selectedResume = await findResumeByName(resumes, input);
      if (!selectedResume) {
        console.log(`No resume found containing "${input}"`);
        rl.close();
        return;
      }
    } else {
      // Select by number
      const index = parseInt(input) - 1;
      if (index < 0 || index >= resumes.length) {
        console.log('Invalid selection.');
        rl.close();
        return;
      }
      selectedResume = resumes[index];
    }
    
    // Step 5: Get signed URL
    console.log(`\nAccessing resume: ${selectedResume.originalName}`);
    const fileWithSignedUrl = await getFileWithSignedUrl(selectedResume._id, token);
    
    if (fileWithSignedUrl && fileWithSignedUrl.downloadUrl) {
      console.log('\n=== Resume Access Information ===');
      console.log(`File Name: ${fileWithSignedUrl.originalName}`);
      console.log(`File Size: ${(fileWithSignedUrl.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Uploaded: ${new Date(fileWithSignedUrl.createdAt).toLocaleString()}`);
      console.log(`Signed URL (valid for 1 hour): ${fileWithSignedUrl.downloadUrl}`);
      console.log('\nYou can now copy this URL and paste it into your browser to view/download the resume.');
    } else {
      console.log('Error: Unable to generate signed URL for the resume.');
    }
    
    rl.close();
  });
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  rl.close();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  rl.close();
});

// Start the application
main();
