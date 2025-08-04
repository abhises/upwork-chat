import ChatManager from "../service/chat.js";
import {
  DateTime,
  ScyllaDb,
  ErrorHandler,
  Logger,
  SafeUtils,
} from "../utils/index.js";

// 📆 Consistent test timestamps
DateTime.now = () => 20250804160000;

// 🪵 Mock Logging
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// ✅ Mock schema validation
SafeUtils.sanitizeValidate = (schema) => {
  const result = {};
  for (const key in schema) {
    const { value, type, required, default: def } = schema[key];
    if (required && (value === undefined || value === null)) {
      throw new Error(`Validation failed: ${key} is required`);
    }
    if (type === "string" && typeof value !== "string") {
      throw new Error(`Validation failed: ${key} must be a string`);
    }
    result[key] = value ?? def ?? null;
  }
  return result;
};

// 🧪 1️⃣ Valid chat ID + user ID
async function testValidArchive() {
  const result = await ChatManager.archiveChat("chat#202508041601", "user_001");
  console.log("✅ archiveChat (valid inputs) →", result);
}

// 🧪 2️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.archiveChat(null, "user_001");
  console.log("❌ archiveChat (missing chatId) →", result);
}

// 🧪 3️⃣ Missing user ID
async function testMissingUserId() {
  const result = await ChatManager.archiveChat("chat#202508041601", null);
  console.log("❌ archiveChat (missing userId) →", result);
}

// 🧪 4️⃣ Invalid chat ID type
async function testInvalidChatIdType() {
  const result = await ChatManager.archiveChat(123, "user_001");
  console.log("❌ archiveChat (invalid chatId type) →", result);
}

// 🧪 5️⃣ Simulated update failure
async function testUpdateFailure() {
  const originalUpdateItem = ScyllaDb.updateItem;
  ScyllaDb.updateItem = async () => {
    throw new Error("Simulated update failure");
  };

  const result = await ChatManager.archiveChat("chat#202508041601", "user_001");
  console.log("❌ archiveChat (simulated DB error) →", result);

  ScyllaDb.updateItem = originalUpdateItem; // Restore
}

//
// 🚀 Runner
//
async function archiveChat_test() {
  console.log("🔍 Running archiveChat tests...\n");

  await ScyllaDb.loadTableConfigs("./tables.json");

  await testValidArchive();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingUserId();
  console.log("-----");

  await testInvalidChatIdType();
  console.log("-----");

  await testUpdateFailure();
  console.log("-----");
}

archiveChat_test();
export default archiveChat_test;
