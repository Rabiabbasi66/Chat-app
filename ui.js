/**
 * UI Manager - Handles user interface interactions
 */

class UIManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.theme = localStorage.getItem('theme') || 'dark';
        this.applyTheme();
        this.setupEventListeners();
        setTimeout(() => this.loadSettings(), 100);
    }

    setupEventListeners() {
        // Toggle sidebar
        const toggleSidebar = document.getElementById('toggleSidebar');
        if (toggleSidebar) {
            toggleSidebar.addEventListener('click', () => this.toggleSidebar());
        }

        const closeSidebar = document.getElementById('closeSidebar');
        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => this.closeSidebar());
        }

        // New Chat Button
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                if (window.chatManager) window.chatManager.createNewChat();
                if (window.innerWidth <= 640) this.closeSidebar();
            });
        }

        // Refresh Chats
        const refreshChats = document.getElementById('refreshChats');
        if (refreshChats) {
            refreshChats.addEventListener('click', () => {
                if (window.chatManager) window.chatManager.loadChatList();
                if (window.showToast) showToast('Chat list refreshed', 'info');
            });
        }

        // Theme Toggle (if exists)
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Personality Button (if exists)
        const personalityBtn = document.getElementById('personalityBtn');
        if (personalityBtn) {
            personalityBtn.addEventListener('click', () => this.openModal('personalityModal'));
        }

        const closePersonalityModal = document.getElementById('closePersonalityModal');
        if (closePersonalityModal) {
            closePersonalityModal.addEventListener('click', () => this.closeModal('personalityModal'));
        }

        // Settings Button (if exists)
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openModal('settingsModal'));
        }

        const closeSettingsModal = document.getElementById('closeSettingsModal');
        if (closeSettingsModal) {
            closeSettingsModal.addEventListener('click', () => this.closeModal('settingsModal'));
        }

        // More Options (if exists)
        const moreOptions = document.getElementById('moreOptions');
        if (moreOptions) {
            moreOptions.addEventListener('click', (e) => this.showOptionsMenu(e));
        }

        // Personality Cards
        document.querySelectorAll('.personality-card').forEach(card => {
            card.addEventListener('click', () => {
                const personality = card.dataset.personality;
                if (window.chatManager) window.chatManager.setPersonality(personality);
                this.closeModal('personalityModal');
            });
        });

        // Theme Select (if exists)
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.theme = e.target.value;
                localStorage.setItem('theme', this.theme);
                this.applyTheme();
            });
        }

        // Font Size Select (if exists)
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                const size = e.target.value;
                document.documentElement.style.fontSize = size === 'small' ? '14px' : size === 'large' ? '18px' : '16px';
                localStorage.setItem('font_size', size);
            });
        }

        // Clear History Button (if exists)
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all chat history?')) {
                    if (window.chatManager) window.chatManager.clearChatHistory();
                    this.closeModal('settingsModal');
                }
            });
        }

        // Message Input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                if (window.updateCharCount) window.updateCharCount();
                this.autoResize(messageInput);
                this.handleTyping();
            });

            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Send Button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Modals - Close on overlay click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal.id);
            });
        });
    }

    toggleSidebar() {
        if (!this.sidebar) return;
        this.sidebar.classList.toggle('active');
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => this.closeSidebar());
        }
        overlay.classList.toggle('active', this.sidebar.classList.contains('active'));
    }

    closeSidebar() {
        if (this.sidebar) this.sidebar.classList.remove('active');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const select = document.getElementById('themeSelect');
        if (select) select.value = this.theme;
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showOptionsMenu() {
        this.openModal('settingsModal');
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        const content = input.value.trim();
        if (content && window.chatManager) {
            window.chatManager.sendMessage(content);
            input.value = '';
            if (window.updateCharCount) window.updateCharCount();
        }
    }

    autoResize(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    handleTyping() {
        if (window.chatManager?.wsManager && window.chatManager.currentChatId) {
            clearTimeout(window.chatManager.typingTimeout);
            if (!window.chatManager.isTyping) {
                window.chatManager.isTyping = true;
                window.chatManager.wsManager.sendTyping(window.chatManager.currentChatId, true);
            }
            window.chatManager.typingTimeout = setTimeout(() => {
                window.chatManager.isTyping = false;
                window.chatManager.wsManager.sendTyping(window.chatManager.currentChatId, false);
            }, 2000);
        }
    }

    loadSettings() {
        const fontSize = localStorage.getItem('font_size') || 'medium';
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        if (fontSizeSelect) {
            fontSizeSelect.value = fontSize;
            document.documentElement.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px';
        }
        
        const personality = localStorage.getItem('ai_personality') || 'helpful';
        if (window.chatManager) window.chatManager.currentPersonality = personality;
    }
}

window.UIManager = UIManager;