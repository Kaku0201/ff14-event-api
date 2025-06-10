import fs from "fs";
import axios from "axios";

export async function updateEvents() {
  // 예시: 이벤트 크롤링 후 저장
  const exampleEvents = [
    { title: "예시 이벤트1", date: "2025-06-10", link: "https://www.ff14.co.kr" }
  ];
  fs.writeFileSync("events.json", JSON.stringify(exampleEvents, null, 2), "utf-8");
}
