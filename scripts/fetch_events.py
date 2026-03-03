import json
import requests
from bs4 import BeautifulSoup
import os
import time

BASE_URL = "https://www.ff14.co.kr/news/event"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def fetch_events():
    events = []
    # 1페이지와 2페이지만 긁어옵니다. (안정성)
    for page in range(1, 3):
        print(f"🔍 페이지 {page} 요청 중...")
        try:
            res = requests.get(f"{BASE_URL}?page={page}", headers=HEADERS, timeout=10)
            soup = BeautifulSoup(res.text, "html.parser")

            # ✅ 더 넓은 범위의 선택자를 사용하여 데이터를 찾습니다.
            cards = soup.select("ul.list_event li") or soup.select(".banner_list.event li")
            
            if not cards:
                print(f"⚠️ 페이지 {page}에서 이벤트 요소를 찾지 못했습니다.")
                continue

            for li in cards:
                a_tag = li.select_one("a")
                title_tag = li.select_one(".title .txt") or li.select_one("dt")
                date_tag = li.select_one(".date") or li.select_one("dd")

                if a_tag and title_tag and date_tag:
                    title = title_tag.text.strip()
                    date = date_tag.text.strip()
                    link = a_tag["href"]
                    if not link.startswith("http"):
                        link = "https://www.ff14.co.kr" + link
                    
                    # 종료된 이벤트는 제외 (보통 '종료'라는 글자가 포함됨)
                    if "종료" in li.get('class', []) or "end" in li.get('class', []):
                        continue

                    events.append({
                        "title": title,
                        "date": date,
                        "link": link,
                        "description": "" # 설명은 생략하거나 선택자 추가 가능
                    })
        except Exception as e:
            print(f"❌ 오류 발생: {e}")

    if not events:
        print("🚨 수집된 이벤트가 0건입니다. 기존 데이터를 보호하기 위해 저장을 중단합니다.")
        return

    # 중복 제거
    unique_events = [dict(t) for t in {tuple(d.items()) for d in events}]

    os.makedirs("events", exist_ok=True)
    with open("events/events.json", "w", encoding="utf-8") as f:
        json.dump(unique_events, f, ensure_ascii=False, indent=2)

    print(f"✔ 업데이트 완료: {len(unique_events)}건 저장됨")

if __name__ == "__main__":
    fetch_events()
