import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { SessionStore } from './sessionStore';
import { ChatMessageModel } from '../models/ChatMessage';
import { ChatModel } from '../models/Chat';
import { UserModel } from '../models/User';
import { UserFollowModel } from '../models/UserFollow';
import { AuditLogModel } from '../models/AuditLog';

interface AuthenticatedSocket {
  userId: number;
  username: string;
}

export class SocketServer {
  private io: SocketIOServer;
  private userSockets: Map<number, string> = new Map(); // userId -> socketId
  private sessionStore: SessionStore;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    this.sessionStore = new SessionStore();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private async getSession(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.sessionStore.get(sessionId, (err, session) => {
        if (err) {
          reject(err);
        } else {
          resolve(session);
        }
      });
    });
  }

  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const sessionId = socket.handshake.auth.sessionId;
        
        if (!sessionId) {
          return next(new Error('Authentication error: No session ID'));
        }

        const session = await this.getSession(sessionId);
        
        if (!session || !session.userId) {
          return next(new Error('Authentication error: Invalid session'));
        }

        const user = await UserModel.findById(session.userId);
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        (socket as any).user = {
          userId: user.id,
          username: user.username
        };

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        next(new Error('Authentication error: ' + errorMessage));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = (socket as any).user as AuthenticatedSocket;
      
      // Store user's socket connection
      this.userSockets.set(user.userId, socket.id);


      // Join user to their personal room for notifications
      socket.join(`user:${user.userId}`);

      // Join user to their following feed room
      this.joinFollowingFeed(socket, user.userId);

      // Chat events
      socket.on('join-chat', (chatId: number) => {
        this.handleJoinChat(socket, user, chatId);
      });

      socket.on('leave-chat', (chatId: number) => {
        socket.leave(`chat:${chatId}`);
      });

      socket.on('send-message', async (data: { chatId: number; message: string }) => {
        await this.handleSendMessage(socket, user, data);
      });

      // Live feed events
      socket.on('join-feed', () => {
        this.handleJoinFeed(socket, user);
      });

      socket.on('leave-feed', () => {
        socket.leave('live-feed');
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        this.userSockets.delete(user.userId);
      });
    });
  }

  private async handleJoinChat(socket: any, user: AuthenticatedSocket, chatId: number) {
    try {
      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Verify user is part of this chat
      if (chat.user_a !== user.userId && chat.user_b !== user.userId) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(`chat:${chatId}`);
      socket.emit('joined-chat', { chatId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join chat' });
    }
  }

  private async handleSendMessage(socket: any, user: AuthenticatedSocket, data: { chatId: number; message: string }) {
    try {
      const { chatId, message } = data;
      
      if (!message.trim()) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Verify user is part of this chat
      if (chat.user_a !== user.userId && chat.user_b !== user.userId) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      const isUserA = chat.user_a === user.userId;
      const chatMessage = await ChatMessageModel.create(chatId, isUserA, message.trim());
      
      if (!chatMessage) {
        socket.emit('error', { message: 'Failed to send message' });
        return;
      }

      // Log the message
      await AuditLogModel.create('message', 'chat', user.userId, chatId, `User ${user.username} sent message in chat ${chatId}`);

      // Emit message to all users in the chat
      const messageData = {
        id: chatMessage.id,
        chatId: chatMessage.chat_id,
        message: chatMessage.message,
        isUserA: chatMessage.is_user_a,
        created_at: chatMessage.created_at,
        sender: {
          id: user.userId,
          username: user.username
        }
      };

      this.io.to(`chat:${chatId}`).emit('new-message', messageData);

      // Send notification to the other user if they're not in the chat
      const otherUserId = isUserA ? chat.user_b : chat.user_a;
      const otherUserSocketId = this.userSockets.get(otherUserId);
      
      if (otherUserSocketId) {
        this.io.to(otherUserSocketId).emit('chat-notification', {
          chatId,
          message: messageData.message,
          sender: messageData.sender
        });
      }

    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async joinFollowingFeed(socket: any, userId: number) {
    try {
      const followingIds = await UserFollowModel.getFollowingIds(userId);
      if (followingIds.length > 0) {
        socket.join('following-feed');
      }
    } catch (error) {
    }
  }

  private handleJoinFeed(socket: any, user: AuthenticatedSocket) {
    socket.join('live-feed');
    socket.emit('joined-feed');
  }

  // Public methods for broadcasting events
  public async broadcastNewPost(post: any, author: any) {
    try {
      const postData = {
        id: post.id,
        type: post.type,
        content: post.content,
        created_at: post.created_at,
        author: {
          id: author.id,
          username: author.username,
          avatar_url: author.avatar_url
        },
        likeCount: 0,
        liked: false
      };

      // Broadcast to live feed
      this.io.to('live-feed').emit('new-post', postData);

      // Broadcast to following feed
      this.io.to('following-feed').emit('new-post', postData);
    } catch (error) {
    }
  }

  public async broadcastNewLike(postId: number, userId: number, likeCount: number) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) return;

      const likeData = {
        postId,
        userId,
        username: user.username,
        likeCount
      };

      this.io.to('live-feed').emit('post-liked', likeData);
      this.io.to('following-feed').emit('post-liked', likeData);
    } catch (error) {
    }
  }

  public async broadcastNewComment(postId: number, comment: any, author: any) {
    try {
      const commentData = {
        id: comment.id,
        postId,
        content: comment.content,
        created_at: comment.created_at,
        author: {
          id: author.id,
          username: author.username
        }
      };

      this.io.to('live-feed').emit('new-comment', commentData);
      this.io.to('following-feed').emit('new-comment', commentData);
    } catch (error) {
    }
  }

  public async broadcastNewFollow(followerId: number, followingId: number) {
    try {
      const [follower, following] = await Promise.all([
        UserModel.findById(followerId),
        UserModel.findById(followingId)
      ]);

      if (!follower || !following) return;

      const followData = {
        follower: {
          id: follower.id,
          username: follower.username
        },
        following: {
          id: following.id,
          username: following.username
        }
      };

      // Notify the user being followed
      const followingSocketId = this.userSockets.get(followingId);
      if (followingSocketId) {
        this.io.to(followingSocketId).emit('new-follower', followData);
      }

      // Broadcast to live feed
      this.io.to('live-feed').emit('new-follow', followData);
    } catch (error) {
    }
  }

  public getIO() {
    return this.io;
  }
} 