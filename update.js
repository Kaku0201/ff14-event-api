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
  const MAX_PAGE = 5; // 최대 5페이지까지 확인 (더 이상 진행 중인 이벤트가 없으면 자동 종료)

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

        // 더 이상 진행 중인 이벤트가 없다면 반복문 탈출 (예: 3페이지까지만 진행 중이면 4, 5페이지는 스킵)
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

          // 클래스명으로 텍스트 추출 (날짜 형식이 없거나 달라도 무조건 가져옴)
          let title = $el.find(".txt_box .title .txt").text().trim();
          if (!title) {
             title = $el.find(".title").text().trim();
          }

          let date = $el.find(".date").text().trim();
          let description = $el.find(".summary.dot").text().trim();
          
          // 제목과 링크가 존재하면 리스트에 추가 (1페이지부터 넣으므로 최신순 유지)
          if (title && link) {
            allEvents.push({ title, date, link, description });
          }
        });
        
        // 서버 과부하 방지를 위해 페이지 이동 전 1초 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        
    } catch (error) {
        console.error(`  ❌ 페이지 ${page} 크롤링 중 오류 발생:`, error.message);
        break;
    }
  }

  // 중복된 이벤트 제거 (순서는 1페이지부터 담긴 그대로 유지)
  const unique = allEvents.filter(
    (ev, i, arr) => arr.findIndex((a) => a.link === ev.link) === i
  );

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(unique, null, 2), "utf-8");
  console.log(
    `[${new Date().toISOString()}] ✅ 업데이트 완료: 총 ${unique.length}건 저장됨`
  );
}

// 직접 실행용
if (import.meta.url === `file://${process.argv[1]}`) {
  updateEvents();
}
