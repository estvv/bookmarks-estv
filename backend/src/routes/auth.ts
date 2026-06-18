import { Router } from 'express';
import { generateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, error: 'Password required' });
  }

  const authPassword = process.env.AUTH_PASSWORD;
  if (!authPassword) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  if (password !== authPassword) {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }

  const token = generateToken('user');
  res.json({ success: true, data: { token } });
});

export default router;