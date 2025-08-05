import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🪵 Logging setup
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid emoji reaction
async function testValidReaction() {
  const result = await ChatManager.reactToMessage(
    "chat#202508041601",
    "msg#001",
    "🔥"
  );
  console.log("✅ reactToMessage (valid) →", result);
}

// 🧪 2️⃣ Reaction with custom count
async function testCustomReactionCount() {
  const result = await ChatManager.reactToMessage(
    "chat#202508041601",
    "msg#001",
    "👍",
    5
  );
  console.log("✅ reactToMessage (custom count) →", result);
}

// 🧪 3️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.reactToMessage(null, "msg#001", "❤️");
  console.log("❌ reactToMessage (missing chatId) →", result);
}

// 🧪 4️⃣ Invalid emoji type
async function testInvalidEmojiType() {
  const result = await ChatManager.reactToMessage(
    "chat#202508041601",
    "msg#001",
    123
  );
  console.log("❌ reactToMessage (invalid emoji type) →", result);
}

// 🧪 5️⃣ Non-existent message
async function testNonExistentMessage() {
  const result = await ChatManager.reactToMessage(
    "chat#202508041601",
    "msg#nonexistent",
    "👏"
  );
  console.log("❌ reactToMessage (nonexistent message) →", result);
}

// 🚀 Runner
async function reactToMessage_test() {
  console.log("🔍 Running reactToMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidReaction();
  console.log("-----");

  await testCustomReactionCount();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testInvalidEmojiType();
  console.log("-----");

  await testNonExistentMessage();
  console.log("-----");
}

reactToMessage_test();
export default reactToMessage_test;
