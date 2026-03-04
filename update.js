import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin"; // ✅ 푸시 알림을 위해 파이어베이스 도구 추가

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVENTS_FILE = path.resolve(__dirname, "./events.json");

// ✅ 파이어베이스 안전 초기화 (server.js와 충돌하지 않도록 확인 후 켭니다)
let serviceAccount;
if (process.env.FIREBASE_CREDENTIALS) {
  // 깃허브 액션(서버)에서 돌아갈 때는 비밀 금고에서 열쇠를 꺼냅니다!
  serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} else {
  // 내 컴퓨터에서 테스트할 때는 기존처럼 파일을 읽습니다.
  const serviceAccountPath = path.resolve(__dirname, "./firebase-adminsdk.json");
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  }
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export async function updateEvents() {
  console.log(`[${new Date().toISOString()}] ▶ updateEvents 시작`);

  // 💡 1. 기존 이벤트 불러오기 (새 이벤트 비교용)
  let oldEvents = [];
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      oldEvents = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));
    } catch (e) {
      console.error("기존 이벤트 파일 읽기 실패:", e);
    }
  }

  const allEvents = [];
  const MAX_PAGE = 5;

  for (let page = 1; page <= MAX_PAGE; page++) {
    const url = page === 1 
        ? "https://www.ff14.co.kr/news/event" 
        : `https://www.ff14.co.kr/news/event?page=${page}`;
        
    console.log(`▶ 크롤링 중: 페이지 ${page}`);
    
    try {
        const { data } = await axios.get(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Mobile)" },
        });
        const $ = cheerio.load(data);

        const eventList = $("ul.banner_list.event:not(.end) li");

        if (eventList.length === 0) {
          console.log(`  📭 페이지 ${page}에 진행 중인 이벤트가 없습니다. 크롤링을 종료합니다.`);
          break;
        }

        eventList.each((_, el) => {
          const $el = $(el);
          
          const anchor = $el.find("a").first();
          const href = anchor.attr("href") || "";
          const link = href.startsWith("http")
            ? href
            : `https://www.ff14.co.kr${href}`;

          let title = $el.find(".txt_box .title .txt").text().trim();
          if (!title) {
             title = $el.find(".title").text().trim();
          }

          let date = $el.find(".date").text().trim();
          let description = $el.find(".summary.dot").text().trim();
          
          if (title && link) {
            allEvents.push({ title, date, link, description });
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
    } catch (error) {
        console.error(`  ❌ 페이지 ${page} 크롤링 중 오류 발생:`, error.message);
        break;
    }
  }

  const unique = allEvents.filter(
    (ev, i, arr) => arr.findIndex((a) => a.link === ev.link) === i
  );

  // 💡 2. 새 이벤트 찾아내기 (기존 목록에 없는 링크 찾기)
  const oldLinks = oldEvents.map((e) => e.link);
  const newEvents = unique.filter((e) => !oldLinks.includes(e.link));

  // 💡 3. 파일 최신화 저장
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`[${new Date().toISOString()}] ✅ 업데이트 완료: 총 ${unique.length}건 저장됨`);

  // 🚀 4. 진짜 '새 이벤트'가 있을 때만 앱으로 알림 쏘기!
  // (oldEvents.length > 0 조건은, 처음 서버 켤 때 기존 이벤트 수십 개가 알림으로 폭격되는 것을 막아줍니다)
  if (oldEvents.length > 0 && newEvents.length > 0) {
    console.log(`🎉 새로운 이벤트 ${newEvents.length}개 발견! 알림 전송을 시작합니다.`);
    
    for (const ev of newEvents) {
      try {
        const message = {
          notification: {
            title: `🎉 신규 이벤트: ${ev.title}`,
            body: ev.description || "새로운 이벤트가 시작되었습니다! 앱에서 확인하세요."
          },
          topic: "ff14_events" // 앱에서 구독한 이름!
        };
        await admin.messaging().send(message);
        console.log(`🔔 알림 전송 성공: ${ev.title}`);
        
        // 여러 개일 경우 너무 동시에 가지 않도록 0.5초 딜레이
        await new Promise(res => setTimeout(res, 500)); 
      } catch (error) {
        console.error(`❌ 알림 전송 실패 (${ev.title}):`, error);
      }
    }
  } else if (newEvents.length > 0) {
    console.log(`💡 처음 켜져서 ${newEvents.length}개가 새로 저장되었습니다. (알림 폭탄 방지를 위해 전송은 생략합니다)`);
  } else {
    console.log(`💤 새로 추가된 이벤트가 없습니다.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateEvents();
}
