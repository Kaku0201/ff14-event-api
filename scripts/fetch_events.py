import json
import requests
from bs4 import BeautifulSoup
import os
import re

BASE_URL = "https://www.ff14.co.kr/news/event"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

def extract_image_url(style: str) -> str:
    match = re.search(r'url\((.*?)\)', style)
    if match:
        return match.group(1).strip("'\"")
    return ""

def fetch_events():
    events = []
    page = 1

    while True:
        print(f"🔍 페이지 {page} 가져오는 중...")
        res = requests.get(f"{BASE_URL}?page={page}", headers=HEADERS)
        soup = BeautifulSoup(res.text, "html.parser")

        event_list = soup.select("ul.banner_list.event:not(.end)")
        if not event_list:
            break

        cards = event_list[0].select("li")
        if not cards:
            break

        for li in cards:
            a_tag = li.select_one("a")
            title_tag = li.select_one(".txt_box .title .txt")
            date_tag = li.select_one(".date")
            img_tag = li.select_one(".banner_img_wrap")

            if a_tag and title_tag and date_tag:
                title = title_tag.text.strip()
                date = date_tag.text.strip()
                link = "https://www.ff14.co.kr" + a_tag["href"]
                style = img_tag.get("style", "") if img_tag else ""
                image = extract_image_url(style)
                events.append({"title": title, "date": date, "link": link, "image": image})

        page += 1

    events.sort(key=lambda e: e["date"], reverse=True)  # 최신순 정렬

    os.makedirs("events", exist_ok=True)
    with open("events/events.json", "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    print(f"✔ 전체 이벤트 수: {len(events)}건")

if __name__ == "__main__":
    fetch_events()
