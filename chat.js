/**
 * Chat Manager - Handles chat logic and message management
 */

class ChatManager {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.currentChatId = null;
        this.chats = [];
        this.messages = new Map();
        this.currentPersonality = localStorage.getItem('ai_personality') || 'helpful';
        this.isTyping = false;
        this.typingTimeout = null;
        this.pendingMessage = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle incoming messages from WebSocket
        this.wsManager.on('message', (data) => this.handleIncomingMessage(data));
        this.wsManager.on('typing', (data) => this.handleTypingIndicator(data));
        this.wsManager.on('chat:created', (data) => this.handleChatCreated(data));
        this.wsManager.on('chat:list', (data) => this.handleChatList(data));
        this.wsManager.on('messages_loaded', (data) => this.handleMessagesLoaded(data));
        this.wsManager.on('error', (data) => this.handleError(data));
        
        this.wsManager.on('connected', () => {
            this.loadChatList();
            showToast('Connected to chat server', 'success');
        });

        this.wsManager.on('disconnected', () => {
            showToast('Disconnected from server', 'warning');
        });
    }

    setPersonality(personality) {
        this.currentPersonality = personality;
        localStorage.setItem('ai_personality', personality);
        showToast(`AI personality set to: ${personality}`, 'success');
    }

    clearChatHistory() {
        this.chats = [];
        this.messages.clear();
        this.currentChatId = null;
        this.renderChatList();
        const container = document.getElementById('messagesContainer');
        if (container) container.innerHTML = '';
        showToast('Chat history cleared', 'info');
    }

    createNewChat(title = 'New Chat') {
        this.wsManager.createChat(title);
    }

    loadChatList() {
        this.wsManager.getChatList();
    }

    switchChat(chatId) {
        if (!chatId || this.currentChatId === chatId) return;
        this.currentChatId = chatId;
        const container = document.getElementById('messagesContainer');
        if (container) container.innerHTML = '';
        this.loadMessages(chatId);
        this.renderChatList();
    }

    loadMessages(chatId) {
        this.wsManager.loadMessages(chatId);
    }

    sendMessage(content) {
        if (!this.currentChatId) {
            showToast('Starting a new chat...', 'info');
            this.createNewChat('New Chat');
            this.pendingMessage = content; 
            return false;
        }

        if (!content.trim()) return false;

        const sent = this.wsManager.sendMessage(
            content,
            this.currentChatId,
            this.currentPersonality
        );

        if (sent) {
            const input = document.getElementById('messageInput');
            if (input) {
                input.value = '';
                updateCharCount();
            }
        }
        return sent;
    }

    handleIncomingMessage(data) {
        if (data.chat_id !== this.currentChatId) return;
        this.addMessageToUI(data);
        if (!this.messages.has(data.chat_id)) this.messages.set(data.chat_id, []);
        this.messages.get(data.chat_id).push(data);
    }

    handleTypingIndicator(data) {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = (data.is_typing) ? 'flex' : 'none';
            if (data.is_typing) this.scrollToBottom();
        }
    }

    handleChatCreated(data) {
        const newChat = { 
            id: data.chat_id || data.id, 
            title: data.title || 'New Chat' 
        };
        this.chats.unshift(newChat);
        this.renderChatList();
        this.switchChat(newChat.id);
        if (this.pendingMessage) {
            const msg = this.pendingMessage;
            this.pendingMessage = null;
            setTimeout(() => this.sendMessage(msg), 100);
        }
    }

    handleChatList(data) {
        this.chats = data.chats || [];
        this.renderChatList();
        if (this.chats.length > 0 && !this.currentChatId) {
            this.switchChat(this.chats[0].id);
        }
    }

    handleMessagesLoaded(data) {
        if (data.chat_id !== this.currentChatId) return;
        this.messages.set(data.chat_id, data.messages || []);
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.innerHTML = '';
            (data.messages || []).forEach(msg => this.addMessageToUI(msg, false));
            this.scrollToBottom();
        }
    }

    handleError(data) {
        showToast(data.error || 'An error occurred', 'error');
    }

    addMessageToUI(data, animate = true) {
        const container = document.getElementById('messagesContainer');
        if (!container || !data) return;

        const isUser = data.sender_type === 'user';
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isUser ? 'user-message' : 'ai-message'} ${animate ? 'fade-in' : ''}`;
        
        const time = new Date(data.timestamp).toLocaleTimeString();
        const content = data.content || '';

        messageEl.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">${isUser ? 'You' : 'AI Assistant'}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text"><p>${content}</p></div>
            </div>
        `;
        
        container.appendChild(messageEl);
        this.scrollToBottom();
    }

    renderChatList() {
        const container = document.getElementById('chatItems');
        if (!container) return;
        
        if (this.chats.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment"></i>
                    <p>No chats yet</p>
                    <span>Start a new conversation</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        this.chats.forEach(chat => {
            const chatEl = document.createElement('div');
            chatEl.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatEl.innerHTML = `
                <div class="chat-item-icon"><i class="fas fa-comment"></i></div>
                <div class="chat-item-info">
                    <div class="chat-item-title">${chat.title || 'New Chat'}</div>
                </div>
            `;
            chatEl.onclick = () => this.switchChat(chat.id);
            container.appendChild(chatEl);
        });
        
        const activeChat = this.chats.find(c => c.id === this.currentChatId);
        if (activeChat) this.updateChatTitle(activeChat.title);
    }

    updateChatTitle(title) {
        const titleEl = document.getElementById('chatTitle');
        if (titleEl) titleEl.textContent = title || 'New Chat';
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

window.ChatManager = ChatManager;