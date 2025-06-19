import type { Request, Response, NextFunction } from 'express';
import { ChatModel } from '../models/Chat';
import { ChatMessageModel } from '../models/ChatMessage';
import { UserModel } from '../models/User';

export class ChatController {
  static async showChat(req: Request, res: Response, next: NextFunction) {
    const sessionUserId = req.session?.userId;
    const userIdParam = req.params.userId;
    if (!sessionUserId || typeof userIdParam !== 'string') {
      return res.redirect('/');
    }
    const targetUserId = parseInt(userIdParam);
    if (isNaN(targetUserId) || sessionUserId === targetUserId) {
      return res.redirect('/');
    }
    const [sessionUser, targetUser] = await Promise.all([
      UserModel.findById(sessionUserId),
      UserModel.findById(targetUserId)
    ]);
    if (!sessionUser || !targetUser) return next();
    if (!sessionUser.email_verified || !targetUser.email_verified) {
      return res.status(403).render('error', {
        title: 'Direct Messages Not Allowed',
        message: 'Both users must have verified their email to use direct messages.'
      });
    }
    let chat = await ChatModel.findByUsers(sessionUserId, targetUserId);
    if (!chat) {
      chat = await ChatModel.create(sessionUserId, targetUserId);
    }
    if (!chat) return next();

    const messages = await ChatMessageModel.listByChat(chat.chat_id);

    res.render('chat/chat', {
      messages,
      layout: 'main',
      title: `Chat with ${targetUser.username}`,
      chat,
      targetUser,
      isUserA: chat.user_a === sessionUserId
    });
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    const sessionUserId = req.session?.userId;
    const chatIdParam = req.params.chatId;
    if (!sessionUserId || typeof chatIdParam !== 'string') {
      return res.redirect('/');
    }
    const chatId = parseInt(chatIdParam);
    if (isNaN(chatId)) return res.redirect('/');
    const chat = await ChatModel.findById(chatId);
    if (!chat) return res.redirect('/');
    const isUserA = chat.user_a === sessionUserId;
    const message = req.body.message;
    if (typeof message !== 'string' || !message.trim()) {
      return res.redirect(`/chats/${isUserA ? chat.user_b : chat.user_a}`);
    }
    await ChatMessageModel.create(chatId, isUserA, message.trim());
    res.redirect(`/chats/${isUserA ? chat.user_b : chat.user_a}`);
  }
} 