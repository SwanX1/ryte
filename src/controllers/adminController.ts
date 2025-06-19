import type { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLog';
import { query } from '../database/connection';

export class AdminController {
  static async getUsersPage(req: Request, res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/auth/login');
    }

    // Check if user is admin
    const user = await UserModel.findById(userId);
    if (!user || user.role !== 'administrator') {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page.'
      });
    }

    try {
      // Get all users
      const users = await query('SELECT * FROM users ORDER BY created_at DESC') as any[];
      
      res.render('admin/users', {
        title: 'User Management',
        users: users
      });
    } catch (error) {
      console.error('Error loading users:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'An error occurred while loading users.'
      });
    }
  }

  static async getUserLogs(req: Request<{ userId: string }>, res: Response) {
    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const admin = await UserModel.findById(adminId);
    if (!admin || admin.role !== 'administrator') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
      const logs = await AuditLogModel.getLogsByUser(userId);
      res.json({ logs });
    } catch (error) {
      console.error('Error loading user logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateUserRole(req: Request<{ userId: string }>, res: Response) {
    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const admin = await UserModel.findById(adminId);
    if (!admin || admin.role !== 'administrator') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { role } = req.body;
    if (!role || !['registered', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    try {
      // Get the user being updated
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent admin from changing their own role
      if (userId === adminId) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      // Update user role
      await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

      // Log the action
      await AuditLogModel.create(
        'role_update',
        'user',
        adminId,
        userId,
        `Admin ${admin.username} changed user ${user.username} role from ${user.role} to ${role}`
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 