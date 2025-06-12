import { query } from '../database/connection';

export abstract class BaseModel {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findAll() {
    return await query(`SELECT * FROM ${this.tableName}`);
  }

  async findById(id: number) {
    const results = await query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return Array.isArray(results) ? results[0] : null;
  }

  async create(data: Record<string, any>) {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');

    const result = await query(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
      values
    );

    return result;
  }

  async update(id: number, data: Record<string, any>) {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(data), id];

    return await query(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
      values
    );
  }

  async delete(id: number) {
    return await query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }
}