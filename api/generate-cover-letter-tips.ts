import { generateCoverLetterTips } from '../src/lib/geminiService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { company, title, summary, requirements } = req.body || {};
    const result = await generateCoverLetterTips({
      company: company || '',
      title: title || '',
      summary: summary || '',
      requirements: requirements || '',
    });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Vercel API generate-cover-letter-tips error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
