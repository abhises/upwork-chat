import ChatManager from "../service/chat.js";
import { Logger } from "../utils/index.js";

// ⛏️ Mock logger to show messages during tests
Logger.writeLog = (log) => console.log("[Logger]", log);

// 🧪 1️⃣ Valid short message
async function testShortMessage() {
  const result = ChatManager.validateMessageLength("Hello world!");
  console.log("✅ validateMessageLength (short) →", result); // Expected: true
}

// 🧪 2️⃣ Valid message right at maxLength
async function testEdgeMessageLength() {
  const text = "x".repeat(1000);
  const result = ChatManager.validateMessageLength(text);
  console.log("✅ validateMessageLength (at limit) →", result); // Expected: true
}

// 🧪 3️⃣ Message just over maxLength
async function testOverLimitMessage() {
  const text = "x".repeat(1001);
  const result = ChatManager.validateMessageLength(text);
  console.log("❌ validateMessageLength (over limit) →", result); // Expected: false
}

// 🧪 4️⃣ Custom maxLength
async function testCustomMaxLength() {
  const result = ChatManager.validateMessageLength("hello", 4);
  console.log("❌ validateMessageLength (custom max 4) →", result); // Expected: false
}

// 🧪 5️⃣ Invalid type (non-string)
async function testInvalidType() {
  const result = ChatManager.validateMessageLength(12345);
  console.log("❌ validateMessageLength (non-string) →", result); // Expected: false
}

// 🧪 6️⃣ Null input
async function testNullInput() {
  const result = ChatManager.validateMessageLength(null);
  console.log("❌ validateMessageLength (null input) →", result); // Expected: false
}

// 🚀 Runner
async function validateMessageLength_test() {
  console.log("🔍 Running validateMessageLength tests...\n");

  await testShortMessage();
  console.log("-----");

  await testEdgeMessageLength();
  console.log("-----");

  await testOverLimitMessage();
  console.log("-----");

  await testCustomMaxLength();
  console.log("-----");

  await testInvalidType();
  console.log("-----");

  await testNullInput();
  console.log("-----");
}

validateMessageLength_test();

export default validateMessageLength_test;
