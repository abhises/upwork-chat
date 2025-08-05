import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// ⛏️ Mock logs
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid unread count
async function testUnreadCountValid() {
  const userId = "user_001"; // ensure userSettings exist
  const chatId = "chat#202508041601"; // seeded chat

  const result = await ChatManager.getUnreadCount(userId, chatId);
  console.log("✅ getUnreadCount (valid) →", result);
}

// 🧪 2️⃣ Missing userId
async function testUnreadCountMissingUser() {
  const result = await ChatManager.getUnreadCount(null, "chat#202508041601");
  console.log("❌ getUnreadCount (missing userId) →", result);
}

// 🧪 3️⃣ Missing chatId
async function testUnreadCountMissingChat() {
  const result = await ChatManager.getUnreadCount("user_001", null);
  console.log("❌ getUnreadCount (missing chatId) →", result);
}

// 🧪 4️⃣ Nonexistent user
async function testUnreadCountNonexistentUser() {
  const result = await ChatManager.getUnreadCount(
    "user_doesnotexist",
    "chat#202508041601"
  );
  console.log("❌ getUnreadCount (nonexistent user) →", result);
}

// 🧪 5️⃣ Nonexistent chat
async function testUnreadCountNonexistentChat() {
  const result = await ChatManager.getUnreadCount(
    "user_001",
    "chat#doesnotexist"
  );
  console.log("❌ getUnreadCount (nonexistent chat) →", result);
}

// 🚀 Runner
async function runUnreadCountTests() {
  console.log("🔍 Running getUnreadCount tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testUnreadCountValid();
  console.log("-----");

  await testUnreadCountMissingUser();
  console.log("-----");

  await testUnreadCountMissingChat();
  console.log("-----");

  await testUnreadCountNonexistentUser();
  console.log("-----");

  await testUnreadCountNonexistentChat();
  console.log("-----");
}

runUnreadCountTests();

export default runUnreadCountTests;
