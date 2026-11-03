import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  analyzeJobText,
  generateCoverLetterTips,
  matchResumeWithJobs,
  extractDocumentText
} from "./src/lib/geminiService";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: "25mb" }));
app.post("/api/analyze-job", async (req, res) => {
  const { jd_text } = req.body;
  if (!jd_text || typeof jd_text !== "string" || !jd_text.trim()) {
    res.status(400).json({ error: "\uACF5\uACE0 \uBCF8\uBB38(jd_text)\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." });
    return;
  }
  const result = await analyzeJobText(jd_text);
  res.json(result);
});
app.post("/api/generate-cover-letter-tips", async (req, res) => {
  const { company, title, summary, requirements } = req.body;
  const result = await generateCoverLetterTips({
    company,
    title,
    summary,
    requirements
  });
  res.json(result);
});
app.post("/api/match-resume", async (req, res) => {
  const { resume_text, jobs } = req.body;
  if (!resume_text || typeof resume_text !== "string" || !resume_text.trim()) {
    res.status(400).json({ error: "\uC774\uB825\uC11C \uBCF8\uBB38(resume_text)\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." });
    return;
  }
  const result = await matchResumeWithJobs(resume_text, jobs || []);
  res.json(result);
});
app.post("/api/extract-document", async (req, res) => {
  const { file_base64, file_name, mime_type } = req.body;
  if (!file_base64) {
    res.status(400).json({ error: "\uD30C\uC77C \uB370\uC774\uD130(file_base64)\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
    return;
  }
  const text = await extractDocumentText(
    file_base64,
    file_name || "document.pdf",
    mime_type || "application/pdf"
  );
  res.json({ text, file_name });
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
async function setupServer() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const PORT = 3e3;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}
setupServer();
