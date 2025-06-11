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
  const selectors = [
    ".banner_list.event li",
    "ul.list_event li",
    ".list_event li",
  ];
  const dateRegex =
    /[0-9]{2,4}[.\-][0-9]{2}[.\-][0-9]{2}\s*~\s*[0-9]{2,4}[.\-][0-9]{2}[.\-][0-9]{2}/;

  for (const url of pages) {
    console.log("▶ 크롤링:", url);
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Mobile)" },
    });
    const $ = cheerio.load(data);

    let els = [];
    for (const sel of selectors) {
      const found = $(sel).toArray();
      if (found.length) {
        console.log(`  • '${sel}' 에서 ${found.length}개 찾음`);
        els = found;
        break;
      }
    }
    if (!els.length) {
      console.warn("  ⚠️ 이벤트 요소를 찾지 못했습니다.");
      continue;
    }

    for (const el of els) {
      const $el = $(el);
      const raw = $el.text().replace(/\s+/g, " ").trim();
      const dateMatch = raw.match(dateRegex);
      const date = dateMatch ? dateMatch[0] : "";
      const [before, after] = raw.split(date);
      const title = before.trim();
      const description = (after || "").trim();
      const anchor = $el.find("a").first();
      const href = anchor.attr("href") || "";
      const link = href.startsWith("http")
        ? href
        : `https://www.ff14.co.kr${href}`;

      if (title && date && link) {
        allEvents.push({ title, date, link, description });
      }
    }
  }

  const unique = allEvents.filter(
    (ev, i, arr) => arr.findIndex((a) => a.link === ev.link) === i,
  );

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(unique, null, 2), "utf-8");
  console.log(
    `[${new Date().toISOString()}] ✅ 업데이트 완료: ${unique.length}건 저장됨`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateEvents();
}
