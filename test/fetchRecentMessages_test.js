import ChatManager from "../service/chat.js";
import {
  DateTime,
  ScyllaDb,
  ErrorHandler,
  Logger,
  SafeUtils,
} from "../utils/index.js";

// 🔄 Override timestamp for predictable behavior
DateTime.now = () => 20250804160000;
DateTime.generateRelativeTimestamp = () => "20250804160000";

// ✅ Logger/Error Output
Logger.writeLog = (log) => {
  console.log("[Logger]", log);
};

ErrorHandler.add_error = (msg, meta) => {
  console.error("[ErrorHandler]", msg, meta);
};

// ✅ Basic formatter to simulate schema validation
SafeUtils.sanitizeValidate = (schema) => {
  const result = {};
  for (const key in schema) {
    const { value, type, required, default: def } = schema[key];
    if (required && (value === undefined || value === null)) {
      throw new Error(`Validation failed: ${key} is required`);
    }
    if (type === "string" && value && typeof value !== "string") {
      throw new Error(`Validation failed: ${key} must be a string`);
    }
    if (type === "object" && value && typeof value !== "object") {
      throw new Error(`Validation failed: ${key} must be an object`);
    }
    if (type === "number" && value && typeof value !== "number") {
      throw new Error(`Validation failed: ${key} must be a number`);
    }
    result[key] = value ?? def ?? null;
  }
  return result;
};

//
// 🧪 TEST CASES
//

// 1️⃣ Valid chat ID with existing messages
async function testValidChatFetch() {
  const result = await ChatManager.fetchRecentMessages("chat#202508041601");
  console.log("✅ Fetched messages:", result.messages.length);
  console.log("🪪 Paging state:", result.pagingState);
}

async function items() {
  const result = await ScyllaDb.getItem("chat_messages", {
    chat_id: "chat#202508041601",
  });
  console.log("results", result);
}

// 2️⃣ Valid chat ID with paging state
async function testPagingState() {
  const page1 = await ChatManager.fetchRecentMessages(
    "chat#202508041601",
    null,
    1
  );
  if (page1.pagingState) {
    const page2 = await ChatManager.fetchRecentMessages(
      "chat#202508041601",
      page1.pagingState,
      1
    );
    console.log("✅ Fetched next page:", page2.messages.length);
  } else {
    console.log("⚠️ Not enough messages to test paging");
  }
}

// 3️⃣ Invalid chat ID
async function testInvalidChatId() {
  const result = await ChatManager.fetchRecentMessages("non_existing_chat");
  console.log("❌ Non-existent chat → messages:", result.messages.length);
}

// 4️⃣ Missing chat ID
async function testMissingChatId() {
  const result = await ChatManager.fetchRecentMessages(null);
  console.log("❌ Missing chatId → messages:", result.messages.length);
}

// 5️⃣ Invalid pagingState format
async function testBadPagingState() {
  const result = await ChatManager.fetchRecentMessages(
    "chat#202508041601",
    "not_an_object"
  );
  console.log("❌ Bad pagingState → messages:", result.messages.length);
}

async function inspectChatMessages() {
  try {
    await ScyllaDb.loadTableConfigs("./tables.json"); // ensure table configs are loaded

    const chatId = "chat#202508041601";

    const messages = await ScyllaDb.query("chat_messages", "chat_id = :cid", {
      ":cid": chatId,
    });

    console.log(`📨 Messages for ${chatId}:`);
    if (messages.length === 0) {
      console.log("⚠️ No messages found.");
    } else {
      console.table(messages);
    }
  } catch (err) {
    console.error("❌ Error inspecting chat messages:", err.message);
  }
}

//
// 🚀 RUNNER
//

async function fetchRecentMessages_test() {
  console.log("🔍 Running fetchRecentMessages tests...\n");

  await ScyllaDb.loadTableConfigs("./tables.json"); // ensure it's loaded

  await testValidChatFetch();
  console.log("----- first");

  await testPagingState();
  console.log("----- second");

  await testInvalidChatId();
  console.log("----- third");

  await testMissingChatId();
  console.log("----- fourth");

  await testBadPagingState();
  console.log("----- fifth");

  // await items();
  await inspectChatMessages();
}

fetchRecentMessages_test();
export default fetchRecentMessages_test;
