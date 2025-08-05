import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// ⛏️ Mock loggers to console for visibility during tests
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid mixed message
async function testValidMixedMessage() {
  const chatId = "chat#202508041601"; // make sure seeded
  const payload = {
    text: "Check this out!",
    media_url: "https://example.com/image.png",
    caption: "Awesome pic",
    metadata: { type: "image", tags: ["fun", "meme"] },
  };

  const result = await ChatManager.sendMixedMessage(chatId, payload);
  console.log("✅ sendMixedMessage (valid) →", result);
}

// 🧪 2️⃣ Missing chatId
async function testMissingChatId() {
  const payload = { text: "Missing chatId" };
  const result = await ChatManager.sendMixedMessage(null, payload);
  console.log("❌ sendMixedMessage (missing chatId) →", result);
}

// 🧪 3️⃣ Missing payload
async function testMissingPayload() {
  const chatId = "chat#202508041601";
  const result = await ChatManager.sendMixedMessage(chatId, null);
  console.log("❌ sendMixedMessage (missing payload) →", result);
}

// 🧪 4️⃣ Invalid payload type
async function testInvalidPayloadType() {
  const chatId = "chat#202508041601";
  const payload = "Just a string, not an object";
  const result = await ChatManager.sendMixedMessage(chatId, payload);
  console.log("❌ sendMixedMessage (invalid payload type) →", result);
}

// 🧪 5️⃣ Nonexistent chat
async function testNonexistentChat() {
  const chatId = "chat#doesnotexist";
  const payload = { text: "Will fail silently if not enforced" };
  const result = await ChatManager.sendMixedMessage(chatId, payload);
  console.log("❌ sendMixedMessage (nonexistent chat) →", result);
}

// 🚀 Runner
async function sendMixedMessage_test() {
  console.log("🔍 Running sendMixedMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidMixedMessage();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingPayload();
  console.log("-----");

  await testInvalidPayloadType();
  console.log("-----");

  await testNonexistentChat();
  console.log("-----");
}

sendMixedMessage_test();

export default sendMixedMessage_test;
