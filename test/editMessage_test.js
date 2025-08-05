import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// Mock loggers
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid edit
async function testEditValidMessage() {
  const chatId = "chat#202508041601";
  const messageId = "msg#001"; // Make sure seeded message with this ID exists
  const newContent = {
    text: "Updated message content let me check",
    extra: "More metadata",
  };

  const result = await ChatManager.editMessage(chatId, messageId, newContent);
  console.log("✅ editMessage (valid) →", result);
}

// 🧪 2️⃣ Message not found
async function testEditMessageNotFound() {
  const result = await ChatManager.editMessage(
    "chat#202508041601",
    "msg#doesNotExist",
    { text: "Nothing" }
  );
  console.log("❌ editMessage (nonexistent) →", result);
}

// 🧪 3️⃣ Missing chatId
async function testMissingChatId() {
  const result = await ChatManager.editMessage(null, "msg#001", {
    text: "...",
  });
  console.log("❌ editMessage (missing chatId) →", result);
}

// 🧪 4️⃣ Missing messageId
async function testMissingMessageId() {
  const result = await ChatManager.editMessage("chat#202508041601", null, {
    text: "...",
  });
  console.log("❌ editMessage (missing messageId) →", result);
}

// 🧪 5️⃣ Invalid content
async function testInvalidContent() {
  const result = await ChatManager.editMessage(
    "chat#202508041601",
    "msg#001",
    "this should be object"
  );
  console.log("❌ editMessage (invalid content) →", result);
}

// 🚀 Runner
async function runEditMessageTests() {
  console.log("🔍 Running editMessage tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testEditValidMessage();
  console.log("-----");

  await testEditMessageNotFound();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingMessageId();
  console.log("-----");

  await testInvalidContent();
  console.log("-----");
}

runEditMessageTests();

export default runEditMessageTests;
