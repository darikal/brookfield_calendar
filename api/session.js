/**************************************************
 * session.js
 * Simple admin session handling for Brookfield
 **************************************************/

const SESSION_KEY = "brookfield_admin_session";

/**
 * Create a session
 * Call this after successful login
 */
function createSession(username) {
  const sessionData = {
    user: username,
    loginTime: Date.now()
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

/**
 * Destroy the session
 * Call this on logout
 */
function destroySession() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "admin-login.html";
}

/**
 * Check if session exists
 */
function isLoggedIn() {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (!session) return false;

  try {
    JSON.parse(session);
    return true;
  } catch {
    return false;
  }
}

/**
 * Protect admin pages
 * Call this at the top of admin pages
 */
function requireAdmin() {
  if (!isLoggedIn()) {
    window.location.href = "admin-login.html";
  }
}

/**
 * Handle login form submit
 * Wire this to your login page
 */
function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorDiv = document.getElementById("loginError");

  // TEMP AUTH (replace later with server check)
  if (username === "admin" && password === "admin123") {
    createSession(username);
    window.location.href = "admin.html";
  } else {
    errorDiv.textContent = "Invalid username or password";
    errorDiv.style.display = "block";
  }
}

/**
 * Enable ENTER key submit on login page
 */
function enableEnterSubmit() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const loginBtn = document.getElementById("loginBtn");
      if (loginBtn) loginBtn.click();
    }
  });
}

/**
 * Optional helper to show logged-in user
 */
function getSessionUser() {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (!session) return null;

  try {
    return JSON.parse(session).user;
  } catch {
    return null;
  }
}
