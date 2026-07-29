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
        console.log('📩 handleIncomingMessage called with:', data);
        
        // ✅ If there's a chat_id, check if it matches current chat
        if (data.chat_id && data.chat_id !== this.currentChatId) {
            console.log('⚠️ Message chat_id does not match current chat, skipping UI update');
            return;
        }
        
        // ✅ Add message to UI
        this.addMessageToUI(data);
        
        // ✅ Store message in cache
        const chatId = data.chat_id || this.currentChatId;
        if (chatId) {
            if (!this.messages.has(chatId)) {
                this.messages.set(chatId, []);
            }
            this.messages.get(chatId).push(data);
        }
    }

    handleTypingIndicator(data) {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = (data.is_typing) ? 'flex' : 'none';
            if (data.is_typing) this.scrollToBottom();
        }
    }

    handleChatCreated(data) {
        console.log('📩 Chat created:', data);
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
        console.log('📩 Chat list received:', data);
        this.chats = data.chats || [];
        this.renderChatList();
        if (this.chats.length > 0 && !this.currentChatId) {
            this.switchChat(this.chats[0].id);
        }
    }

    handleMessagesLoaded(data) {
        console.log('📩 Messages loaded:', data);
        if (data.chat_id !== this.currentChatId) return;
        
        this.messages.set(data.chat_id, data.messages || []);
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.innerHTML = '';
            (data.messages || []).forEach(msg => {
                console.log('📝 Rendering message:', msg);
                this.addMessageToUI(msg, false);
            });
            this.scrollToBottom();
        }
    }

    handleError(data) {
        showToast(data.error || 'An error occurred', 'error');
    }

    addMessageToUI(data, animate = true) {
        console.log('📝 addMessageToUI called with:', data);
        
        const container = document.getElementById('messagesContainer');
        if (!container) {
            console.error('❌ messagesContainer not found!');
            return;
        }
        if (!data) {
            console.error('❌ No data provided to addMessageToUI');
            return;
        }

        // ✅ Handle different message formats
        const content = data.content || data.message || '';
        const senderType = data.sender_type || data.senderType || 'ai';
        const isUser = senderType === 'user';
        const chatId = data.chat_id || data.chatId || this.currentChatId;
        const timestamp = data.timestamp || data.created_at || new Date().toISOString();
        const messageId = data.message_id || data.id || Date.now().toString();

        console.log(`📝 Adding ${isUser ? 'user' : 'AI'} message: "${content}"`);

        const messageEl = document.createElement('div');
        messageEl.className = `message ${isUser ? 'user-message' : 'ai-message'} ${animate ? 'fade-in' : ''}`;
        messageEl.id = `msg-${messageId}`;
        
        const time = new Date(timestamp).toLocaleTimeString();

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
        console.log(`✅ Message added to UI: "${content}"`);
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