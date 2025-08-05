// test/sendProductRecommendation.test.js

import ChatManager from "../service/chat.js";
import { ScyllaDb, Logger, ErrorHandler } from "../utils/index.js";

// Mock logging for test visibility
Logger.writeLog = (log) => console.log("[Logger]", log);
ErrorHandler.add_error = (msg, meta) =>
  console.error("[ErrorHandler]", msg, meta);

async function testValidRecommendation() {
  const chatId = "chat#202508041601";
  const productData = {
    id: "product#001",
    name: "Premium Sneakers",
    price: 99.99,
    currency: "USD",
    url: "https://example.com/product/001",
  };

  const messageId = await ChatManager.sendProductRecommendation(
    chatId,
    productData
  );
  console.log("✅ sendProductRecommendation (valid) →", messageId);
}

async function testMissingChatId() {
  const result = await ChatManager.sendProductRecommendation(null, {
    id: "product#001",
    name: "Premium Sneakers",
  });
  console.log("❌ sendProductRecommendation (missing chatId) →", result);
}

async function testMissingProductData() {
  const result = await ChatManager.sendProductRecommendation(
    "chat#202508041601",
    null
  );
  console.log("❌ sendProductRecommendation (missing productData) →", result);
}

async function testInvalidProductDataType() {
  const result = await ChatManager.sendProductRecommendation(
    "chat#202508041601",
    "not-an-object"
  );
  console.log(
    "❌ sendProductRecommendation (invalid productData type) →",
    result
  );
}

// 🚀 Run All
async function sendProductRecommendation_test() {
  console.log("🔍 Running sendProductRecommendation tests...\n");

  await ScyllaDb.loadTableConfigs?.("./tables.json");

  await testValidRecommendation();
  console.log("-----");

  await testMissingChatId();
  console.log("-----");

  await testMissingProductData();
  console.log("-----");

  await testInvalidProductDataType();
  console.log("-----");
}

sendProductRecommendation_test();

export default sendProductRecommendation_test;
