import json
import requests
from bs4 import BeautifulSoup
import os
import time

BASE_URL = "https://www.ff14.co.kr/news/event"
HEADERS = {
    "User-Agent": "Mozilla/5.0"
}
MAX_PAGE = 10  # 페이지 제한 (안정성 확보)

def fetch_events():
    events = []
    page = 1

    while page <= MAX_PAGE:
        print(f"🔍 페이지 {page} 요청 중...")
        res = requests.get(f"{BASE_URL}?page={page}", headers=HEADERS)
        soup = BeautifulSoup(res.text, "html.parser")

        # 진행 중 이벤트 목록 추출
        event_list = soup.select("ul.banner_list.event:not(.end)")
        if not event_list:
            print("📭 진행 중 이벤트 없음. 종료.")
            break

        cards = event_list[0].select("li")
        if not cards:
            print("📭 카드 없음. 종료.")
            break

        for li in cards:
            a_tag = li.select_one("a")
            title_tag = li.select_one(".txt_box .title .txt")
            date_tag = li.select_one(".date")
            desc_tag = li.select_one(".summary.dot")

            if a_tag and title_tag and date_tag:
                title = title_tag.text.strip()
                date = date_tag.text.strip()
                link = "https://www.ff14.co.kr" + a_tag["href"]
                description = desc_tag.text.strip() if desc_tag else ""

                events.append({
                    "title": title,
                    "date": date,
                    "link": link,
                    "description": description  # ✅ 설명 추가
                })

        print(f"📄 페이지 {page} 처리 완료. 누적 {len(events)}건")
        page += 1
        time.sleep(1)  # 서버 부담 방지

    os.makedirs("events", exist_ok=True)
    with open("events/events.json", "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    print(f"✔ 전체 이벤트 수: {len(events)}건")

if __name__ == "__main__":
    fetch_events()
