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
  const MAX_PAGE = 2; // 가져올 페이지 수 (필요시 늘려주세요)

  for (let page = 1; page <= MAX_PAGE; page++) {
    const url = `https://www.ff14.co.kr/news/event?page=${page}`;
    console.log("▶ 크롤링:", url);

    try {
      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      const $ = cheerio.load(data);

      // ✅ Python 코드의 우수한 선택자 로직을 그대로 이식했습니다!
      const eventList = $("ul.banner_list.event:not(.end) li");

      if (eventList.length === 0) {
        console.log("  📭 진행 중 이벤트가 더 이상 없습니다.");
        break; // 진행 중인 이벤트가 없으면 다음 페이지로 갈 필요 없이 멈춤
      }

      eventList.each((_, el) => {
        const $el = $(el);
        const title = $el.find(".txt_box .title .txt").text().trim();
        const date = $el.find(".date").text().trim();
        const description = $el.find(".summary.dot").text().trim();
        const href = $el.find("a").attr("href") || "";
        const link = href.startsWith("http") ? href : `https://www.ff14.co.kr${href}`;

        // 제목과 날짜가 정상적으로 있을 때만 배열에 추가
        if (title && date) {
          allEvents.push({ title, date, link, description });
        }
      });
      
      console.log(`  • 페이지 ${page} 에서 ${eventList.length}개 찾음`);
      
      // 서버 부담을 줄이기 위해 페이지 전환 시 1초 대기 (매너 타이머)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ❌ 페이지 ${page} 크롤링 실패:`, error.message);
    }
  }

  // 중복된 이벤트 제거 (링크 기준)
  const unique = allEvents.filter(
    (ev, i, arr) => arr.findIndex((a) => a.link === ev.link) === i,
  );

  // JSON 파일로 저장
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(unique, null, 2), "utf-8");
  console.log(
    `[${new Date().toISOString()}] ✅ 업데이트 완료: 총 ${unique.length}건 저장됨`
  );
}

// 직접 실행했을 때 작동하도록 설정
if (import.meta.url === `file://${process.argv[1]}`) {
  updateEvents();
}
