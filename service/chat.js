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
      const { searchQuery: q } = SafeUtils.sanitizeValidate({
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

  static async sendMessage(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        payload: { value: payload, type: "object", required: true },
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmssSSS"
      )}`;
      const timestamp = Date.now();
      // console.log(timestamp);
      const item = {
        chat_id: cid,
        message_id: messageId,
        message_ts: timestamp,
        content_type: pl.contentType || "text",
        content: pl,
        reactions: {},
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chat_messages", item);
      return item;
    } catch (err) {
      ErrorHandler.add_error("sendMessage failed", {
        error: err.message,
        chatId,
        payload,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "sendMessage",
        message: err.message,
        critical: true,
        data: { chatId, payload },
      });
      return null;
    }
  }

  static async sendVoiceMessage(chatId, mediaUrl) {
    try {
      const { chatId: cid, mediaUrl: url } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        mediaUrl: { value: mediaUrl, type: "string", required: true },
      });

      //it creates mees for invalid chat id
      // const chatRes = await ScyllaDb.getItem("chat_messages", {
      //   chat_id: cid,
      //   message_ts: Date.now(),
      // });

      // if (!chatRes || !chatRes.Item) {
      //   throw new Error(`Chat with ID '${cid}' does not exist`);
      // }
      const messageId = `msg#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmssSSS"
      )}`;
      const timestamp = Date.now();
      //  #TODO in future we will use DateTime.now("number")

      const item = {
        chat_id: cid,
        message_id: messageId,
        message_ts: timestamp,
        content_type: "voice",
        content: { media_url: url },
        reactions: {},
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chat_messages", item);
      return item;
    } catch (err) {
      ErrorHandler.add_error("sendVoiceMessage failed", {
        error: err.message,
        chatId,
        mediaUrl,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "sendVoiceMessage",
        message: err.message,
        critical: true,
        data: { chatId, mediaUrl },
      });
      return null;
    }
  }
  static async linkPollToMessage(chatId, messageId, pollId) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        pollId: pid,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        pollId: { value: pollId, type: "string", required: true },
      });

      // 🟡 Step 1: Query using GSI to find message_ts
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!messages || messages.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid} & message_id=${mid}`
        );
      }

      const message = messages[0];

      console.log("message", message);

      // 🔒 Defensive check

      // 🟢 Step 2: Modify content
      const content = { ...message.content, poll_id: pid };

      // 🔵 Step 3: Update original record using primary key
      await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts, // MUST use message_ts as RANGE key
        },
        {
          content,
        }
      );

      return true;
    } catch (err) {
      ErrorHandler.add_error("linkPollToMessage failed", {
        error: err.message,
        chatId,
        messageId,
        pollId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "linkPollToMessage",
        message: err.message,
        critical: false,
        data: { chatId, messageId, pollId },
      });
      return false;
    }
  }

  static async sendMixedMessage(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        payload: { value: payload, type: "object", required: true },
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmssSSS"
      )}`;
      //SHould replace with DateTime.now in future
      const timestamp = Date.now();
      const item = {
        chat_id: cid,
        message_id: messageId,
        message_ts: timestamp,
        content_type: "mixed",
        content: pl,
        reactions: {},
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chat_messages", item);
      return item;
    } catch (err) {
      ErrorHandler.add_error("sendMixedMessage failed", {
        error: err.message,
        chatId,
        payload,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "sendMixedMessage",
        message: err.message,
        critical: true,
        data: { chatId, payload },
      });
      return null;
    }
  }
  static validateMessageLength(text, maxLength = 1000) {
    try {
      const { text: t } = SafeUtils.sanitizeValidate({
        text: { value: text, type: "string", required: true },
      });
      if (t.length > maxLength) {
        Logger.writeLog({
          flag: "warn",
          action: "validateMessageLength",
          message: `Message length ${t.length} exceeds max ${maxLength}`,
        });
        return false;
      }
      return true;
    } catch (err) {
      Logger.writeLog({
        flag: "system_error",
        action: "validateMessageLength",
        message: err.message,
      });
      return false;
    }
  }

  static filterBannedWords(text) {
    try {
      const { text: t } = SafeUtils.sanitizeValidate({
        text: { value: text, type: "string", required: true },
      });
      // Placeholder banned-words list; replace with your real list or config
      const bannedWords = ["badword1", "badword2", "badword3"];
      let sanitized = t;
      for (const word of bannedWords) {
        const pattern = new RegExp(`\\b${word}\\b`, "gi");
        sanitized = sanitized.replace(pattern, "****");
      }
      return sanitized;
    } catch (err) {
      Logger.writeLog({
        flag: "system_error",
        action: "filterBannedWords",
        message: err.message,
      });
      return text;
    }
  }

  static async editMessage(chatId, messageId, newContent) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        newContent: content,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        newContent: { value: newContent, type: "object", required: true },
      });

      // 🟡 Step 1: Query GSI to get message_ts
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      // if (!messages || messages.length === 0) {
      //   throw new Error(
      //     `Message not found for chat_id=${cid} & message_id=${mid}`
      //   );
      // }

      const message = messages[0];
      const timestamp = DateTime.now();
      console.log("Editing message at", timestamp);

      // 🔵 Step 2: Update using PK and SK (chat_id + message_ts)
      const result = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts, // use correct RANGE key
        },
        {
          content: content,
          edited_at: timestamp,
        }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("editMessage failed", {
        error: err.message,
        chatId,
        messageId,
        newContent,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "editMessage",
        message: err.message,
        critical: false,
        data: { chatId, messageId, newContent },
      });
      return false;
    }
  }

  static async markMessageRead(chatId, messageId, userId) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        userId: uid,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        userId: { value: userId, type: "string", required: true },
      });

      // 🟡 Step 1: Use GSI to get message_ts
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!messages || messages.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid} & message_id=${mid}`
        );
      }

      const ts = messages[0].message_ts;

      // 🟢 Step 2: Fetch user's settings
      const userRes = await ScyllaDb.getItem("userSettings", {
        user_id: uid,
      });

      const receipts = userRes?.read_receipts || {};
      receipts[cid] = ts;

      // 🔵 Step 3: Update receipts
      const result = await ScyllaDb.updateItem(
        "userSettings",
        { user_id: uid },
        {
          read_receipts: receipts,
        }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("markMessageRead failed", {
        error: err.message,
        chatId,
        messageId,
        userId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "markMessageRead",
        message: err.message,
        critical: false,
        data: { chatId, messageId, userId },
      });
      return false;
    }
  }

  static async getUnreadCount(userId, chatId) {
    try {
      const { userId: uid, chatId: cid } = SafeUtils.sanitizeValidate({
        userId: { value: userId, type: "string", required: true },
        chatId: { value: chatId, type: "string", required: true },
      });

      // 🟡 Step 1: Fetch last read timestamp from userSettings
      const settings = await ScyllaDb.getItem("userSettings", {
        user_id: uid,
      });
      const lastReadTs = settings?.read_receipts?.[cid] || 0;
      console.log("lastReadTs", lastReadTs);

      // 🟢 Step 2: Query chat_messages for messages with timestamp > lastReadTs
      const result = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_ts > :ts",
        { ":cid": cid, ":ts": lastReadTs },
        { Select: "COUNT" }
      );

      return result.Count || 0;
    } catch (err) {
      ErrorHandler.add_error("getUnreadCount failed", {
        error: err.message,
        userId,
        chatId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "getUnreadCount",
        message: err.message,
        critical: false,
        data: { userId, chatId },
      });
      return 0;
    }
  }

  static async sendProductRecommendation(chatId, productData) {
    try {
      const { chatId: cid, productData: pd } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        productData: { value: productData, type: "object", required: true },
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmssSSS"
      )}`;
      const timestamp = Date.now();
      // DateTime.now() has to be added in near future
      const item = {
        chat_id: cid,
        message_id: messageId,
        message_ts: timestamp,
        content_type: "product_recommendation",
        content: { product_recommendation: pd },
        reactions: {},
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chat_messages", item);
      return item;
    } catch (err) {
      ErrorHandler.add_error("sendProductRecommendation failed", {
        error: err.message,
        chatId,
        productData,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "sendProductRecommendation",
        message: err.message,
        critical: true,
        data: { chatId, productData },
      });
      return null;
    }
  }
  static async lockMessageReplies(chatId, messageId, lock = true) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        lock: shouldLock,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        lock: { value: lock, type: "boolean", required: false, default: true },
      });

      // 🔍 Step 1: Query message_ts using MessageIdIndex
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!messages || messages.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid}, message_id=${mid}`
        );
      }

      const message = messages[0];

      // 🛠️ Step 2: Update using composite PK (chat_id, message_ts)
      const result = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts,
        },
        {
          locked: shouldLock,
        }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("lockMessageReplies failed", {
        error: err.message,
        chatId,
        messageId,
        lock,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "lockMessageReplies",
        message: err.message,
        critical: false,
        data: { chatId, messageId, lock },
      });
      return false;
    }
  }

  static async attachTaskToMessage(chatId, messageId, taskId) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        taskId: tid,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        taskId: { value: taskId, type: "string", required: true },
      });

      // 🔍 Step 1: Get message using MessageIdIndex to retrieve message_ts
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!messages || messages.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid}, message_id=${mid}`
        );
      }

      const message = messages[0];
      const updatedContent = {
        ...message.content,
        task_id: tid,
      };

      // 🛠️ Step 2: Update item with task_id
      const result = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts,
        },
        {
          content: updatedContent,
        }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("attachTaskToMessage failed", {
        error: err.message,
        chatId,
        messageId,
        taskId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "attachTaskToMessage",
        message: err.message,
        critical: false,
        data: { chatId, messageId, taskId },
      });
      return false;
    }
  }
  static async sendVirtualGift(chatId, messageId, giftData) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        giftData: gd,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        giftData: { value: giftData, type: "object", required: true },
      });

      // 🟡 Step 1: Fetch message via GSI to retrieve message_ts
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!messages || messages.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid}, message_id=${mid}`
        );
      }

      const message = messages[0];
      const updatedContent = {
        ...message.content,
        gift: gd,
      };

      // 🔵 Step 2: Update content
      const result = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts,
        },
        {
          content: updatedContent,
        }
      );

      // 📦 Optional logging
      Logger.writeLog({
        flag: "info",
        action: "sendVirtualGift",
        message: `Virtual gift attached to message ${mid}`,
        data: { giftData: gd },
      });

      return result;
    } catch (err) {
      ErrorHandler.add_error("sendVirtualGift failed", {
        error: err.message,
        chatId,
        messageId,
        giftData,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "sendVirtualGift",
        message: err.message,
        critical: false,
        data: { chatId, messageId, giftData },
      });
      return false;
    }
  }
  static async sendTip(chatId, messageId, amount, currency = "AUD") {
    try {
      const {
        chatId: cid,
        messageId: mid,
        amount: amt,
        currency: cur,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        amount: { value: amount, type: "numeric", required: true },
        currency: {
          value: currency,
          type: "string",
          required: false,
          default: "AUD",
        },
      });

      // Step 1: Query message_ts via GSI
      const results = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!results || results.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid}, message_id=${mid}`
        );
      }

      const message = results[0];
      const transaction = { amount: amt, currency: cur, type: "tip" };

      // Step 2: Merge into existing content
      const updatedContent = {
        ...message.content,
        transaction,
      };

      // Step 3: Update with primary keys
      const result = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts,
        },
        {
          content: updatedContent,
        }
      );

      Logger.writeLog({
        flag: "info",
        action: "sendTip",
        message: `Tip recorded for message ${mid}`,
        data: { transaction },
      });

      return result;
    } catch (err) {
      ErrorHandler.add_error("sendTip failed", {
        error: err.message,
        chatId,
        messageId,
        amount,
        currency,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "sendTip",
        message: err.message,
        critical: false,
        data: { chatId, messageId, amount, currency },
      });
      return false;
    }
  }
  static async sendPaidMedia(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        payload: { value: payload, type: "object", required: true },
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmssSSS"
      )}`;
      const timestamp = Date.now();
      // should replace by this in future const timestamp = DateTime.now("number");

      const item = {
        chat_id: cid,
        message_id: messageId,
        message_ts: timestamp,
        content_type: "paid_media",
        content: pl,
        pay_to_view: true,
        reactions: {},
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chat_messages", item);
      return item;
    } catch (err) {
      ErrorHandler.add_error("sendPaidMedia failed", {
        error: err.message,
        chatId,
        payload,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "sendPaidMedia",
        message: err.message,
        critical: true,
        data: { chatId, payload },
      });
      return null;
    }
  }

  static async updateChatAccess(chatId, accessLevel) {
    try {
      const { chatId: cid, accessLevel: lvl } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        accessLevel: { value: accessLevel, type: "string", required: true },
      });

      // 🟢 Use data format expected by your custom updateItem
      const result = await ScyllaDb.updateItem(
        "chats",
        { chat_id: cid },
        { access_level: lvl }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("updateChatAccess failed", {
        error: err.message,
        chatId,
        accessLevel,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "updateChatAccess",
        message: err.message,
        critical: false,
        data: { chatId, accessLevel },
      });
      return false;
    }
  }
  static async createEventChat(params) {
    try {
      const {
        createdBy,
        participants,
        eventId,
        eventPrice,
        name,
        description,
      } = SafeUtils.sanitizeValidate({
        createdBy: { value: params.createdBy, type: "string", required: true },
        participants: {
          value: params.participants,
          type: "array",
          required: true,
        },
        eventId: { value: params.eventId, type: "string", required: true },
        eventPrice: {
          value: params.eventPrice,
          type: "numeric",
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
        event_id: eventId,
        event_price: eventPrice,
        access_level: "pay-per-event",
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chats", item);
      return item;
    } catch (err) {
      ErrorHandler.add_error("createEventChat failed", {
        error: err.message,
        params,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "createEventChat",
        message: err.message,
        critical: true,
        data: { params },
      });
      return null;
    }
  }

  static async updateMembershipTiers(chatId, tiers) {
    try {
      const { chatId: cid, tiers: t } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        tiers: { value: tiers, type: "array", required: true },
      });

      const result = await ScyllaDb.updateItem(
        "chats",
        { chat_id: cid },
        {
          membership_tiers: t,
        }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("updateMembershipTiers failed", {
        error: err.message,
        chatId,
        tiers,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "updateMembershipTiers",
        message: err.message,
        critical: false,
        data: { chatId, tiers },
      });
      return false;
    }
  }

  static async sendExclusiveContent(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        payload: { value: payload, type: "object", required: true },
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp(
        "yyyyMMddHHmmssSSS"
      )}`;
      // const timestamp = DateTime.now("number");
      const timestamp = Date.now();
      const item = {
        chat_id: cid,
        message_id: messageId,
        message_ts: timestamp,
        content_type: "exclusive",
        content: pl,
        content_flag: "exclusive",
        reactions: {},
        created_at: DateTime.now(),
      };
      await ScyllaDb.putItem("chat_messages", item);
      return item;
    } catch (err) {
      ErrorHandler.add_error("sendExclusiveContent failed", {
        error: err.message,
        chatId,
        payload,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "sendExclusiveContent",
        message: err.message,
        critical: true,
        data: { chatId, payload },
      });
      return null;
    }
  }
  static async startChatTrial(userId, chatId, trialDays = 7) {
    try {
      const {
        userId: uid,
        chatId: cid,
        trialDays: days,
      } = SafeUtils.sanitizeValidate({
        userId: { value: userId, type: "string", required: true },
        chatId: { value: chatId, type: "string", required: true },
        trialDays: {
          value: trialDays,
          type: "numeric",
          required: false,
          default: 7,
        },
      });

      const nowNum = DateTime.now("number");
      const expiry = nowNum + days * 24 * 60 * 60 * 1000;

      const userSettings = await ScyllaDb.getItem("userSettings", {
        user_id: uid,
      });
      const existingTrials = userSettings?.trial_access || {};

      const updatedTrials = { ...existingTrials, [cid]: expiry };

      const result = await ScyllaDb.updateItem(
        "userSettings",
        { user_id: uid },
        {
          trial_access: updatedTrials,
        }
      );

      return result;
    } catch (err) {
      ErrorHandler.add_error("startChatTrial failed", {
        error: err.message,
        userId,
        chatId,
        trialDays,
      });

      Logger.writeLog({
        flag: "system_error",
        action: "startChatTrial",
        message: err.message,
        critical: false,
        data: { userId, chatId, trialDays },
      });

      return false;
    }
  }

  static parseChatMessage(payload) {
    try {
      const { content_type: type, content } = SafeUtils.sanitizeValidate({
        content_type: {
          value: payload.content_type,
          type: "string",
          required: true,
        },
        content: { value: payload.content, type: "object", required: true },
      });
      switch (type) {
        case "text":
          return content.text || "";
        case "mixed":
          return (content.elements || []).map((el) => el.text || "").join(" ");
        case "voice":
          return `[Audio] ${content.media_url}`;
        case "product_recommendation":
          return `[Product] ${content.product_recommendation.name}`;
        case "exclusive":
          return `[Exclusive] ${JSON.stringify(content)}`;
        case "paid_media":
          return `[Paid Media] ${JSON.stringify(content)}`;
        default:
          return JSON.stringify(content);
      }
    } catch (err) {
      Logger.writeLog({
        flag: "system_error",
        action: "parseChatMessage",
        message: err.message,
      });
      return "";
    }
  }

  static async storeChatMessage(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        payload: { value: payload, type: "object", required: true },
      });
      // Delegate to sendMessage to handle storage
      return await this.sendMessage(cid, pl);
    } catch (err) {
      ErrorHandler.add_error("storeChatMessage failed", {
        error: err.message,
        chatId,
        payload,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "storeChatMessage",
        message: err.message,
        critical: false,
        data: { chatId, payload },
      });
      return null;
    }
  }
  static handleIncomingMessage(rawEvent) {
    try {
      const { rawEvent: evt } = SafeUtils.sanitizeValidate({
        rawEvent: { value: rawEvent, type: "string", required: true },
      });
      const data = JSON.parse(evt);
      Logger.writeLog({
        flag: "info",
        action: "handleIncomingMessage",
        message: "Received event",
        data,
      });
      return data;
    } catch (err) {
      Logger.writeLog({
        flag: "system_error",
        action: "handleIncomingMessage",
        message: err.message,
      });
      return null;
    }
  }

  static async joinChat(chatId, userId) {
    try {
      const { chatId: cid, userId: uid } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        userId: { value: userId, type: "string", required: true },
      });
      // Fetch current participants
      const res = await ScyllaDb.getItem("chats", { chat_id: cid });
      const participants = Array.isArray(res.Item?.participants)
        ? res.Item.participants.slice()
        : [];
      if (!participants.includes(uid)) {
        participants.push(uid);
        const result = await ScyllaDb.updateItem(
          "chats",
          { chat_id: cid },
          { participants }
        );

        return result;
      }
    } catch (err) {
      ErrorHandler.add_error("joinChat failed", {
        error: err.message,
        chatId,
        userId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "joinChat",
        message: err.message,
        critical: false,
        data: { chatId, userId },
      });
      return false;
    }
  }
  static async upgradeMembership(userId, chatId, newTier) {
    try {
      const {
        userId: uid,
        chatId: cid,
        newTier: tier,
      } = SafeUtils.sanitizeValidate({
        userId: { value: userId, type: "string", required: true },
        chatId: { value: chatId, type: "string", required: true },
        newTier: { value: newTier, type: "string", required: true },
      });
      // Fetch existing membership info
      const res = await ScyllaDb.getItem("userSettings", { user_id: uid });
      console.log("res", res);
      const memberships = res.Item?.memberships || {};
      memberships[cid] = tier;
      const result = await ScyllaDb.updateItem(
        "userSettings",
        { user_id: uid },
        { memberships }
      );
      return result;
    } catch (err) {
      ErrorHandler.add_error("upgradeMembership failed", {
        error: err.message,
        userId,
        chatId,
        newTier,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "upgradeMembership",
        message: err.message,
        critical: false,
        data: { userId, chatId, newTier },
      });
      return false;
    }
  }

  static async deleteMessage(chatId, messageId) {
    try {
      const { chatId: cid, messageId: mid } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
      });
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!messages || messages.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid} & message_id=${mid}`
        );
      }

      console.log("messages to delete", messages);

      const message = messages[0];
      const timestamp = DateTime.now();
      console.log("Editing message at", timestamp);

      const result = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts,
        },
        {
          deleted_at: timestamp,
        }
      );
      return result;
    } catch (err) {
      ErrorHandler.add_error("deleteMessage failed", {
        error: err.message,
        chatId,
        messageId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "deleteMessage",
        message: err.message,
        critical: false,
        data: { chatId, messageId },
      });
      return false;
    }
  }

  static async flagMessageUrgent(chatId, messageId, isUrgent) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        isUrgent: flag,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        isUrgent: { value: isUrgent, type: "boolean", required: true },
      });
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!messages || messages.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid} & message_id=${mid}`
        );
      }

      // console.log("messages to delete", messages);

      const message = messages[0];
      const timestamp = DateTime.now();
      console.log("Editing message at", timestamp);

      const result = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts,
        },
        {
          isUrgent: true,
        }
      );
      return result;
    } catch (err) {
      ErrorHandler.add_error("flagMessageUrgent failed", {
        error: err.message,
        chatId,
        messageId,
        isUrgent,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "flagMessageUrgent",
        message: err.message,
        critical: false,
        data: { chatId, messageId, isUrgent },
      });
      return false;
    }
  }

  static async pinMessage(chatId, messageId, pin = true) {
    try {
      const {
        chatId: cid,
        messageId: mid,
        pin: shouldPin,
      } = SafeUtils.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        messageId: { value: messageId, type: "string", required: true },
        pin: { value: pin, type: "boolean", required: false, default: true },
      });
      const messages = await ScyllaDb.query(
        "chat_messages",
        "chat_id = :cid AND message_id = :mid",
        { ":cid": cid, ":mid": mid },
        { IndexName: "MessageIdIndex" }
      );

      if (!messages || messages.length === 0) {
        throw new Error(
          `Message not found for chat_id=${cid} & message_id=${mid}`
        );
      }

      // console.log("messages to delete", messages);

      const message = messages[0];
      const timestamp = DateTime.now();
      console.log("Editing message at", timestamp);
      const result = await ScyllaDb.updateItem(
        "chat_messages",
        {
          chat_id: cid,
          message_ts: message.message_ts,
        },
        {
          is_pinned: pin,
          pinned_at: timestamp,
        }
      );
      return result;
    } catch (err) {
      ErrorHandler.add_error("pinMessage failed", {
        error: err.message,
        chatId,
        messageId,
        pin,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "pinMessage",
        message: err.message,
        critical: false,
        data: { chatId, messageId, pin },
      });
      return false;
    }
  }

  static sendTypingIndicator(chatId, userId, isTyping) {
    try {
      const {
        chatId: cid,
        userId: uid,
        isTyping: typing,
      } = Formatting.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        userId: { value: userId, type: "string", required: true },
        isTyping: {
          value: isTyping,
          type: "boolean",
          required: false,
          default: true,
        },
      });
      // Placeholder: publish to WebSocket channel `chat:${cid}:typing`
      // WebSocket.publish(`chat:${cid}:typing`, { userId: uid, isTyping: typing });
      Logger.writeLog({
        flag: "info",
        action: "sendTypingIndicator",
        message: `User ${uid} isTyping=${typing} in chat ${cid}`,
      });
      return true;
    } catch (err) {
      Logger.writeLog({
        flag: "system_error",
        action: "sendTypingIndicator",
        message: err.message,
      });
      return false;
    }
  }

  static renderAnimatedEmoji(emoji) {
    // Front‑end only; return a placeholder wrapper
    Logger.writeLog({
      flag: "info",
      action: "renderAnimatedEmoji",
      message: `Rendered animated emoji for "${emoji}"`,
    });
    return `<span class="animated-emoji" data-emoji="${emoji}">${emoji}</span>`;
  }

  static showChatErrorMessage(chatId, error) {
    // Front‑end only; display error in UI
    const { chatId: cid, error: errMsg } = Formatting.sanitizeValidate({
      chatId: { value: chatId, type: "string", required: true },
      error: { value: error, type: "string", required: true },
    });
    Logger.writeLog({
      flag: "error",
      action: "showChatErrorMessage",
      message: `Chat ${cid} error: ${errMsg}`,
    });
    // e.g., UI.showError(chatId, error);
    return null;
  }
  static subscribeToTyping(chatId, handler) {
    try {
      const { chatId: cid, handler: cb } = Formatting.sanitizeValidate({
        chatId: { value: chatId, type: "string", required: true },
        handler: { value: handler, type: "object", required: true }, // expecting a function
      });
      // Placeholder: subscribe to Redis pub/sub or WebSocket channel
      // e.g., Redis.subscribe(`chat:${cid}:typing`, msg => cb(JSON.parse(msg)));
      Logger.writeLog({
        flag: "info",
        action: "subscribeToTyping",
        message: `Subscribed to typing for chat ${cid}`,
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error("subscribeToTyping failed", {
        error: err.message,
        chatId,
      });
      Logger.writeLog({
        flag: "system_error",
        action: "subscribeToTyping",
        message: err.message,
        critical: false,
        data: { chatId },
      });
      return false;
    }
  }
}
