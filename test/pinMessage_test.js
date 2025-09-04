import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// Mock loggers
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid pin
async function testPinValidMessage() {
  const chatId = "chat#202508041601";
  const messageId = "msg#001"; // must exist in DB

  const result = await ChatManager.pinMessage(chatId, messageId, true);
  console.log("✅ pinMessage (pin) →", result);
}

// // 🧪 2️⃣ Valid unpin
// async function testUnpinValidMessage() {
//   const chatId = "chat#202508041601";
//   const messageId = "msg#001"; // must exist in DB

//   const result = await ChatManager.pinMessage(chatId, messageId, false);
//   console.log("✅ pinMessage (unpin) →", result);
// }

// 🧪 3️⃣ Message not found
async function testPinMessageNotFound() {
  const result = await ChatManager.pinMessage(
    "chat#202508041601",
    "msg#doesNotExist",
    true
  );
  console.log("❌ pinMessage (nonexistent) →", result);
}

// 🧪 4️⃣ Missing chatId
async function testPinMissingChatId() {
  const result = await ChatManager.pinMessage(null, "msg#001", true);
  console.log("❌ pinMessage (missing chatId) →", result);
}

// 🧪 5️⃣ Missing messageId
async function testPinMissingMessageId() {
  const result = await ChatManager.pinMessage("chat#202508041601", null, true);
  console.log("❌ pinMessage (missing messageId) →", result);
}

// 🧪 6️⃣ Invalid pin type
async function testInvalidPinType() {
  const result = await ChatManager.pinMessage(
    "chat#202508041601",
    "msg#001",
    "notABoolean"
  );
  console.log("❌ pinMessage (invalid pin) →", result);
}

// 🚀 Runner
async function runPinMessageTests() {
  console.log("🔍 Running pinMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testPinValidMessage();
  console.log("-----");

  //   await testUnpinValidMessage();
  //   console.log("-----");

  await testPinMessageNotFound();
  console.log("-----");

  await testPinMissingChatId();
  console.log("-----");

  await testPinMissingMessageId();
  console.log("-----");

  await testInvalidPinType();
  console.log("-----");
}

runPinMessageTests();

export default runPinMessageTests;
