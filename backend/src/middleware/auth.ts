import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  const token = authHeader.substring(7);

  try {
    const jwtSecret = process.env.JWT_SECRET || 'development-secret';
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function generateToken(userId: string): string {
  const jwtSecret = process.env.JWT_SECRET || 'development-secret';
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
}