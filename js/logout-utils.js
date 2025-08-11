/**
 * Comprehensive Logout Utilities
 * This file provides functions to clear all user data on logout
 */

// Function to clear all localStorage data
function clearAllLocalStorage() {
  try {
    // Clear all localStorage items
    localStorage.clear();
    console.log('All localStorage data cleared');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    // Fallback: manually remove known items
    const knownItems = [
      "authToken",
      "userInfo", 
      "updatedProfileImage",
      "userInterests",
      "ENV_SWITCHER_DEV_MODE",
      "bankId",
      "STORAGE_KEY"
    ];
    
    knownItems.forEach(item => {
      try {
        localStorage.removeItem(item);
      } catch (e) {
        console.error(`Error removing ${item}:`, e);
      }
    });
    
    console.log('Fallback localStorage clearing completed');
  }
}

// Function to clear all cookies
function clearAllCookies() {
  try {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      
      // Clear cookie with multiple path variations to ensure complete removal
      const paths = ['/', '/well-known', '/lets-talk'];
      paths.forEach(path => {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + path;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + path + ";domain=" + window.location.hostname;
      });
    }
    console.log('All cookies cleared');
  } catch (error) {
    console.error('Error clearing cookies:', error);
  }
}

// Function to clear session storage
function clearSessionStorage() {
  try {
    sessionStorage.clear();
    console.log('All sessionStorage data cleared');
  } catch (error) {
    console.error('Error clearing sessionStorage:', error);
  }
}

// Function to clear all web storage and cookies
function clearAllUserData() {
  clearAllLocalStorage();
  clearSessionStorage();
  clearAllCookies();
  console.log('All user data cleared successfully');
}

// Function to handle session expiration
function handleSessionExpiration() {
  clearAllUserData();
  showSessionExpiredMessage();
  setTimeout(() => {
    window.location.href = "login.html";
  }, 2000);
}

// Function to show session expired message
function showSessionExpiredMessage() {
  // Try to use SweetAlert if available
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: "Session Expired",
      text: "Your session has expired. Please login again.",
      icon: "warning",
      timer: 2000,
      showConfirmButton: false
    });
  } else {
    // Fallback to alert
    alert('Session expired. Please login again.');
  }
}

// Function to perform complete logout
async function performLogout(apiUrl = null) {
  try {
    // If API URL is provided, call logout endpoint
    if (apiUrl) {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log('Logout API call successful');
          } else {
            console.log('Logout API call failed, but continuing with local cleanup');
          }
        } catch (error) {
          console.log('Logout API call error, but continuing with local cleanup:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error during logout API call:', error);
  } finally {
    // Always clear all data regardless of API response
    clearAllUserData();
    
    // Show success message
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: "Logged Out",
        text: "You have been logged out successfully!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.href = "login.html";
      });
    } else {
      alert('Logged out successfully!');
      window.location.href = "login.html";
    }
  }
}

// Function to check if user is authenticated
function isAuthenticated() {
  const token = localStorage.getItem('authToken');
  if (!token) return false;
  
  try {
    // Basic JWT expiration check (if token is JWT)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    if (payload.exp && payload.exp < currentTime) {
      // Token expired, clear data
      clearAllUserData();
      return false;
    }
    
    return true;
  } catch (error) {
    // If token parsing fails, assume it's invalid
    console.error('Token validation error:', error);
    clearAllUserData();
    return false;
  }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clearAllLocalStorage,
    clearAllCookies,
    clearSessionStorage,
    clearAllUserData,
    handleSessionExpiration,
    showSessionExpiredMessage,
    performLogout,
    isAuthenticated
  };
}
