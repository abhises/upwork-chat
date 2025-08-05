import ChatManager from "../service/chat.js";
import { Logger } from "../utils/index.js";

// ⛏️ Mock logger for visibility during tests
Logger.writeLog = (log) => console.log("[Logger]", log);

// 🧪 1️⃣ Should censor banned words
async function testCensorBannedWords() {
  const result = ChatManager.filterBannedWords(
    "This contains badword1 and badword2."
  );
  console.log("✅ filterBannedWords (censor) →", result);
  // Expected: "This contains **** and ****."
}

// 🧪 2️⃣ Should not censor safe input
async function testNoBannedWords() {
  const result = ChatManager.filterBannedWords("This is a clean message.");
  console.log("✅ filterBannedWords (clean) →", result);
  // Expected: "This is a clean message."
}

// 🧪 3️⃣ Censor should be case-insensitive
async function testCaseInsensitive() {
  const result = ChatManager.filterBannedWords("BADWORD1 is bad.");
  console.log("✅ filterBannedWords (case-insensitive) →", result);
  // Expected: "**** is bad."
}

// 🧪 4️⃣ Words inside other words should not be censored
async function testWordBoundary() {
  const result = ChatManager.filterBannedWords("thisbadword1shouldnotmatch");
  console.log("✅ filterBannedWords (no partial match) →", result);
  // Expected: "thisbadword1shouldnotmatch"
}

// 🧪 5️⃣ Handles invalid input type
async function testInvalidInput() {
  const result = ChatManager.filterBannedWords(12345); // Not a string
  console.log("❌ filterBannedWords (invalid input) →", result);
  // Expected: 12345 (returns original input)
}

// 🧪 6️⃣ Handles null input
async function testNullInput() {
  const result = ChatManager.filterBannedWords(null);
  console.log("❌ filterBannedWords (null input) →", result);
  // Expected: null (returns original input)
}

// 🚀 Runner
async function filterBannedWords_test() {
  console.log("🔍 Running filterBannedWords tests...\n");

  await testCensorBannedWords();
  console.log("-----");

  await testNoBannedWords();
  console.log("-----");

  await testCaseInsensitive();
  console.log("-----");

  await testWordBoundary();
  console.log("-----");

  await testInvalidInput();
  console.log("-----");

  await testNullInput();
  console.log("-----");
}

filterBannedWords_test();

export default filterBannedWords_test;
