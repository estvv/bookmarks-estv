import express from 'express';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { initDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import bookmarksRoutes from './routes/bookmarks.js';
import foldersRoutes from './routes/folders.js';
import tagsRoutes from './routes/tags.js';
import sharedRoutes from './routes/shared.js';
import importExportRoutes from './routes/import-export.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

app.set('trust proxy', 2);

initDatabase();

app.use(express.json({ limit: '2mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  message: { success: false, error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many login attempts' }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/shared', sharedRoutes);
app.use('/api/io', importExportRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});