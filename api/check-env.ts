export default function handler(req: any, res: any) {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  res.status(200).json({ hasOpenAI, hasGemini });
}
