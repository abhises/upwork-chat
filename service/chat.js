import {
  DateTime,
  SafeUtils,
  ScyllaDb,
  ErrorHandler,
  Logger,
} from "../utils/index.js";

export default class ChatManager {
  static async createChat(params) {
    try {
      const { createdBy, participants, name } = SafeUtils.sanitizeValidate({
        createdBy: { value: params.createdBy, type: "string", required: true },
        participants: {
          value: params.participants,
          type: "array",
          required: true,
        },
        name: {
          value: params.name,
          type: "string",
          required: false,
          default: null,
        },
      });
      const metadata = SafeUtils.hasValue(params.metadata)
        ? params.metadata
        : {};
      const chatId = `chat#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmss"
      )}`;
      const item = {
        chat_id: chatId,
        is_group: false,
        created_by: createdBy,
        participants,
        name,
        metadata,
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chats", item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error("createChat failed", {
        error: err.message,
        params,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "createChat",
        message: err.message,
        critical: true,
        data: { params },
      });
      return null;
    }
  }

  static async createChimeChat(params) {
    try {
      // First extract participants without relying on participants.length
      const {
        createdBy,
        participants,
        name,
        mode,
        maxParticipants: providedMaxParticipants,
      } = SafeUtils.sanitizeValidate({
        createdBy: {
          value: params.createdBy,
          type: "string",
          required: true,
        },
        participants: {
          value: params.participants,
          type: "array",
          required: true,
        },
        name: {
          value: params.name,
          type: "string",
          required: false,
          default: null,
        },
        mode: {
          value: params.mode,
          type: "string",
          required: false,
          default: "private",
        },
        maxParticipants: {
          value: params.maxParticipants,
          type: "number",
          required: false,
          // ❌ No default here!
        },
      });

      // ✅ Now it's safe to use participants.length
      const maxParticipants = providedMaxParticipants ?? participants.length;

      const metadata = SafeUtils.hasValue(params.metadata)
        ? params.metadata
        : {};

      const chatId = `chat#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmss"
      )}`;

      const item = {
        chat_id: chatId,
        is_group: true,
        created_by: createdBy,
        participants,
        name,
        mode,
        max_participants: maxParticipants,
        metadata,
        created_at: DateTime.now(),
      };

      await ScyllaDb.putItem("chats", item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error("createChimeChat failed", {
        error: err.message,
        params,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "createChimeChat",
        message: err.message,
        critical: true,
        data: { params },
      });
      return null;
    }
  }

  static async fetchRecentMessages(chatId, pagingState = null, limit = 20) {
    try {
      const {
        chatId: id,
        pagingState: state,
        limit: max,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        pagingState: {
          value: pagingState,
          type: "object",
          required: false,
          default: null,
        },
        limit: { value: limit, type: "number", required: false, default: 20 },
      });

      const exprVals = {
        ":cid": id,
        ":lastTs": state?.message_ts ?? DateTime.now("number"),
      };

      const queryOptions = {
        Limit: max,
        ScanIndexForward: false,
      };

      if (state) {
        queryOptions.ExclusiveStartKey = state;
      }

      // ✅ `ScyllaDb.query()` returns an array (not an object), so assign directly
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_ts <= :lastTs", // <-- changed < to <=
        exprVals,
        queryOptions
      );

      return {
        messages,
        pagingState: null, // Since query() doesn’t return LastEvaluatedKey
      };
    } catch (err) {
      ErrorHandler.add_error("fetchRecentMessages failed", {
        error: err.message,
        chatId,
        pagingState,
        limit,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "fetchRecentMessages",
        message: err.message,
        critical: false,
        data: { chatId, pagingState, limit },
      });
      return { messages: [], pagingState: null };
    }
  }

  static async fetchUserChats(userId) {
    try {
      const { userId: uid } = SafeUtils.sanitizeValidate({
        userId: { value: userId, type: "string", required: true },
      });

      const res = await ScyllaDb.query(
        "user_chats",
        "user_id = :uid",
        { ":uid": uid },
        { ScanIndexForward: false }
      );

      // console.log("res in peace", res); // debugging

      return res.map((item) => item); // ✅ FIXED LINE
    } catch (err) {
      ErrorHandler.add_error("fetchUserChats failed", {
        error: err.message,
        userId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "fetchUserChats",
        message: err.message,
        critical: false,
        data: { userId },
      });
      return [];
    }
  }

  static async archiveChat(chatId, userId) {
    try {
      const { chatId: cid, userId: uid } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        userId: { value: userId, type: "string", required: true },
      });

      // ✅ Corrected and extended update: includes both archived_at and user_id
      const results = await ScyllaDb.updateItem(
        "chats",
        { chat_id: cid },
        {
          archived_at: DateTime.now(),
        }
      );

      return results;
    } catch (err) {
      ErrorHandler.add_error("archiveChat failed", {
        error: err.message,
        chatId,
        userId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "archiveChat",
        message: err.message,
        critical: false,
        data: { chatId, userId },
      });
      return false;
    }
  }

  static async expireOldChats() {
    // seed the db and just put 1000 then you can get results of this
    try {
      const expireThresholdMs = 30 * 24 * 60 * 60 * 1000;
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - expireThresholdMs);
      const cutoff = cutoffDate.toISOString();

      const res = await ScyllaDb.scan("chats", {
        FilterExpression:
          "created_at < :cutoff AND attribute_not_exists(auto_expired)",
        ExpressionAttributeValues: { ":cutoff": cutoff },
      });

      console.log("📦 Matching chats to expire:", res);

      const updateResults = [];

      for (const chat of res || []) {
        console.log("🔄 Updating chat:", chat.chat_id);

        try {
          const result = await ScyllaDb.updateItem(
            "chats",
            { chat_id: chat.chat_id },
            { auto_expired: true }
          );
          console.log("✅ Update result:", result);
          updateResults.push({ chat_id: chat.chat_id, result });
        } catch (err) {
          console.error("❌ Failed to update chat:", chat.chat_id, err.message);
          updateResults.push({ chat_id: chat.chat_id, error: err.message });
        }
      }

      return updateResults;
    } catch (err) {
      ErrorHandler.add_error("expireOldChats failed", { error: err.message });
      Logger.writeLog({
        flag: "system_error",
        action: "expireOldChats",
        message: err.message,
        critical: false,
      });
      return false;
    }
  }

  static async autoArchiveChats() {
    try {
      // Archive threshold (60 days)
      const archiveThresholdMs = 60 * 24 * 60 * 60 * 1000;
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - archiveThresholdMs);
      const cutoff = cutoffDate.toISOString();

      // Scan for chats that are auto_expired but not archived
      const res = await ScyllaDb.scan("chats", {
        FilterExpression:
          "auto_expired = :true AND attribute_not_exists(archived_at)",
        ExpressionAttributeValues: { ":true": true },
      });

      console.log("📦 Matching chats to archive:", res);

      const updateResults = [];

      for (const chat of res || []) {
        console.log("📦 Archiving chat:", chat.chat_id);

        try {
          const result = await ScyllaDb.updateItem(
            "chats",
            { chat_id: chat.chat_id },
            { archived_at: DateTime.now() }
          );
          console.log("✅ Archived:", result);
          updateResults.push({ chat_id: chat.chat_id, result });
        } catch (err) {
          console.error(
            "❌ Failed to archive chat:",
            chat.chat_id,
            err.message
          );
          updateResults.push({ chat_id: chat.chat_id, error: err.message });
        }
      }

      return updateResults;
    } catch (err) {
      ErrorHandler.add_error("autoArchiveChats failed", { error: err.message });
      Logger.writeLog({
        flag: "system_error",
        action: "autoArchiveChats",
        message: err.message,
        critical: false,
      });
      return false;
    }
  }

  static async updateChatSubscriptionFlag(chatId, subscriptionRequired) {
    try {
      const { chatId: cid, subscriptionRequired: flag } =
        SafeUtils.sanitizeValidate({
          chatId: { value: chatId, type: "string", required: true },
          subscriptionRequired: {
            value: subscriptionRequired,
            type: "boolean",
            required: true,
          },
        });

      const results = await ScyllaDb.updateItem(
        "chats",
        { chat_id: cid },
        { subscription_required: flag }
      );

      return results;
    } catch (err) {
      ErrorHandler.add_error("updateChatSubscriptionFlag failed", {
        error: err.message,
        chatId,
        subscriptionRequired,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "updateChatSubscriptionFlag",
        message: err.message,
        critical: false,
        data: { chatId, subscriptionRequired },
      });
      return false;
    }
  }
  static async updateChatMode(chatId, mode, maxParticipants = null) {
    try {
      const {
        chatId: cid,
        mode: newMode,
        maxParticipants: maxPart,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        mode: { value: mode, type: "string", required: true },
        maxParticipants: {
          value: maxParticipants,
          type: "number",
          required: false,
          default: null,
        },
      });
      const expr = ["SET mode = :mode"];
      const vals = { ":mode": newMode };
      if (SafeUtils.hasValue(maxPart)) {
        expr.push("max_participants = :max");
        vals[":max"] = maxPart;
      }
      await ScyllaDb.updateItem({
        TableName: "chats",
        Key: { chat_id: cid },
        UpdateExpression: expr.join(", "),
        ExpressionAttributeValues: vals,
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error("updateChatMode failed", {
        error: err.message,
        chatId,
        mode,
        maxParticipants,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "updateChatMode",
        message: err.message,
        critical: false,
        data: { chatId, mode, maxParticipants },
      });
      return false;
    }
  }

  static async updateChatMode(chatId, mode, maxParticipants = null) {
    try {
      const {
        chatId: cid,
        mode: newMode,
        maxParticipants: maxPart,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        mode: { value: mode, type: "string", required: true },
        maxParticipants: {
          value: maxParticipants,
          type: "numeric",
          required: false,
          default: null,
        },
      });

      const data = { mode: newMode };
      if (SafeUtils.hasValue(maxPart)) {
        data.max_participants = maxPart;
      }

      const results = await ScyllaDb.updateItem(
        "chats",
        { chat_id: cid },
        data
      );

      return results;
    } catch (err) {
      ErrorHandler.add_error("updateChatMode failed", {
        error: err.message,
        chatId,
        mode,
        maxParticipants,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "updateChatMode",
        message: err.message,
        critical: false,
        data: { chatId, mode, maxParticipants },
      });
      return false;
    }
  }
  static async setChatRole(chatId, userId, role) {
    try {
      const {
        chatId: cid,
        userId: uid,
        role: newRole,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        userId: { value: userId, type: "string", required: true },
        role: { value: role, type: "string", required: true },
      });
      // Fetch existing participants map
      const getRes = await ScyllaDb.getItem({
        TableName: "chats",
        Key: { chat_id: cid },
      });
      const participants = getRes.Item?.participants || {};
      participants[uid] = newRole;
      // Write back updated map
      await ScyllaDb.updateItem({
        TableName: "chats",
        Key: { chat_id: cid },
        UpdateExpression: "SET participants = :parts",
        ExpressionAttributeValues: { ":parts": participants },
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error("setChatRole failed", {
        error: err.message,
        chatId,
        userId,
        role,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "setChatRole",
        message: err.message,
        critical: false,
        data: { chatId, userId, role },
      });
      return false;
    }
  }

  static async setChatRole(chatId, userId, role) {
    try {
      const {
        chatId: cid,
        userId: uid,
        role: newRole,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        userId: { value: userId, type: "string", required: true },
        role: { value: role, type: "string", required: true },
      });

      // Fetch existing participants map
      const getRes = await ScyllaDb.getItem("chats", { chat_id: cid });
      const participants = getRes?.participants ?? {};

      // Set the new role
      participants[uid] = newRole;

      // Use correct updateItem signature
      const result = await ScyllaDb.updateItem(
        "chats",
        { chat_id: cid },
        { participants }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("setChatRole failed", {
        error: err.message,
        chatId,
        userId,
        role,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "setChatRole",
        message: err.message,
        critical: false,
        data: { chatId, userId, role },
      });
      return false;
    }
  }
  static async createGroupChat(params) {
    try {
      const {
        createdBy,
        participants,
        name,
        description,
        coverImageUrl,
        rulesJson,
        category,
        type,
      } = SafeUtils.sanitizeValidate({
        createdBy: { value: params.createdBy, type: "string", required: true },
        participants: {
          value: params.participants,
          type: "array",
          required: true,
        },
        name: {
          value: params.name,
          type: "string",
          required: false,
          default: null,
        },
        description: {
          value: params.description,
          type: "string",
          required: false,
          default: null,
        },
        coverImageUrl: {
          value: params.coverImageUrl,
          type: "string",
          required: false,
          default: null,
        },
        rulesJson: {
          value: params.rulesJson,
          type: "object",
          required: false,
          default: {},
        },
        category: {
          value: params.category,
          type: "string",
          required: false,
          default: null,
        },
        type: {
          value: params.type,
          type: "string",
          required: false,
          default: null,
        },
      });
      const chatId = `chat#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmss"
      )}`;
      const item = {
        chat_id: chatId,
        is_group: true,
        created_by: createdBy,
        participants,
        name,
        description,
        cover_image_url: coverImageUrl,
        rules_json: rulesJson,
        category,
        type,
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chats", item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error("createGroupChat failed", {
        error: err.message,
        params,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "createGroupChat",
        message: err.message,
        critical: true,
        data: { params },
      });
      return null;
    }
  }

  static async updateChatMetadata(chatId, metadata) {
    try {
      const { chatId: cid, metadata: meta } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        metadata: { value: metadata, type: "object", required: true },
      });

      const fieldMap = {
        name: "name",
        description: "description",
        coverImageUrl: "cover_image_url",
        rulesJson: "rules_json",
        category: "category",
        type: "type",
      };

      const updateData = {};

      for (const [inputKey, dbField] of Object.entries(fieldMap)) {
        if (SafeUtils.hasValue(meta[inputKey])) {
          updateData[dbField] = meta[inputKey];
        }
      }

      if (Object.keys(updateData).length === 0) return true; // nothing to update

      const result = await ScyllaDb.updateItem(
        "chats",
        { chat_id: cid },
        updateData
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("updateChatMetadata failed", {
        error: err.message,
        chatId,
        metadata,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "updateChatMetadata",
        message: err.message,
        critical: false,
        data: { chatId, metadata },
      });
      return false;
    }
  }

  static async updateNotificationSettings(userId, chatId, settings) {
    try {
      const {
        userId: uid,
        chatId: cid,
        settings: cfg,
      } = SafeUtils.sanitizeValidate({
        userId: { value: userId, type: "string", required: true },
        chatId: { value: chatId, type: "string", required: true },
        settings: { value: settings, type: "object", required: true },
      });

      // Fetch existing userSettings
      const getRes = await ScyllaDb.getItem("userSettings", { user_id: uid });
      const notif = getRes?.notifications || {};

      // Update notifications for chat
      notif[cid] = cfg;

      // Proper usage of your updateItem method
      const result = await ScyllaDb.updateItem(
        "userSettings",
        { user_id: uid },
        { notifications: notif }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("updateNotificationSettings failed", {
        error: err.message,
        userId,
        chatId,
        settings,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "updateNotificationSettings",
        message: err.message,
        critical: false,
        data: { userId, chatId, settings },
      });
      return false;
    }
  }

  static async searchGroups(searchQuery) {
    try {
      const { searchQuery: q } = Formatting.sanitizeValidate({
        searchQuery: { value: searchQuery, type: "string", required: true },
      });
      // Placeholder: perform search in Elasticsearch index 'chats'
      // e.g., const results = await Elastic.search({ index: 'chats', q });
      // return results.hits.hits.map(hit => hit._source);
      return []; // return matched chat metadata objects
    } catch (err) {
      ErrorHandler.add_error("searchGroups failed", {
        error: err.message,
        searchQuery,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "searchGroups",
        message: err.message,
        critical: false,
        data: { searchQuery },
      });
      return [];
    }
  }

  static async reactToMessage(chatId, messageId, emoji, count = 1) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        emoji: emj,
        count: cnt,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        emoji: { value: emoji, type: "string", required: true },
        count: { value: count, type: "numeric", required: false, default: 1 },
      });

      // ✅ Query message by message_id using GSI
      const keyExpr = "chat_id = :cid AND message_id = :mid";
      const exprVals = { ":cid": cid, ":mid": mid };

      const queryRes = await ScyllaDb.query(
        "chat_messages",
        keyExpr,
        exprVals,
        { IndexName: "MessageIdIndex" }
      );

      const message = queryRes[0];
      if (!message) throw new Error("Message not found");

      const message_ts = message.message_ts;
      const reactions = message.reactions || {};
      reactions[emj] = (reactions[emj] || 0) + cnt;

      // ✅ Update using real PK
      const results = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts,
        },
        {
          reactions,
        }
      );

      return results;
    } catch (err) {
      ErrorHandler.add_error("reactToMessage failed", {
        error: err.message,
        chatId,
        messageId,
        emoji,
        count,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "reactToMessage",
        message: err.message,
        critical: false,
        data: { chatId, messageId, emoji, count },
      });
      return false;
    }
  }
}
