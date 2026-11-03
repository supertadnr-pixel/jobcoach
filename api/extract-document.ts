import { extractDocumentText } from '../src/lib/geminiService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file_base64, file_name, mime_type } = req.body || {};
    if (!file_base64) {
      return res.status(400).json({ error: '파일 데이터(file_base64)가 필요합니다.' });
    }

    const text = await extractDocumentText(
      file_base64,
      file_name || 'document.pdf',
      mime_type || 'application/pdf'
    );
    return res.status(200).json({ text, file_name });
  } catch (error: any) {
    console.error('Vercel API extract-document error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
