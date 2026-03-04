import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVENTS_FILE = path.resolve(__dirname, "./events.json");

export async function updateEvents() {
  console.log(`[${new Date().toISOString()}] ▶ updateEvents 시작`);

  const allEvents = [];
  const pages = [
    "https://www.ff14.co.kr/news/event",
    "https://www.ff14.co.kr/news/event?page=2",
  ];

  for (const url of pages) {
    console.log("▶ 크롤링:", url);
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Mobile)" },
    });
    const $ = cheerio.load(data);

    // ✅ 종료된 이벤트(.end)를 제외하고 진행 중인 이벤트만 정확히 타겟팅
    const eventList = $("ul.banner_list.event:not(.end) li");

    if (eventList.length === 0) {
      console.warn("  ⚠️ 이벤트 요소를 찾지 못했습니다.");
      continue;
    }

    eventList.each((_, el) => {
      const $el = $(el);
      
      const anchor = $el.find("a").first();
      const href = anchor.attr("href") || "";
      const link = href.startsWith("http")
        ? href
        : `https://www.ff14.co.kr${href}`;

      // ✅ 정규식으로 텍스트를 쪼개지 않고, 클래스명으로 텍스트를 안전하게 직출출!
      let title = $el.find(".txt_box .title .txt").text().trim();
      // 만약 공홈 구조가 살짝 다를 경우를 대비한 예비(fallback) 로직
      if (!title) {
         title = $el.find(".title").text().trim();
      }

      let date = $el.find(".date").text().trim();
      let description = $el.find(".summary.dot").text().trim();
      
      // 제목과 링크가 존재하면 무조건 리스트에 추가 (날짜 형식이 이상해도 OK!)
      if (title && link) {
        allEvents.push({ title, date, link, description });
      }
    });
  }

  // 중복된 이벤트 제거 (링크 기준)
  const unique = allEvents.filter(
    (ev, i, arr) => arr.findIndex((a) => a.link === ev.link) === i,
  );

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(unique, null, 2), "utf-8");
  console.log(
    `[${new Date().toISOString()}] ✅ 업데이트 완료: ${unique.length}건 저장됨`
  );
}

// 직접 실행했을 때 동작하도록 설정
if (import.meta.url === `file://${process.argv[1]}`) {
  updateEvents();
}
