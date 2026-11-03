import { matchResumeWithJobs } from '../src/lib/geminiService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resume_text, jobs } = req.body || {};
    if (!resume_text || typeof resume_text !== 'string' || !resume_text.trim()) {
      return res.status(400).json({ error: '이력서 본문(resume_text)을 입력해주세요.' });
    }

    const result = await matchResumeWithJobs(resume_text, jobs || []);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Vercel API match-resume error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
