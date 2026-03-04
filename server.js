import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cron from "node-cron";
import axios from "axios";
import { updateEvents } from "./update.js";


import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const serviceAccountPath = path.join(__dirname, "firebase-adminsdk.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


export async function sendPushNotification(title, body) {
  const message = {
    notification: {
      title: title,
      body: body
    },
    topic: "ff14_events" 
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("🔔 [푸시 알림 전송 성공]:", response);
  } catch (error) {
    console.error("❌ [푸시 알림 전송 실패]:", error);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing URL");

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0",
      },
    });

    let html = response.data;
    const hasHead = html.includes("<head>");
    const hasViewport = html.includes("viewport");

    if (hasHead && !hasViewport) {
      html = html.replace(
        "<head>",
        `<head><meta name="viewport" content="width=device-width, initial-scale=1.0">`
      );
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("프록시 실패:", err.message);
    res.status(500).send("프록시 실패");
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  await updateEvents(); 
});

cron.schedule("2 0 * * * *", async () => {
  console.log(`[${new Date().toISOString()}] ⏰ 정각 2초 갱신 실행!`);
  await updateEvents();
});
