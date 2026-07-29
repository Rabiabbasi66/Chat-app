/**
 * Main Application Entry Point
 * Initializes all components and starts the application
 */

// ✅ Make API_BASE_URL global
const API_BASE_URL = localStorage.getItem('api_url') || 'https://chat-app-aanf.vercel.app';
window.API_BASE_URL = API_BASE_URL;

// ✅ App version with developer credit
const APP_VERSION = '2.0.0';
const DEVELOPER_NAME = 'Fazal Rabbi Abbasi';
console.log(`🤖 AI Chat v${APP_VERSION} by ${DEVELOPER_NAME}`);

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AI Chat Application Starting...');
    console.log(`📡 API URL: ${API_BASE_URL}`);

    // Initialize Managers
    window.wsManager = new WebSocketManager(API_BASE_URL);
    window.chatManager = new ChatManager(window.wsManager);
    window.uiManager = new UIManager();

    // ✅ Set developer credit in UI
    const creditElements = document.querySelectorAll('.sidebar-credit, .auth-credit, .app-credit');
    creditElements.forEach(el => {
        if (el) el.textContent = `© 2026 ${DEVELOPER_NAME}`;
    });

    // ✅ Update user name from localStorage if logged in
    const savedName = localStorage.getItem('user_name');
    const savedAvatar = localStorage.getItem('user_avatar');
    if (savedName) {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = savedName;
    }
    if (savedAvatar) {
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) avatarEl.innerHTML = savedAvatar;
    }

    // Connect WebSocket
    window.wsManager.connect();

    // Load chat list after connection
    setTimeout(() => {
        window.chatManager.loadChatList();
    }, 500);

    // Visibility handling
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && window.chatManager) {
            window.chatManager.loadChatList();
        }
    });

    // Online/offline handling
    window.addEventListener('online', () => {
        showToast('Back online!', 'success');
        if (window.wsManager && !window.wsManager.isConnected) {
            window.wsManager.connect();
        }
    });

    window.addEventListener('offline', () => {
        showToast("You're offline. Some features may not work.", 'warning');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K = New Chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            window.chatManager?.createNewChat();
            showToast('Starting new conversation...', 'info');
        }

        // Ctrl/Cmd + / = Focus input
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            const input = document.getElementById('messageInput');
            if (input) {
                input.focus();
                showToast('Message input focused', 'info');
            }
        }

        // Escape = Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                window.uiManager?.closeModal(modal.id);
            });
        }
    });

    // Auto-save draft
    const messageInput = document.getElementById('messageInput');
    let draftTimeout;

    if (messageInput) {
        messageInput.addEventListener('input', (e) => {
            updateCharCount();

            clearTimeout(draftTimeout);
            draftTimeout = setTimeout(() => {
                localStorage.setItem('message_draft', e.target.value);
            }, 1000);
        });

        // Load draft
        const draft = localStorage.getItem('message_draft');
        if (draft) {
            messageInput.value = draft;
            updateCharCount();
        }
    }

    // ✅ Check if user is already logged in
    if (window.isAuthenticated && window.isAuthenticated()) {
        window.updateAuthUI(true);
        window.loadUserData();
    }

    // ✅ Show app info
    console.log(`✅ AI Chat Application Ready! v${APP_VERSION}`);
    console.log(`👨‍💻 Developed by ${DEVELOPER_NAME}`);
});

/**
 * Character Counter Function
 */
function updateCharCount() {
    const input = document.getElementById('messageInput');
    const counter = document.getElementById('charCount');

    if (!input || !counter) return;

    const count = input.value.length;
    counter.textContent = `${count}/4000`;
    
    // ✅ Add visual warning when approaching limit
    if (count > 3500) {
        counter.style.color = '#ffd93d';
    } else if (count > 3800) {
        counter.style.color = '#ff6b6b';
    } else {
        counter.style.color = '';
    }
}

/**
 * Global Error Handling
 */
window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
    showToast('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    showToast('Something went wrong. Please try again.', 'error');
});

/**
 * Performance Monitoring
 */
if (window.performance) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                const loadTime = navigation.loadEventEnd - navigation.fetchStart;
                console.log(`⚡ Page load time: ${loadTime}ms`);
                if (loadTime > 3000) {
                    console.warn('⚠️ Page load time is high. Consider optimizing.');
                }
            }
        }, 0);
    });
}

/**
 * Toast Function - Improved with better styling
 */
window.showToast = function(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
};

/**
 * ✅ Utility function to update user name in UI
 */
window.updateUserUI = function(name, email) {
    const userNameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    
    if (userNameEl && name) {
        userNameEl.textContent = name;
    }
    
    if (avatarEl && name) {
        const initial = name.charAt(0).toUpperCase();
        avatarEl.innerHTML = initial;
        avatarEl.style.background = `linear-gradient(135deg, #6c63ff, #8a82ff)`;
        avatarEl.style.color = 'white';
    }
    
    // Store in localStorage
    if (name) {
        localStorage.setItem('user_name', name);
        localStorage.setItem('user_avatar', name.charAt(0).toUpperCase());
    }
};

console.log('✅ App.js loaded successfully');