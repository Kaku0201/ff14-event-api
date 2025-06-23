import json
import requests
from bs4 import BeautifulSoup
import os
import re
from datetime import datetime

BASE_URL = "https://www.ff14.co.kr/news/event"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}
MAX_PAGES = 10  # 무한 루프 방지용 제한

def extract_image_url(style):
    # style="background-image:url(/img/banner/event/abc.jpg);"
    match = re.search(r'url\((.*?)\)', style)
    if match:
        url = match.group(1).strip('\'"')
        return "https://www.ff14.co.kr" + url
    return None

def parse_start_date(date_str):
    try:
        start_part = date_str.split("~")[0].strip()
        return datetime.strptime(start_part, "%y-%m-%d")
    except Exception:
        return datetime.min

def fetch_events():
    events = []
    page = 1

    while page <= MAX_PAGES:
        print(f"🔍 페이지 {page} 가져오는 중...")
        res = requests.get(f"{BASE_URL}?page={page}", headers=HEADERS)
        soup = BeautifulSoup(res.text, "html.parser")

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
            img_tag = li.select_one(".banner_img_wrap")

            if a_tag and title_tag and date_tag and img_tag:
                title = title_tag.text.strip()
                date = date_tag.text.strip()
                link = "https://www.ff14.co.kr" + a_tag["href"]
                image = extract_image_url(img_tag.get("style", ""))
                events.append({
                    "title": title,
                    "date": date,
                    "link": link,
                    "image": image,
                    "start": parse_start_date(date)
                })

        page += 1

    # 최신순 정렬
    events.sort(key=lambda x: x["start"], reverse=True)
    for e in events:
        del e["start"]

    os.makedirs("events", exist_ok=True)
    with open("events/events.json", "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    print(f"✔ 전체 진행 중 이벤트 수: {len(events)}건")

if __name__ == "__main__":
    fetch_events()
