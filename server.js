import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { updateEvents } from "./update.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

app.get("/events", (req, res) => {
  const filePath = path.join(__dirname, "events.json");
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "이벤트 파일 읽기 실패" });
    }
    res.header("Content-Type", "application/json");
    res.send(data);
  });
});

app.get("/", (_req, res) => {
  res.send("✅ FF14 이벤트 API 서버 작동 중!");
});

app.get("/update", async (_req, res) => {
  try {
    await updateEvents();
    res.send("✅ 이벤트 업데이트 완료");
  } catch (e) {
    console.error(e);
    res.status(500).send("❌ 업데이트 중 오류 발생");
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  await updateEvents();
});

cron.schedule("*/30 * * * *", async () => {
  console.log(`[${new Date().toISOString()}] ⏰ Scheduled updateEvents 실행`);
  await updateEvents();
});
