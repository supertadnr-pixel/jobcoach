export default function handler(_req: any, res: any) {
  return res.status(200).json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
}
