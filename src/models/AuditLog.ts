import { query } from '../database/connection';
import type { User } from './User';

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  created_at: string;
}

export class AuditLogModel {
  static async create(
    action: string,
    entityType: string,
    userId: number | null = null,
    entityId: number | null = null,
    details: string = ''
  ): Promise<AuditLog | null> {
    try {
      const result = await query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [userId, action, entityType, entityId, details]
      ) as any;

      if (result.insertId) {
        return this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating audit log:', error);
      return null;
    }
  }

  static async findById(id: number): Promise<AuditLog | null> {
    try {
      const logs = await query(
        'SELECT * FROM audit_logs WHERE id = ?',
        [id]
      ) as AuditLog[];

      return logs[0] || null;
    } catch (error) {
      console.error('Error finding audit log:', error);
      return null;
    }
  }

  static async getLogsByUser(userId: number): Promise<AuditLog[]> {
    try {
      return await query(
        'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      ) as AuditLog[];
    } catch (error) {
      console.error('Error getting logs by user:', error);
      return [];
    }
  }

  static async getLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    try {
      return await query(
        'SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
        [entityType, entityId]
      ) as AuditLog[];
    } catch (error) {
      console.error('Error getting logs by entity:', error);
      return [];
    }
  }

  static async getLogsByAction(action: string): Promise<AuditLog[]> {
    try {
      return await query(
        'SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC',
        [action]
      ) as AuditLog[];
    } catch (error) {
      console.error('Error getting logs by action:', error);
      return [];
    }
  }

  static async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT,
          action VARCHAR(255) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INT,
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
    } catch (error) {
      console.error('Error initializing audit_logs table:', error);
      throw error;
    }
  }
} 