/**
 * Authentication Module
 * Handles login, registration, and user session management
 * Developed by Fazal Rabbi Abbasi
 */

// ============================================
// AUTH STATE
// ============================================
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const USER_NAME_KEY = 'user_name';
const USER_AVATAR_KEY = 'user_avatar';

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
    if (!authModal) return;
    authModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    switchToLogin();
}

/**
 * Hide the auth modal
 */
function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.add('hidden');
    document.body.style.overflow = '';
}

/**
 * Switch to login form
 */
function switchToLogin() {
    if (loginForm) loginForm.style.display = 'flex';
    if (registerForm) registerForm.style.display = 'none';
    
    const logoTitle = document.querySelector('.auth-logo h1');
    const logoSubtitle = document.querySelector('.auth-logo p');
    if (logoTitle) logoTitle.textContent = 'AI Chat';
    if (logoSubtitle) logoSubtitle.textContent = 'Intelligent conversations powered by AI';
}

/**
 * Switch to register form
 */
function switchToRegister() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'flex';
    
    const logoTitle = document.querySelector('.auth-logo h1');
    const logoSubtitle = document.querySelector('.auth-logo p');
    if (logoTitle) logoTitle.textContent = 'Join AI Chat';
    if (logoSubtitle) logoSubtitle.textContent = 'Start your AI journey today';
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value?.trim();
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = loginForm?.querySelector('button[type="submit"]');
    const originalText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        submitBtn.disabled = true;
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
            
            // Try to get user name from registration or use email
            const userName = localStorage.getItem('user_name') || email.split('@')[0];
            localStorage.setItem(USER_NAME_KEY, userName);
            localStorage.setItem(USER_AVATAR_KEY, userName.charAt(0).toUpperCase());
            
            // Update UI
            closeAuthModal();
            updateAuthUI(true);
            showToast(`Welcome back, ${userName}! 🎉`, 'success');
            
            // Update user name in UI
            if (window.updateUserUI) {
                window.updateUserUI(userName, email);
            }
            
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
        console.error('Login error:', error);
        showToast('Connection error. Please check your network.', 'error');
    } finally {
        // Reset button
        if (submitBtn) {
            submitBtn.innerHTML = originalText || 'Sign In';
            submitBtn.disabled = false;
        }
    }
}

/**
 * Handle register form submission
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName')?.value?.trim();
    const username = document.getElementById('registerUsername')?.value?.trim();
    const email = document.getElementById('registerEmail')?.value?.trim();
    const password = document.getElementById('registerPassword')?.value?.trim();
    
    if (!name || !username || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = registerForm?.querySelector('button[type="submit"]');
    const originalText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        submitBtn.disabled = true;
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
            // ✅ Save user name for later use
            localStorage.setItem(USER_NAME_KEY, name);
            localStorage.setItem(USER_AVATAR_KEY, name.charAt(0).toUpperCase());
            
            showToast(`Account created successfully! 🎉 Welcome ${name}!`, 'success');
            switchToLogin();
            
            // Pre-fill email
            const loginEmail = document.getElementById('loginEmail');
            if (loginEmail) loginEmail.value = email;
            
            const loginPassword = document.getElementById('loginPassword');
            if (loginPassword) loginPassword.value = '';
            
            // Focus on password field
            if (loginPassword) loginPassword.focus();
            
        } else {
            showToast(data.detail || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Connection error. Please check your network.', 'error');
    } finally {
        // Reset button
        if (submitBtn) {
            submitBtn.innerHTML = originalText || 'Create Account';
            submitBtn.disabled = false;
        }
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    // Clear all auth data
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem('user_email');
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(USER_AVATAR_KEY);
    currentUser = null;
    
    updateAuthUI(false);
    showToast('Logged out successfully 👋', 'info');
    
    // Reset WebSocket
    if (window.wsManager) {
        window.wsManager.disconnect();
        window.wsManager.userId = window.wsManager.generateUserId();
        setTimeout(() => window.wsManager.connect(), 500);
    }
    
    // Reset chat state
    if (window.chatManager) {
        window.chatManager.chats = [];
        window.chatManager.messages.clear();
        window.chatManager.currentChatId = null;
        window.chatManager.renderChatList();
        const container = document.getElementById('messagesContainer');
        if (container) container.innerHTML = '';
    }
    
    // Reset user name in UI
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = 'Guest User';
    
    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) {
        avatarEl.innerHTML = '<i class="fas fa-user"></i>';
        avatarEl.style.background = '';
        avatarEl.style.color = '';
    }
}

/**
 * Load user data from API
 */
async function loadUserData() {
    try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;
        
        const email = localStorage.getItem('user_email');
        const userName = localStorage.getItem(USER_NAME_KEY);
        
        if (userName) {
            // Update UI with user info
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = userName;
            
            const avatarEl = document.getElementById('userAvatar');
            if (avatarEl) {
                avatarEl.innerHTML = userName.charAt(0).toUpperCase();
                avatarEl.style.background = 'linear-gradient(135deg, #6c63ff, #8a82ff)';
                avatarEl.style.color = 'white';
            }
        } else if (email) {
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = email.split('@')[0];
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
        if (authBtn) authBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'flex';
        
        const email = localStorage.getItem('user_email') || 'User';
        const savedName = localStorage.getItem(USER_NAME_KEY);
        
        if (userName) {
            userName.textContent = savedName || email.split('@')[0];
        }
        
        if (userAvatar) {
            const initial = (savedName || email).charAt(0).toUpperCase();
            userAvatar.innerHTML = initial;
            userAvatar.style.background = 'linear-gradient(135deg, #6c63ff, #8a82ff)';
            userAvatar.style.color = 'white';
        }
    } else {
        if (authBtn) authBtn.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userName) userName.textContent = 'Guest User';
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
            userAvatar.style.background = '';
            userAvatar.style.color = '';
        }
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
window.loadUserData = loadUserData;

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
    
    // Keyboard shortcut: Escape to close auth modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal && !authModal.classList.contains('hidden')) {
            closeAuthModal();
        }
    });
});

console.log('✅ Auth module loaded successfully');