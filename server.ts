import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  analyzeJobText,
  generateCoverLetterTips,
  matchResumeWithJobs,
  extractDocumentText,
} from './src/lib/geminiService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '25mb' }));

// POST /api/analyze-job
app.post('/api/analyze-job', async (req, res) => {
  const { jd_text } = req.body;
  if (!jd_text || typeof jd_text !== 'string' || !jd_text.trim()) {
    res.status(400).json({ error: '공고 본문(jd_text)을 입력해주세요.' });
    return;
  }

  const result = await analyzeJobText(jd_text);
  res.json(result);
});

// POST /api/generate-cover-letter-tips
app.post('/api/generate-cover-letter-tips', async (req, res) => {
  const { company, title, summary, requirements } = req.body;
  const result = await generateCoverLetterTips({
    company,
    title,
    summary,
    requirements,
  });
  res.json(result);
});

// POST /api/match-resume
app.post('/api/match-resume', async (req, res) => {
  const { resume_text, jobs } = req.body;
  if (!resume_text || typeof resume_text !== 'string' || !resume_text.trim()) {
    res.status(400).json({ error: '이력서 본문(resume_text)을 입력해주세요.' });
    return;
  }

  const result = await matchResumeWithJobs(resume_text, jobs || []);
  res.json(result);
});

// POST /api/extract-document (PDF, Word docx extraction)
app.post('/api/extract-document', async (req, res) => {
  const { file_base64, file_name, mime_type } = req.body;
  if (!file_base64) {
    res.status(400).json({ error: '파일 데이터(file_base64)가 필요합니다.' });
    return;
  }

  const text = await extractDocumentText(
    file_base64,
    file_name || 'document.pdf',
    mime_type || 'application/pdf'
  );
  res.json({ text, file_name });
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Vite middleware for dev or static files for prod
async function setupServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
