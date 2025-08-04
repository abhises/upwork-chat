import ChatManager from "../service/chat.js";
import {
  DateTime,
  ScyllaDb,
  ErrorHandler,
  Logger,
  SafeUtils,
} from "../utils/index.js";

// 📆 Mock time for consistency
DateTime.now = () => 20250804160000;
DateTime.generateRelativeTimestamp = () => "20250804160000";

// 🪵 Logger/Error overrides
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

// ✅ Mock sanitizeValidate
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

//
// 🧪 TEST CASES
//

// 1️⃣ Valid user ID that exists in table
async function testValidUserChatFetch() {
  const result = await ChatManager.fetchUserChats("user_001");
  console.log("✅ Fetched user chats:", result);
}

// 2️⃣ Non-existent user ID
async function testInvalidUserId() {
  const result = await ChatManager.fetchUserChats("non_existing_user");
  console.log("❌ Non-existent user → chats:", result);
}

// 3️⃣ Missing user ID
async function testMissingUserId() {
  const result = await ChatManager.fetchUserChats(null);
  console.log("❌ Missing userId → chats:", result);
}

// 4️⃣ Invalid user ID type
async function testInvalidUserIdType() {
  const result = await ChatManager.fetchUserChats(123); // number instead of string
  console.log("❌ Invalid userId type → chats:", result);
}

// 5️⃣ Empty string userId
async function testEmptyStringUserId() {
  const result = await ChatManager.fetchUserChats("");
  console.log("⚠️ Empty userId string → chats:", result);
}

//
// 🚀 RUNNER
//
async function fetchUserChats_test() {
  console.log("🔍 Running fetchUserChats tests...\n");

  await ScyllaDb.loadTableConfigs("./tables.json");

  await testValidUserChatFetch();
  console.log("----- first");

  await testInvalidUserId();
  console.log("----- second");

  await testMissingUserId();
  console.log("----- third");

  await testInvalidUserIdType();
  console.log("----- fourth");

  await testEmptyStringUserId();
  console.log("----- fifth");
}

fetchUserChats_test();
export default fetchUserChats_test;
