import ChatManager from "../service/chat.js";
import { ScyllaDb, ErrorHandler, Logger } from "../utils/index.js";

// 🪵 Logging setup
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// 🧪 1️⃣ Valid metadata update
async function testValidMetadataUpdate() {
  const result = await ChatManager.updateChatMetadata("chat#202508041601", {
    name: "Updated Group Name",
    description: "Updated description",
    coverImageUrl: "https://example.com/new-image.jpg",
  });
  console.log("✅ updateChatMetadata (valid) →", result);
}

// 🧪 2️⃣ No updatable fields provided
async function testEmptyMetadataObject() {
  const result = await ChatManager.updateChatMetadata("chat#202508041601", {});
  console.log("✅ updateChatMetadata (empty metadata) →", result); // should be true (no-op)
}

// 🧪 3️⃣ Invalid metadata type
async function testInvalidMetadataType() {
  const result = await ChatManager.updateChatMetadata(
    "chat#202508041601",
    "not-an-object"
  );
  console.log("❌ updateChatMetadata (invalid metadata type) →", result);
}

// 🧪 4️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.updateChatMetadata(null, {
    name: "No chat ID provided",
  });
  console.log("❌ updateChatMetadata (missing chatId) →", result);
}

// 🧪 5️⃣ Non-existent chat ID
async function testNonExistentChat() {
  const result = await ChatManager.updateChatMetadata("chat#nonexistent", {
    name: "Should not work",
  });
  console.log("❌ updateChatMetadata (nonexistent chat) →", result);
}

// 🚀 Runner
async function updateChatMetadata_test() {
  console.log("🔍 Running updateChatMetadata tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidMetadataUpdate();
  console.log("-----");

  await testEmptyMetadataObject();
  console.log("-----");

  await testInvalidMetadataType();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testNonExistentChat();
  console.log("-----");
}

updateChatMetadata_test();
export default updateChatMetadata_test;
