/**************************************************
 * session.js
 * Client-side session helper for admin UI
 **************************************************/

const SESSION_FLAG = "brookfield_logged_in";

/**
 * Create client-side login flag
 * Backend cookie is the real auth
 */
function markLoggedIn() {
  sessionStorage.setItem(SESSION_FLAG, "true");
}

/**
 * Remove client-side login flag
 */
function clearSession() {
  sessionStorage.removeItem(SESSION_FLAG);
  window.location.href = "admin-login.html";
}

/**
 * Check if user is logged in (client flag)
 */
function isLoggedIn() {
  return sessionStorage.getItem(SESSION_FLAG) === "true";
}

/**
 * Protect admin pages
 */
function requireAdmin() {
  if (!isLoggedIn()) {
    window.location.href = "admin-login.html";
  }
}

/**
 * Login handler — USES BACKEND
 */
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorDiv = document.getElementById("loginError");

  errorDiv.style.display = "none";

  if (!username || !password) {
    errorDiv.textContent = "Missing username or password";
    errorDiv.style.display = "block";
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Backend cookie is now set
    markLoggedIn();

    window.location.href = "admin.html";

  } catch (err) {
    errorDiv.textContent = err.message;
    errorDiv.style.display = "block";
  }
}

/**
 * Enable ENTER key submit
 */
function enableEnterSubmit() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const btn = document.getElementById("loginBtn");
      if (btn) btn.click();
    }
  });
}
