import json
import requests
from bs4 import BeautifulSoup
import os

URL = "https://www.ff14.co.kr/news/event"

def fetch_events():
    res = requests.get(URL)
    soup = BeautifulSoup(res.text, "html.parser")
    events = []

    for li in soup.select(".event_list li"):
        title_tag = li.select_one(".tit")
        date_tag = li.select_one(".date")
        link_tag = li.select_one("a")

        if title_tag and date_tag and link_tag:
            title = title_tag.text.strip()
            date = date_tag.text.strip()
            link = "https://www.ff14.co.kr" + link_tag["href"]
            events.append({"title": title, "date": date, "link": link})

    os.makedirs("events", exist_ok=True)
    with open("events/events.json", "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    fetch_events()
