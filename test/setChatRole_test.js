import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// 🪵 Mock logging
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid role update
async function testValidRoleUpdate() {
  const result = await ChatManager.setChatRole(
    "chat#202508041601", // must exist
    "user_001", // should be in participants or will be added
    "moderator"
  );
  console.log("✅ setChatRole (valid) →", result);
}

// 🧪 2️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.setChatRole(null, "user_001", "moderator");
  console.log("❌ setChatRole (missing chatId) →", result);
}

// 🧪 3️⃣ Missing user ID
async function testMissingUserId() {
  const result = await ChatManager.setChatRole(
    "chat#202508041601",
    null,
    "moderator"
  );
  console.log("❌ setChatRole (missing userId) →", result);
}

// 🧪 4️⃣ Invalid role type
async function testInvalidRoleType() {
  const result = await ChatManager.setChatRole(
    "chat#202508041601",
    "user_001",
    123 // invalid type
  );
  console.log("❌ setChatRole (invalid role type) →", result);
}

// 🧪 5️⃣ Nonexistent chat ID
async function testNonExistentChat() {
  const result = await ChatManager.setChatRole(
    "chat#nonexistent",
    "user_999",
    "member"
  );
  console.log("❌ setChatRole (nonexistent chat) →", result);
}

// 🚀 Runner
async function setChatRole_test() {
  console.log("🔍 Running setChatRole tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidRoleUpdate();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingUserId();
  console.log("-----");

  await testInvalidRoleType();
  console.log("-----");

  await testNonExistentChat();
  console.log("-----");
}

setChatRole_test();
export default setChatRole_test;
