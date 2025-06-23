import json
import requests
from bs4 import BeautifulSoup
import os

BASE_URL = "https://www.ff14.co.kr/news/event"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

def fetch_events():
    events = []
    page = 1

    while True:
        print(f"🔍 페이지 {page} 가져오는 중...")
        res = requests.get(f"{BASE_URL}?page={page}", headers=HEADERS)
        soup = BeautifulSoup(res.text, "html.parser")

        # 진행 중인 이벤트만 가져오기 (.banner_list.event만 선택)
        event_list = soup.select("ul.banner_list.event:not(.end)")
        if not event_list:
            print("📭 더 이상 진행 중인 이벤트 없음. 종료.")
            break

        cards = event_list[0].select("li")
        if not cards:
            print("📭 카드 없음. 종료.")
            break

        for li in cards:
            a_tag = li.select_one("a")
            title_tag = li.select_one(".txt_box .title .txt")
            date_tag = li.select_one(".date")

            if a_tag and title_tag and date_tag:
                title = title_tag.text.strip()
                date = date_tag.text.strip()
                link = "https://www.ff14.co.kr" + a_tag["href"]
                events.append({"title": title, "date": date, "link": link})

        page += 1

    os.makedirs("events", exist_ok=True)
    with open("events/events.json", "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    print(f"✔ 전체 진행 중 이벤트 수: {len(events)}건")

if __name__ == "__main__":
    fetch_events()
