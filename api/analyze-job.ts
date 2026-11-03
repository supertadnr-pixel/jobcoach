import { analyzeJobText } from '../src/lib/geminiService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jd_text } = req.body || {};
    if (!jd_text || typeof jd_text !== 'string' || !jd_text.trim()) {
      return res.status(400).json({ error: '공고 본문(jd_text)을 입력해주세요.' });
    }

    const result = await analyzeJobText(jd_text);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Vercel API analyze-job error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
