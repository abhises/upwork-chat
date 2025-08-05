import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🔧 Mock Logger and ErrorHandler
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid access level update
async function testUpdateChatAccess_Valid() {
  const chatId = "chat#202508041601"; // ✅ Make sure this chat exists in seed
  const accessLevel = "premium";

  const result = await ChatManager.updateChatAccess(chatId, accessLevel);
  console.log("✅ updateChatAccess (valid) →", result);
}

// 🧪 2️⃣ Missing chatId
async function testUpdateChatAccess_MissingChatId() {
  const result = await ChatManager.updateChatAccess(null, "restricted");
  console.log("❌ updateChatAccess (missing chatId) →", result);
}

// 🧪 3️⃣ Missing accessLevel
async function testUpdateChatAccess_MissingAccessLevel() {
  const result = await ChatManager.updateChatAccess("chat#202508041601", null);
  console.log("❌ updateChatAccess (missing accessLevel) →", result);
}

// 🧪 4️⃣ Invalid accessLevel type (number)
async function testUpdateChatAccess_InvalidType() {
  const result = await ChatManager.updateChatAccess("chat#202508041601", 123);
  console.log("❌ updateChatAccess (invalid type) →", result);
}

// 🚀 Runner
async function updateChatAccess_test() {
  console.log("🔍 Running updateChatAccess tests...\n");
  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testUpdateChatAccess_Valid();
  console.log("-----");

  await testUpdateChatAccess_MissingChatId();
  console.log("-----");

  await testUpdateChatAccess_MissingAccessLevel();
  console.log("-----");

  await testUpdateChatAccess_InvalidType();
  console.log("-----");
}

updateChatAccess_test();

export default updateChatAccess_test;
