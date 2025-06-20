import { Store, type SessionData } from "express-session";
import { query } from "../database/connection";

const TABLE_NAME = 'sessions';
await query(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (sid VARCHAR(255) PRIMARY KEY, session TEXT)`);

export class SessionStore extends Store {
  async get(sid: string, callback: (err: any, session?: SessionData | null) => void): Promise<void> {
    try {
      const results = await query(`SELECT session FROM ${TABLE_NAME} WHERE sid = ?`, [sid]);
      
      if (results && (results as any)[0]) {
        const sessionData = JSON.parse((results as any)[0].session);
        callback(null, sessionData);
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, session: SessionData, callback: (err?: any) => void = () => {}): Promise<void> {
    try {
      await query(`INSERT INTO ${TABLE_NAME} (sid, session) VALUES (?, ?) ON DUPLICATE KEY UPDATE session = VALUES(session)`, [sid, JSON.stringify(session)]);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid: string, callback: (err?: any) => void = () => {}): Promise<void> {
    try {
      await query(`DELETE FROM ${TABLE_NAME} WHERE sid = ?`, [sid]);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid: string, session: SessionData, callback: (err?: any) => void = () => {}): Promise<void> {
    try {
      await query(`UPDATE ${TABLE_NAME} SET session = ? WHERE sid = ?`, [JSON.stringify(session), sid]);
    } catch (err) {
      // ignore
    } finally {
      callback();
    }
  }

  async all(callback: (err: any, obj?: SessionData[] | { [sid: string]: SessionData } | null) => void): Promise<void> {
    try {
      const results = await query(`SELECT * FROM ${TABLE_NAME}`);
      callback(null, results as any);
    } catch (err) {
      callback(err);
    }
  }

  async length(callback: (err: any, length?: number) => void): Promise<void> {
    try {
      const results = await query(`SELECT COUNT(*) FROM ${TABLE_NAME}`);
      callback(null, (results as any)[0].count);
    } catch (err) {
      callback(err);
    }
  }

  async clear(callback: (err?: any) => void = () => {}): Promise<void> {
    try {
      await query(`DELETE FROM ${TABLE_NAME}`);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}