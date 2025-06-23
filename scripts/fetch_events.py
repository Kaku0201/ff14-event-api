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
            image_tag = li.select_one(".banner_img_wrap")

            image_url = ""
            if image_tag and "background-image" in image_tag.get("style", ""):
                style = image_tag["style"]
                start = style.find("url(")
                end = style.find(")", start)
                if start != -1 and end != -1:
                    image_url = style[start + 4:end].strip('"')

            if a_tag and title_tag and date_tag:
                title = title_tag.text.strip()
                date = date_tag.text.strip()
                link = "https://www.ff14.co.kr" + a_tag["href"]
                events.append({
                    "title": title,
                    "date": date,
                    "link": link,
                    "image": image_url
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
