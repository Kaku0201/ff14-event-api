import json
import requests
from bs4 import BeautifulSoup
import os

URL = "https://www.ff14.co.kr/news/event"

def fetch_events():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    res = requests.get(URL, headers=headers)
    soup = BeautifulSoup(res.text, "html.parser")
    events = []

    for li in soup.select(".banner_list.event li"):
        a_tag = li.select_one("a")
        title_tag = li.select_one(".txt_box .title .txt")
        date_tag = li.select_one(".date")

        if a_tag and title_tag and date_tag:
            title = title_tag.text.strip()
            date = date_tag.text.strip()
            link = "https://www.ff14.co.kr" + a_tag["href"]
            events.append({"title": title, "date": date, "link": link})

    os.makedirs("events", exist_ok=True)
    with open("events/events.json", "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    print(f"✔ 크롤링 완료: {len(events)}건")

if __name__ == "__main__":
    fetch_events()
