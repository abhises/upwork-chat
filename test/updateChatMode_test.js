import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 🪵 Logging Setup
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid update (with maxParticipants)
async function testValidModeUpdate() {
  const chatId = "chat#202508041601"; // existing chat ID
  const mode = "live";
  const maxParticipants = 20;

  const result = await ChatManager.updateChatMode(
    chatId,
    mode,
    maxParticipants
  );
  console.log("✅ updateChatMode (valid) →", result);
}

// 🧪 2️⃣ Valid update (without maxParticipants)
async function testModeUpdateWithoutMax() {
  const chatId = "chat#202508041602"; // existing chat ID
  const mode = "broadcast";

  const result = await ChatManager.updateChatMode(chatId, mode);
  console.log("✅ updateChatMode (no maxParticipants) →", result);
}

// 🧪 3️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.updateChatMode(null, "live");
  console.log("❌ updateChatMode (missing chatId) →", result);
}

// 🧪 4️⃣ Invalid mode type
async function testInvalidModeType() {
  const result = await ChatManager.updateChatMode("chat#202508041601", 123);
  console.log("❌ updateChatMode (invalid mode type) →", result);
}

// 🧪 5️⃣ Invalid maxParticipants type
async function testInvalidMaxParticipants() {
  const result = await ChatManager.updateChatMode(
    "chat#202508041601",
    "live",
    "lots"
  );
  console.log("❌ updateChatMode (invalid maxParticipants) →", result);
}

// 🧪 6️⃣ Non-existent chat ID
async function testNonExistentChat() {
  const result = await ChatManager.updateChatMode("chat#nonexistent", "live");
  console.log("❌ updateChatMode (nonexistent chat) →", result);
}

// 🚀 Runner
async function updateChatMode_test() {
  console.log("🔍 Running updateChatMode tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidModeUpdate();
  console.log("-----");

  await testModeUpdateWithoutMax();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testInvalidModeType();
  console.log("-----");

  await testInvalidMaxParticipants();
  console.log("-----");

  await testNonExistentChat();
  console.log("-----");
}

updateChatMode_test();
export default updateChatMode_test;
