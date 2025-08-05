import ChatManager from "../service/chat.js";
import { DateTime, ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 📆 Freeze time (optional but helpful for consistent logs)
DateTime.now = () => 20250804160000;

// 🪵 Mock loggers for visibility
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 Test: Real DB run of autoArchiveChats
async function testAutoArchiveChatsRealDB() {
  try {
    const result = await ChatManager.autoArchiveChats();

    if (result === true) {
      console.log("✅ autoArchiveChats ran successfully.");
    } else if (Array.isArray(result)) {
      console.log(`✅ autoArchiveChats updated ${result.length} chats.`);
      for (const update of result) {
        if (update.error) {
          console.log("❌", update.chat_id, "→", update.error);
        } else {
          console.log("✅", update.chat_id, "→", update.result);
        }
      }
    } else {
      console.log(
        "❌ autoArchiveChats failed or returned unexpected result:",
        result
      );
    }
  } catch (err) {
    console.error("❌ Test crashed:", err.message);
  }
}

// 🚀 Runner
async function autoArchiveChats_test() {
  console.log("🔍 Running autoArchiveChats with real database...\n");

  // ✅ Load table configs if necessary
  await ScyllaDb.loadTableConfigs?.("./tables.json");

  // ✅ Execute test
  await testAutoArchiveChatsRealDB();

  console.log("-----");
}

autoArchiveChats_test();
export default autoArchiveChats_test;
