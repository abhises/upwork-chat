import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// ⛏️ Mock loggers for visibility
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid input
async function testSendPaidMedia_Valid() {
  const chatId = "chat#202508041601"; // ✅ Make sure this chat exists
  const payload = {
    media_url: "https://cdn.example.com/media/video123.mp4",
    price: 5.99,
    currency: "USD",
    type: "video",
  };

  const result = await ChatManager.sendPaidMedia(chatId, payload);
  console.log("✅ sendPaidMedia (valid) →", result);
}

// 🧪 2️⃣ Missing chatId
async function testSendPaidMedia_MissingChatId() {
  const payload = { media_url: "https://cdn.example.com/image.jpg" };
  const result = await ChatManager.sendPaidMedia(null, payload);
  console.log("❌ sendPaidMedia (missing chatId) →", result);
}

// 🧪 3️⃣ Missing payload
async function testSendPaidMedia_MissingPayload() {
  const result = await ChatManager.sendPaidMedia("chat#202508041601", null);
  console.log("❌ sendPaidMedia (missing payload) →", result);
}

// 🧪 4️⃣ Invalid payload type (string instead of object)
async function testSendPaidMedia_InvalidPayloadType() {
  const result = await ChatManager.sendPaidMedia(
    "chat#202508041601",
    "not-an-object"
  );
  console.log("❌ sendPaidMedia (invalid payload type) →", result);
}

// 🚀 Runner
async function sendPaidMedia_test() {
  console.log("🔍 Running sendPaidMedia tests...\n");
  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testSendPaidMedia_Valid();
  console.log("-----");

  await testSendPaidMedia_MissingChatId();
  console.log("-----");

  await testSendPaidMedia_MissingPayload();
  console.log("-----");

  await testSendPaidMedia_InvalidPayloadType();
  console.log("-----");
}

sendPaidMedia_test();

export default sendPaidMedia_test;
