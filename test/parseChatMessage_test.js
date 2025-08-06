import ChatManager from "../service/chat.js";
import { Logger } from "../utils/index.js";

// 🛠 Mock logger for error tracking
Logger.writeLog = (log) => console.log("[Logger]", log);

// 🧪 1️⃣ Text message
function testParseChatMessage_Text() {
  const result = ChatManager.parseChatMessage({
    content_type: "text",
    content: { text: "Hello world" },
  });
  console.log("✅ parseChatMessage (text) →", result);
}

// 🧪 2️⃣ Mixed message
function testParseChatMessage_Mixed() {
  const result = ChatManager.parseChatMessage({
    content_type: "mixed",
    content: {
      elements: [{ text: "Hi" }, { text: "there" }],
    },
  });
  console.log("✅ parseChatMessage (mixed) →", result);
}

// 🧪 3️⃣ Voice message
function testParseChatMessage_Voice() {
  const result = ChatManager.parseChatMessage({
    content_type: "voice",
    content: { media_url: "https://cdn.example.com/audio.mp3" },
  });
  console.log("✅ parseChatMessage (voice) →", result);
}

// 🧪 4️⃣ Product recommendation
function testParseChatMessage_Product() {
  const result = ChatManager.parseChatMessage({
    content_type: "product_recommendation",
    content: {
      product_recommendation: { name: "Wireless Headphones" },
    },
  });
  console.log("✅ parseChatMessage (product) →", result);
}

// 🧪 5️⃣ Exclusive content
function testParseChatMessage_Exclusive() {
  const result = ChatManager.parseChatMessage({
    content_type: "exclusive",
    content: { image: "exclusive.jpg", caption: "Secret drop" },
  });
  console.log("✅ parseChatMessage (exclusive) →", result);
}

// 🧪 6️⃣ Paid media
function testParseChatMessage_PaidMedia() {
  const result = ChatManager.parseChatMessage({
    content_type: "paid_media",
    content: { media_url: "premium.mp4", duration: 30 },
  });
  console.log("✅ parseChatMessage (paid_media) →", result);
}

// 🧪 7️⃣ Unknown content_type
function testParseChatMessage_UnknownType() {
  const result = ChatManager.parseChatMessage({
    content_type: "custom_type",
    content: { foo: "bar" },
  });
  console.log("⚠️ parseChatMessage (unknown type) →", result);
}

// 🧪 8️⃣ Missing content_type
function testParseChatMessage_MissingType() {
  const result = ChatManager.parseChatMessage({
    content: { text: "Should fail" },
  });
  console.log("❌ parseChatMessage (missing content_type) →", result);
}

// 🧪 9️⃣ Invalid content format
function testParseChatMessage_InvalidContent() {
  const result = ChatManager.parseChatMessage({
    content_type: "text",
    content: "not-an-object",
  });
  console.log("❌ parseChatMessage (invalid content) →", result);
}

// 🚀 Runner
function parseChatMessage_test() {
  console.log("🔍 Running parseChatMessage tests...\n");

  testParseChatMessage_Text();
  console.log("-----");

  testParseChatMessage_Mixed();
  console.log("-----");

  testParseChatMessage_Voice();
  console.log("-----");

  testParseChatMessage_Product();
  console.log("-----");

  testParseChatMessage_Exclusive();
  console.log("-----");

  testParseChatMessage_PaidMedia();
  console.log("-----");

  testParseChatMessage_UnknownType();
  console.log("-----");

  testParseChatMessage_MissingType();
  console.log("-----");

  testParseChatMessage_InvalidContent();
  console.log("-----");
}

parseChatMessage_test();

export default parseChatMessage_test;
