import type { Request, Response } from 'express';
import { BaseModel } from '../models/BaseModel';

export abstract class BaseController {
  protected model: BaseModel;

  constructor(model: BaseModel) {
    this.model = model;
  }

  async getAll(req: Request, res: Response) {
    try {
      const items = await this.model.findAll();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '0');
      const item = await this.model.findById(id);

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const result = await this.model.create(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create item' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '0');
      const result = await this.model.update(id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update item' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '0');
      await this.model.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete item' });
    }
  }
}