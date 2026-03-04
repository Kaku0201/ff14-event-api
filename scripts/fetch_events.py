import json
import requests
from bs4 import BeautifulSoup
import os
import time

BASE_URL = "https://www.ff14.co.kr/news/event"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
MAX_PAGE = 5  # ✅ 1~2페이지가 아니라 최대 5페이지까지 넉넉하게 긁어옵니다.

def fetch_events():
    events = []
    
    # 1페이지부터 5페이지까지 차례대로 확인
    for page in range(1, MAX_PAGE + 1):
        print(f"🔍 페이지 {page} 요청 중...")
        try:
            res = requests.get(f"{BASE_URL}?page={page}", headers=HEADERS, timeout=10)
            soup = BeautifulSoup(res.text, "html.parser")

            # ✅ '종료된 이벤트(.end)'를 포함하는 덩어리를 아예 제외하고 '진행 중인 이벤트'만 추출!
            event_lists = soup.select("ul.banner_list.event:not(.end)")
            
            # 진행 중인 이벤트가 아예 없으면 더 이상 페이지를 넘길 필요가 없으므로 종료
            if not event_lists:
                print(f"  📭 페이지 {page}에 진행 중인 이벤트가 없습니다. 크롤링을 종료합니다.")
                break
            
            cards = event_lists[0].select("li")
            if not cards:
                break

            for li in cards:
                a_tag = li.select_one("a")
                # 제목 추출 (구조 변경 대비)
                title_tag = li.select_one(".txt_box .title .txt") or li.select_one(".title")
                date_tag = li.select_one(".date")
                desc_tag = li.select_one(".summary.dot") # ✅ 설명글(description)도 가져옵니다.

                if a_tag and title_tag and date_tag:
                    title = title_tag.text.strip()
                    date = date_tag.text.strip()
                    link = a_tag["href"]
                    description = desc_tag.text.strip() if desc_tag else ""

                    if not link.startswith("http"):
                        link = "https://www.ff14.co.kr" + link

                    events.append({
                        "title": title,
                        "date": date,
                        "link": link,
                        "description": description
                    })
            
            # 서버 부하를 막기 위해 페이지 넘어가기 전 1초 대기 매너
            time.sleep(1)

        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            break

    if not events:
        print("🚨 수집된 이벤트가 0건입니다. 기존 데이터를 보호하기 위해 저장을 중단합니다.")
        return

    # 🚨 가장 중요한 부분! 공홈에서 읽은 "순서를 그대로 유지"하면서 중복만 제거합니다.
    # (이전 코드의 set 방식은 순서를 섞어버립니다)
    unique_events = []
    seen = set()
    for ev in events:
        if ev['link'] not in seen:
            seen.add(ev['link'])
            unique_events.append(ev)

    os.makedirs("events", exist_ok=True)
    with open("events/events.json", "w", encoding="utf-8") as f:
        json.dump(unique_events, f, ensure_ascii=False, indent=2)

    print(f"✔ 업데이트 완료: 총 {len(unique_events)}건 저장됨")

if __name__ == "__main__":
    fetch_events()
