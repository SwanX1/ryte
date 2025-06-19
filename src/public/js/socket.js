class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHandlers = new Map();
  }

  connect(sessionId) {
    console.log('Attempting to connect with sessionId:', sessionId);
    
    if (this.socket && this.isConnected) {
      console.log('Already connected, skipping connection attempt');
      return;
    }

    if (!window.io) {
      console.error('Socket.IO client not loaded!');
      this.showNotification('Socket.IO client not available', 'error');
      return;
    }

    try {
      console.log('🔧 Creating Socket.IO connection...');
      this.socket = io({
        auth: {
          sessionId: sessionId
        },
        transports: ['websocket', 'polling'] // Try WebSocket first, fallback to polling
      });

      console.log('Socket.IO connection created, setting up event handlers...');
      this.setupEventHandlers();
    } catch (error) {
      console.error('Error creating Socket.IO connection:', error);
      this.showNotification('Failed to create WebSocket connection', 'error');
    }
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join live feed by default
      this.socket.emit('join-feed');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server. Reason:', reason);
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.showNotification('Connection error: ' + error.message, 'error');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.showNotification('Connection error', 'error');
    });

    // Chat events
    this.socket.on('joined-chat', (data) => {
      console.log('Joined chat:', data.chatId);
    });

    this.socket.on('new-message', (messageData) => {
      this.handleNewMessage(messageData);
    });

    this.socket.on('chat-notification', (notification) => {
      this.handleChatNotification(notification);
    });

    // Live feed events
    this.socket.on('joined-feed', () => {
      console.log('Joined live feed');
    });

    this.socket.on('new-post', (postData) => {
      this.handleNewPost(postData);
    });

    this.socket.on('post-liked', (likeData) => {
      this.handlePostLiked(likeData);
    });

    this.socket.on('new-comment', (commentData) => {
      this.handleNewComment(commentData);
    });

    this.socket.on('new-follow', (followData) => {
      this.handleNewFollow(followData);
    });

    this.socket.on('new-follower', (followData) => {
      this.handleNewFollower(followData);
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect(this.getSessionId());
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  getSessionId() {
    // Extract session ID from cookies
    const cookies = document.cookie.split(';');
    console.log('All cookies:', cookies);
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      console.log('Checking cookie:', name, value);
      
      if (name === 'connect.sid') {
        const sessionId = decodeURIComponent(value);
        console.log('Found session ID:', sessionId);
        
        // Handle signed session cookies (remove signature if present)
        // Express session cookies are signed with format: s:sessionId.signature
        if (sessionId.startsWith('s:')) {
          const parts = sessionId.substring(2).split('.');
          const actualSessionId = parts[0];
          console.log('Extracted session ID from signed cookie:', actualSessionId);
          return actualSessionId;
        }
        
        return sessionId;
      }
    }
    
    console.log('No session cookie found');
    return null;
  }

  // Chat methods
  joinChat(chatId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('join-chat', chatId);
    }
  }

  leaveChat(chatId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('leave-chat', chatId);
    }
  }

  sendMessage(chatId, message) {
    if (this.isConnected && this.socket && message.trim()) {
      this.socket.emit('send-message', { chatId, message });
      return true;
    }
    return false;
  }

  // Live feed methods
  joinFeed() {
    if (this.isConnected && this.socket) {
      this.socket.emit('join-feed');
    }
  }

  leaveFeed() {
    if (this.isConnected && this.socket) {
      this.socket.emit('leave-feed');
    }
  }

  // Event handlers
  handleNewMessage(messageData) {
    const chatContainer = document.querySelector(`[data-chat-id="${messageData.chatId}"]`);
    if (chatContainer) {
      this.addMessageToChat(chatContainer, messageData);
    }
  }

  handleChatNotification(notification) {
    this.showNotification(
      `New message from ${notification.sender.username}: ${notification.message}`,
      'info'
    );
  }

  handleNewPost(postData) {
    // Add new post to the top of the feed using the rendered partial
    const feedContainer = document.getElementById('recentPosts');
    const profileFeedContainer = document.getElementById('personalizedPosts');
    if (!feedContainer && !profileFeedContainer) return;

    fetch(`/partials/post/${postData.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch post partial');
        return res.text();
      })
      .then(html => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const postElement = temp.firstElementChild;
        if (postElement) {
          // Always add to recent feed
          if (feedContainer) {
            feedContainer.insertBefore(postElement.cloneNode(true), feedContainer.firstChild);
          }
          // Only add to personalized feed if following
          if (
            profileFeedContainer &&
            window.followingIds &&
            window.followingIds.includes(postData.author.id)
          ) {
            profileFeedContainer.insertBefore(postElement, profileFeedContainer.firstChild);
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch post partial:', err);
      });
  }

  handlePostLiked(likeData) {
    // Update like count for the post
    const likeCountElement = document.querySelector(`[data-post-id="${likeData.postId}"] .like-count`);
    if (likeCountElement) {
      likeCountElement.textContent = likeData.likeCount;
    }
  }

  handleNewComment(commentData) {
    // Add new comment to the post
    const postContainer = document.querySelector(`[data-post-id="${commentData.postId}"]`);
    if (postContainer) {
      this.addCommentToPost(postContainer, commentData);
    }
  }

  handleNewFollow(followData) {
    this.showNotification(
      `${followData.follower.username} started following ${followData.following.username}`,
      'info'
    );
  }

  handleNewFollower(followData) {
    this.showNotification(
      `${followData.follower.username} started following you!`,
      'success'
    );
  }

  // UI update methods
  addMessageToChat(chatContainer, messageData) {
    const messagesContainer = chatContainer.querySelector('.chat-messages');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${messageData.isUserA ? 'from-self' : 'from-other'}`;
    
    const isCurrentUser = messageData.sender.id === window.currentUserId;
    messageElement.className = `chat-message ${isCurrentUser ? 'from-self' : 'from-other'}`;

    messageElement.innerHTML = `
      <span class="chat-author">
        ${isCurrentUser ? 'You' : messageData.sender.username}:
      </span>
      <span class="chat-text">${this.escapeHtml(messageData.message)}</span>
      <span class="chat-time">${this.formatTime(messageData.created_at)}</span>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Remove empty message placeholder if it exists
    const emptyMessage = messagesContainer.querySelector('.chat-empty');
    if (emptyMessage) {
      emptyMessage.remove();
    }
  }

  addCommentToPost(postContainer, commentData) {
    const commentsContainer = postContainer.querySelector('.post-comments');
    if (!commentsContainer) return;

    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    commentElement.innerHTML = `
      <span class="comment-author">${commentData.author.username}:</span>
      <span class="comment-content">${this.escapeHtml(commentData.content)}</span>
      <span class="comment-time">${this.formatTime(commentData.created_at)}</span>
    `;

    commentsContainer.appendChild(commentElement);
  }

  // Utility methods
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Global socket manager instance
window.socketManager = new SocketManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing WebSocket connection...');
  
  // Check if Socket.IO is available
  if (!window.io) {
    console.error('Socket.IO client not loaded! Check if /socket.io/socket.io.js is accessible');
    console.log('Available global objects:', Object.keys(window).filter(key => key.includes('io')));
    return;
  }
  
  console.log('Socket.IO client loaded, version:', window.io.version);
  
  // Fetch following list for filtering posts
  window.followingIds = [];
  if (window.currentUserId) {
    fetch(`/api/following/${window.currentUserId}`)
      .then(res => res.json())
      .then(data => {
        window.followingIds = (data.following || []).map(u => u.id);
        // Optionally include self
        window.followingIds.push(window.currentUserId);
      })
      .catch(err => {
        console.error('Failed to fetch following list:', err);
      });
  }

  const sessionId = window.socketManager.getSessionId();
  console.log('Session ID retrieved:', sessionId ? 'Found' : 'Not found');
  
  if (sessionId) {
    console.log('Found session ID, connecting to WebSocket...');
    window.socketManager.connect(sessionId);
  } else {
    console.log('No session ID found, user might not be logged in');
    console.log('Available cookies:', document.cookie);
  }
}); 