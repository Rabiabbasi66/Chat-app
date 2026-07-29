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
        const toggleSidebar = document.getElementById('toggleSidebar');
        if (toggleSidebar) {
            toggleSidebar.addEventListener('click', () => this.toggleSidebar());
        }

        const closeSidebar = document.getElementById('closeSidebar');
        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => this.closeSidebar());
        }

        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                if (window.chatManager) window.chatManager.createNewChat();
                if (window.innerWidth <= 640) this.closeSidebar();
            });
        }

        const refreshChats = document.getElementById('refreshChats');
        if (refreshChats) {
            refreshChats.addEventListener('click', () => {
                if (window.chatManager) window.chatManager.loadChatList();
                if (window.showToast) showToast('Chat list refreshed', 'info');
            });
        }

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        const personalityBtn = document.getElementById('personalityBtn');
        if (personalityBtn) {
            personalityBtn.addEventListener('click', () => this.openModal('personalityModal'));
        }

        const closePersonalityModal = document.getElementById('closePersonalityModal');
        if (closePersonalityModal) {
            closePersonalityModal.addEventListener('click', () => this.closeModal('personalityModal'));
        }

        document.querySelectorAll('.personality-card').forEach(card => {
            card.addEventListener('click', () => {
                const personality = card.dataset.personality;
                if (window.chatManager) window.chatManager.setPersonality(personality);
                this.closeModal('personalityModal');
            });
        });

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

        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

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
        
        // Update the icon
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = this.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        // Show toast notification
        if (window.showToast) {
            showToast(`Switched to ${this.theme} mode`, 'info');
        }
    }

    applyTheme() {
        // Apply theme to HTML element
        document.documentElement.setAttribute('data-theme', this.theme);
        
        // Apply theme to body
        document.body.style.background = this.theme === 'dark' ? '#0a0a0f' : '#f5f5fa';
        document.body.style.color = this.theme === 'dark' ? '#f0f0f5' : '#1a1a2e';
        
        // Apply to sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.background = this.theme === 'dark' ? '#12121a' : '#ffffff';
            sidebar.style.borderColor = this.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        }
        
        // Apply to chat messages area
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.style.background = this.theme === 'dark' ? '#0a0a0f' : '#f5f5fa';
        }
        
        // Apply to input area
        const inputArea = document.querySelector('.chat-input-area');
        if (inputArea) {
            inputArea.style.background = this.theme === 'dark' ? '#12121a' : '#ffffff';
            inputArea.style.borderColor = this.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        }
        
        // Apply to input container
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.style.background = this.theme === 'dark' ? '#0a0a0f' : '#f0f0f5';
            inputContainer.style.borderColor = this.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)';
        }
        
        // Apply to messages
        document.querySelectorAll('.message-content').forEach(el => {
            const parent = el.closest('.message');
            if (parent && parent.classList.contains('user-message')) {
                el.style.background = '#6c63ff';
                el.style.color = 'white';
            } else if (parent && parent.classList.contains('ai-message')) {
                el.style.background = this.theme === 'dark' ? '#1a1a2e' : '#e8e8f0';
                el.style.borderColor = this.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
                el.style.color = this.theme === 'dark' ? '#f0f0f5' : '#1a1a2e';
            }
        });
        
        // Apply to chat list
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            item.style.background = this.theme === 'dark' ? 'transparent' : 'transparent';
            if (item.classList.contains('active')) {
                item.style.background = this.theme === 'dark' ? 'rgba(108,99,255,0.15)' : 'rgba(108,99,255,0.1)';
            }
        });
        
        // Apply to modals
        const modalContents = document.querySelectorAll('.modal-content, .auth-modal-content');
        modalContents.forEach(el => {
            el.style.background = this.theme === 'dark' ? '#12121a' : '#ffffff';
            el.style.borderColor = this.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        });
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
        const personality = localStorage.getItem('ai_personality') || 'helpful';
        if (window.chatManager) window.chatManager.currentPersonality = personality;
    }

    updateUserName(name) {
        const userNameEl = document.getElementById('userName');
        if (userNameEl && name) {
            userNameEl.textContent = name;
        }
    }

    updateAvatar(initial) {
        const avatar = document.getElementById('userAvatar');
        if (avatar && initial) {
            avatar.innerHTML = initial.charAt(0).toUpperCase();
            avatar.style.background = 'linear-gradient(135deg, #6c63ff, #8a82ff)';
            avatar.style.color = 'white';
        }
    }
}

window.UIManager = UIManager;