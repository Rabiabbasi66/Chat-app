/**
 * Main Application Entry Point
 * Initializes all components and starts the application
 */

// ✅ Make API_BASE_URL global
const API_BASE_URL = localStorage.getItem('api_url') || 'https://chat-app-aanf.vercel.app';
window.API_BASE_URL = API_BASE_URL;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AI Chat Application Starting...');
    console.log(`📡 API URL: ${API_BASE_URL}`);

    // Initialize Managers
    window.wsManager = new WebSocketManager(API_BASE_URL);
    window.chatManager = new ChatManager(window.wsManager);
    window.uiManager = new UIManager();

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
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            window.chatManager?.createNewChat();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            document.getElementById('messageInput')?.focus();
        }

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

    // Check if user is already logged in
    if (window.isAuthenticated && window.isAuthenticated()) {
        window.updateAuthUI(true);
        window.loadUserData();
    }

    console.log('✅ AI Chat Application Ready!');
});

/**
 * Character Counter Function
 */
function updateCharCount() {
    const input = document.getElementById('messageInput');
    const counter = document.getElementById('charCount');

    if (!input || !counter) return;

    counter.textContent = input.value.length;
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
});

/**
 * Performance Monitoring
 */
if (window.performance) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                console.log('⚡ Page load time:', navigation.loadEventEnd - navigation.fetchStart, 'ms');
            }
        }, 0);
    });
}

/**
 * Toast Function
 */
window.showToast = function(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};