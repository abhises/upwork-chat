import ChatManager from "../service/chat.js";
import { DateTime, ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 📆 Optional: Freeze time if needed
DateTime.now = () => 20250804160000;

// 🪵 Loggers (keep for debug visibility)
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 Real DB test (no mocking)
async function testExpireOldChatsRealDB() {
  const result = await ChatManager.expireOldChats();
  console.log("✅ expireOldChats (real DB run) →", result);
}

// async function testScanChatsTable() {
//   try {
//     const allChats = await ScyllaDb.scan("chats"); // full scan
//     console.log("🔍 All chats found:", allChats);

//     console.log(`✅ Total chats found: ${allChats.length}`);
//   } catch (err) {
//     console.error("❌ Error scanning chats table:", err.message);
//   }
// }

// 🚀 Runner
async function expireOldChats_real_test() {
  console.log("🔍 Running expireOldChats with real database...\n");

  // Optional: ensure DB config is loaded
  await ScyllaDb.loadTableConfigs?.("./tables.json");
  //   await testScanChatsTable();
  await testExpireOldChatsRealDB();
  console.log("-----");
}

expireOldChats_real_test();
export default expireOldChats_real_test;
