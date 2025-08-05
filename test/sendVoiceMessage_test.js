import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 🪵 Logging Setup
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid voice message
async function testValidVoiceMessage() {
  const chatId = "chat#202508041601"; // Must exist in your test DB
  const mediaUrl = "https://example.com/voice.mp3";

  const result = await ChatManager.sendVoiceMessage(chatId, mediaUrl);
  console.log("✅ sendVoiceMessage (valid) →", result);
}

// 🧪 2️⃣ Missing chatId
async function testMissingChatId() {
  const result = await ChatManager.sendVoiceMessage(
    null,
    "https://example.com/voice.mp3"
  );
  console.log("❌ sendVoiceMessage (missing chatId) →", result);
}

// 🧪 3️⃣ Missing mediaUrl
async function testMissingMediaUrl() {
  const result = await ChatManager.sendVoiceMessage("chat#202508041601", null);
  console.log("❌ sendVoiceMessage (missing mediaUrl) →", result);
}

// 🧪 4️⃣ Invalid mediaUrl type
async function testInvalidMediaUrlType() {
  const result = await ChatManager.sendVoiceMessage("chat#202508041601", 12345);
  console.log("❌ sendVoiceMessage (invalid mediaUrl type) →", result);
}

// 🧪 5️⃣ Nonexistent chat
async function testNonexistentChat() {
  const result = await ChatManager.sendVoiceMessage(
    "chat#does_not_exist",
    "https://example.com/voice.mp3"
  );
  console.log("❌ sendVoiceMessage (nonexistent chat) →", result);
}

// 🚀 Test runner
async function sendVoiceMessage_test() {
  console.log("🔍 Running sendVoiceMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidVoiceMessage();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingMediaUrl();
  console.log("-----");

  await testInvalidMediaUrlType();
  console.log("-----");

  await testNonexistentChat();
  console.log("-----");
}

sendVoiceMessage_test();
export default sendVoiceMessage_test;
