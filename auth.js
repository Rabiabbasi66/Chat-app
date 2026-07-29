/**
 * Authentication Module
 * Handles login, registration, and user session management
 */

// ============================================
// AUTH STATE
// ============================================
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

let currentUser = null;

// ============================================
// DOM REFS
// ============================================
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Show the auth modal
 */
function showAuthModal() {
    authModal.classList.remove('hidden');
    switchToLogin();
}

/**
 * Hide the auth modal
 */
function closeAuthModal() {
    authModal.classList.add('hidden');
}

/**
 * Switch to login form
 */
function switchToLogin() {
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    document.querySelector('.auth-logo h1').textContent = 'AI Chat';
    document.querySelector('.auth-logo p').textContent = 'Intelligent conversations powered by AI';
}

/**
 * Switch to register form
 */
function switchToRegister() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    document.querySelector('.auth-logo h1').textContent = 'Join AI Chat';
    document.querySelector('.auth-logo p').textContent = 'Start your AI journey today';
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save auth data
            localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
            localStorage.setItem('user_email', email);
            
            // Update UI
            closeAuthModal();
            updateAuthUI(true);
            showToast('Welcome back! 🎉', 'success');
            
            // Reload WebSocket with authenticated user
            if (window.wsManager) {
                window.wsManager.connect();
            }
            
            // Load user data
            await loadUserData();
            
        } else {
            showToast(data.detail || 'Login failed. Please try again.', 'error');
        }
    } catch (error) {
        showToast('Connection error. Please check your network.', 'error');
    }
}

/**
 * Handle register form submission
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    
    if (!name || !username || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: name,
                username: username,
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Account created successfully! 🎉 Please login.', 'success');
            switchToLogin();
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = '';
        } else {
            showToast(data.detail || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        showToast('Connection error. Please check your network.', 'error');
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem('user_email');
    currentUser = null;
    
    updateAuthUI(false);
    showToast('Logged out successfully', 'info');
    
    // Reset WebSocket
    if (window.wsManager) {
        window.wsManager.disconnect();
        window.wsManager.userId = window.wsManager.generateUserId();
        window.wsManager.connect();
    }
    
    if (window.chatManager) {
        window.chatManager.chats = [];
        window.chatManager.messages.clear();
        window.chatManager.currentChatId = null;
        window.chatManager.renderChatList();
        const container = document.getElementById('messagesContainer');
        if (container) container.innerHTML = '';
    }
}

/**
 * Load user data from API
 */
async function loadUserData() {
    try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;
        
        // You can add a /me endpoint or just use stored data
        // For now, we'll just use the email
        const email = localStorage.getItem('user_email');
        if (email) {
            // Try to get user info from backend
            // If you have a /me endpoint, call it here
        }
        
        // Update UI with user info
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = email.split('@')[0] || 'User';
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Update UI based on auth state
 */
function updateAuthUI(isLoggedIn) {
    const authBtn = document.getElementById('authBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (isLoggedIn) {
        authBtn.style.display = 'none';
        logoutBtn.style.display = 'flex';
        const email = localStorage.getItem('user_email') || 'User';
        userName.textContent = email.split('@')[0];
        userAvatar.innerHTML = `<i class="fas fa-user-check"></i>`;
    } else {
        authBtn.style.display = 'flex';
        logoutBtn.style.display = 'none';
        userName.textContent = 'Guest User';
        userAvatar.innerHTML = `<i class="fas fa-user"></i>`;
    }
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
}

// ============================================
// EXPOSE TO GLOBAL
// ============================================
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchToLogin = switchToLogin;
window.switchToRegister = switchToRegister;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.isAuthenticated = isAuthenticated;

// Close auth modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.querySelector('.auth-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeAuthModal);
    }
    
    // Check auth status on load
    if (isAuthenticated()) {
        updateAuthUI(true);
        loadUserData();
    }
});