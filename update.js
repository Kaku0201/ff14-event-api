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
  const MAX_PAGE = 5; // 최대 5페이지까지 확인

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

        // ✅ 진행 중인 이벤트(.not(.end))만 추출
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
          
          // 홈페이지 위에서부터 읽은 순서대로 차곡차곡 배열에 추가됨
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

  // 중복된 이벤트 제거 (순서는 공홈에서 읽어온 그대로 유지됨!)
  const unique = allEvents.filter(
    (ev, i, arr) => arr.findIndex((a) => a.link === ev.link) === i
  );

  // 🚨 아까 넣었던 unique.sort(...) 부분은 깔끔하게 삭제했습니다!

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(unique, null, 2), "utf-8");
  console.log(
    `[${new Date().toISOString()}] ✅ 업데이트 완료: 총 ${unique.length}건 저장됨`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateEvents();
}
