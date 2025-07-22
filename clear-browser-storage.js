// Run this in browser console to clear authentication data
// Open Developer Tools (F12), go to Console, and paste this code

console.log('Clearing authentication data...');

// Clear localStorage
localStorage.removeItem('token');
localStorage.removeItem('currentUser');
localStorage.removeItem('lastRequest');

// Clear all localStorage if needed
// localStorage.clear();

// Clear sessionStorage
sessionStorage.clear();

console.log('Authentication data cleared. Please refresh the page.');

// Optional: Refresh the page automatically
// location.reload();
