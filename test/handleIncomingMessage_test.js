import ChatManager from "../service/chat.js";
import { Logger } from "../utils/index.js";

// 🛠 Mock Logger
Logger.writeLog = (log) => console.log("[Logger]", log);

// 🧪 1️⃣ Valid JSON string input
function testHandleIncomingMessage_Valid() {
  const rawEvent = JSON.stringify({ message: "Hello!", user: "user123" });
  const result = ChatManager.handleIncomingMessage(rawEvent);
  console.log("✅ handleIncomingMessage (valid) →", result);
}

// 🧪 2️⃣ Invalid JSON string input
function testHandleIncomingMessage_InvalidJSON() {
  const rawEvent = "{invalid_json:";
  const result = ChatManager.handleIncomingMessage(rawEvent);
  console.log("❌ handleIncomingMessage (invalid JSON) →", result);
}

// 🧪 3️⃣ Missing rawEvent input (null)
function testHandleIncomingMessage_Missing() {
  const result = ChatManager.handleIncomingMessage(null);
  console.log("❌ handleIncomingMessage (missing rawEvent) →", result);
}

// 🚀 Runner
function handleIncomingMessage_test() {
  console.log("🔍 Running handleIncomingMessage tests...\n");

  testHandleIncomingMessage_Valid();
  console.log("-----");

  testHandleIncomingMessage_InvalidJSON();
  console.log("-----");

  testHandleIncomingMessage_Missing();
  console.log("-----");
}

handleIncomingMessage_test();

export default handleIncomingMessage_test;
