import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export function validateContent(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.body.description && req.body.description.length > 1048576) {
    return res.status(400).json({
      success: false,
      error: 'Description exceeds 1MB limit'
    });
  }
  if (req.body.url && req.body.url.length > 8192) {
    return res.status(400).json({
      success: false,
      error: 'URL exceeds 8KB limit'
    });
  }
  next();
}