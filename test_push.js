import admin from "firebase-admin";
import fs from "fs";

// 1. 파이어베이스 열쇠(JSON) 파일 읽어오기
const serviceAccount = JSON.parse(fs.readFileSync("./firebase-adminsdk.json", "utf8"));

// 2. 파이어베이스 우체국 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 3. 보낼 메시지 작성 (이름: ff14_events 채널 구독자들에게)
const message = {
  notification: {
    title: "🔔 테스트 알림입니다!",
    body: "파이어베이스 푸시 알림이 성공적으로 연결되었습니다. 🎉 이제 이벤트가 뜨면 바로 알려드릴게요!"
  },
  topic: "ff14_events" // 앱에서 구독한 채널 주파수
};

// 4. 발사!
async function sendTest() {
  console.log("🚀 테스트 알림 전송을 시작합니다...");
  try {
    const response = await admin.messaging().send(message);
    console.log("✅ 알림 전송 대성공! 폰을 확인해보세요! (서버 응답:", response, ")");
  } catch (error) {
    console.error("❌ 알림 전송 실패:", error);
  }
}

sendTest();
