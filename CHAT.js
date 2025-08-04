Schema

import ScyllaDb from './ScyllaDb';
import Formatting from './formatting';
import ErrorHandler from './ErrorHandler';
import Logger from './Logger';
import DateTime from './DateTime';

export default class ChatManager {
  /**
   * Create the user_chats table in ScyllaDB
   */
  static async createUserChatsTable() {
    try {
      Logger.writeLog({ flag: 'startup', action: 'createUserChatsTable', message: 'Creating user_chats table' });

      const schema = {
        TableName: 'user_chats',
        AttributeDefinitions: [
          { AttributeName: 'user_id', AttributeType: 'S' },
          { AttributeName: 'featured', AttributeType: 'B' },
          { AttributeName: 'is_critical', AttributeType: 'B' },
          { AttributeName: 'last_message_ts', AttributeType: 'N' },
          { AttributeName: 'chat_id', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' },
          { AttributeName: 'featured', KeyType: 'RANGE' },
          { AttributeName: 'is_critical', KeyType: 'RANGE' },
          { AttributeName: 'last_message_ts', KeyType: 'RANGE' },
          { AttributeName: 'chat_id', KeyType: 'RANGE' }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      };

      await ScyllaDb.createTable(schema);
      return true;
    } catch (err) {
      ErrorHandler.add_error('Failed to create user_chats table', { error: err.message });
      Logger.writeLog({ flag: 'system_error', action: 'createUserChatsTable', message: err.message, critical: true });
      return false;
    }
  }

  /**
   * Create the chats table in ScyllaDB
   */
  static async createChatsTable() {
    try {
      Logger.writeLog({ flag: 'startup', action: 'createChatsTable', message: 'Creating chats table' });

      const schema = {
        TableName: 'chats',
        AttributeDefinitions: [
          { AttributeName: 'chat_id', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'chat_id', KeyType: 'HASH' }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      };

      await ScyllaDb.createTable(schema);
      return true;
    } catch (err) {
      ErrorHandler.add_error('Failed to create chats table', { error: err.message });
      Logger.writeLog({ flag: 'system_error', action: 'createChatsTable', message: err.message, critical: true });
      return false;
    }
  }

  /**
   * Create the chat_messages table in ScyllaDB
   */
  static async createChatMessagesTable() {
    try {
      Logger.writeLog({ flag: 'startup', action: 'createChatMessagesTable', message: 'Creating chat_messages table' });

      const schema = {
        TableName: 'chat_messages',
        AttributeDefinitions: [
          { AttributeName: 'chat_id', AttributeType: 'S' },
          { AttributeName: 'message_ts', AttributeType: 'N' },
          { AttributeName: 'message_id', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'chat_id', KeyType: 'HASH' },
          { AttributeName: 'message_ts', KeyType: 'RANGE' },
          { AttributeName: 'message_id', KeyType: 'RANGE' }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 10 }
      };

      await ScyllaDb.createTable(schema);
      return true;
    } catch (err) {
      ErrorHandler.add_error('Failed to create chat_messages table', { error: err.message });
      Logger.writeLog({ flag: 'system_error', action: 'createChatMessagesTable', message: err.message, critical: true });
      return false;
    }




  /**
   * 1. Create a private chat
   */
  static async createChat(params) {
    try {
      const { createdBy, participants, name } = Formatting.sanitizeValidate({
        createdBy: { value: params.createdBy, type: 'string', required: true },
        participants: { value: params.participants, type: 'array', required: true },
        name: { value: params.name, type: 'string', required: false, default: null }
      });
      const metadata = Formatting.hasValue(params.metadata) ? params.metadata : {};
      const chatId = `chat#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmss')}`;
      const item = {
        chat_id: chatId,
        is_group: false,
        created_by: createdBy,
        participants,
        name,
        metadata,
        created_at: DateTime.now()
      };
      await ScyllaDb.putItem('chats', item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error('createChat failed', { error: err.message, params });
      Logger.writeLog({
        flag: 'system_error',
        action: 'createChat',
        message: err.message,
        critical: true,
        data: { params }
      });
      return null;
    }
  }

  /**
   * 2. Create a group chat (Chime)
   */
  static async createChimeChat(params) {
    try {
      const { createdBy, participants, name, mode, maxParticipants } = Formatting.sanitizeValidate({
        createdBy:       { value: params.createdBy,       type: 'string', required: true },
        participants:    { value: params.participants,    type: 'array',  required: true },
        name:            { value: params.name,            type: 'string', required: false, default: null },
        mode:            { value: params.mode,            type: 'string', required: false, default: 'private' },
        maxParticipants: { value: params.maxParticipants, type: 'number', required: false, default: participants.length }
      });
      const metadata = Formatting.hasValue(params.metadata) ? params.metadata : {};
      const chatId = `chat#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmss')}`;
      const item = {
        chat_id: chatId,
        is_group: true,
        created_by: createdBy,
        participants,
        name,
        mode,
        max_participants: maxParticipants,
        metadata,
        created_at: DateTime.now()
      };
      await ScyllaDb.putItem('chats', item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error('createChimeChat failed', { error: err.message, params });
      Logger.writeLog({
        flag: 'system_error',
        action: 'createChimeChat',
        message: err.message,
        critical: true,
        data: { params }
      });
      return null;
    }
  }

  /**
   * 3. Fetch most recent messages (with “load more” pagination)
   */
  static async fetchRecentMessages(chatId, pagingState = null, limit = 20) {
    try {
      const { chatId: id, pagingState: state, limit: max } = Formatting.sanitizeValidate({
        chatId:       { value: chatId,       type: 'string', required: true },
        pagingState:  { value: pagingState,  type: 'object', required: false, default: null },
        limit:        { value: limit,        type: 'number', required: false, default: 20 }
      });
      const params = {
        TableName: 'chat_messages',
        KeyConditionExpression: 'chat_id = :cid AND message_ts < :lastTs',
        ExpressionAttributeValues: {
          ':cid':    id,
          ':lastTs': state?.message_ts ?? DateTime.now('number')
        },
        Limit:            max,
        ScanIndexForward: false,
        ExclusiveStartKey: state
      };
      const res = await ScyllaDb.query(params);
      return {
        messages:    res.Items || [],
        pagingState: res.LastEvaluatedKey || null
      };
    } catch (err) {
      ErrorHandler.add_error('fetchRecentMessages failed', { error: err.message, chatId, pagingState, limit });
      Logger.writeLog({
        flag: 'system_error',
        action: 'fetchRecentMessages',
        message: err.message,
        critical: false,
        data: { chatId, pagingState, limit }
      });
      return { messages: [], pagingState: null };
    }
  }
}


export default class ChatManager {
  /**
   * 4. Get chat container element (front‑end only)
   */
  static getChatContainerElement(selector) {
    // Front‑end only; ignored on backend
    Logger.writeLog({
      flag: 'info',
      action: 'getChatContainerElement',
      message: `Front‑end only, selector="${selector}" ignored`
    });
    return null;
  }

  /**
   * 5. Fetch all chat IDs for a user
   */
  static async fetchUserChats(userId) {
    try {
      const { userId: uid } = Formatting.sanitizeValidate({
        userId: { value: userId, type: 'string', required: true }
      });
      const params = {
        TableName: 'user_chats',
        KeyConditionExpression: 'user_id = :uid',
        ExpressionAttributeValues: { ':uid': uid },
        ScanIndexForward: false // newest first
      };
      const res = await ScyllaDb.query(params);
      return (res.Items || []).map(item => item.chat_id);
    } catch (err) {
      ErrorHandler.add_error('fetchUserChats failed', { error: err.message, userId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'fetchUserChats',
        message: err.message,
        critical: false,
        data: { userId }
      });
      return [];
    }
  }

  /**
   * 6. Archive a chat (hide without deleting)
   */
  static async archiveChat(chatId, userId) {
    try {
      const { chatId: cid, userId: uid } = Formatting.sanitizeValidate({
        chatId: { value: chatId, type: 'string', required: true },
        userId: { value: userId, type: 'string', required: true }
      });
      // mark archived_at on chats table
      await ScyllaDb.updateItem({
        TableName: 'chats',
        Key: { chat_id: cid },
        UpdateExpression: 'SET archived_at = :ts',
        ExpressionAttributeValues: { ':ts': DateTime.now() }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('archiveChat failed', { error: err.message, chatId, userId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'archiveChat',
        message: err.message,
        critical: false,
        data: { chatId, userId }
      });
      return false;
    }
  }
}

export default class ChatManager {
  /**
   * 7. Auto-expire chats after configurable time
   */
  static async expireOldChats() {
    try {
      // Placeholder: fetch expiration threshold (ms) from config or userSettings
      const expireThresholdMs = 30 * 24 * 60 * 60 * 1000;
      const nowNum = DateTime.now('number');
      const cutoff = nowNum - expireThresholdMs;

      // Find chats older than cutoff and not yet expired
      const scanParams = {
        TableName: 'chats',
        FilterExpression: 'created_at < :cutoff AND attribute_not_exists(auto_expired)',
        ExpressionAttributeValues: { ':cutoff': cutoff }
      };
      const res = await ScyllaDb.scan(scanParams);
      for (const chat of res.Items || []) {
        await ScyllaDb.updateItem({
          TableName: 'chats',
          Key: { chat_id: chat.chat_id },
          UpdateExpression: 'SET auto_expired = :true',
          ExpressionAttributeValues: { ':true': true }
        });
      }
      return true;
    } catch (err) {
      ErrorHandler.add_error('expireOldChats failed', { error: err.message });
      Logger.writeLog({
        flag: 'system_error',
        action: 'expireOldChats',
        message: err.message,
        critical: false
      });
      return false;
    }
  }

  /**
   * 8. Auto-archive chats after configurable time
   */
  static async autoArchiveChats() {
    try {
      // Placeholder: fetch archive threshold (ms) from config or userSettings
      const archiveThresholdMs = 60 * 24 * 60 * 60 * 1000;
      const nowNum = DateTime.now('number');
      const cutoff = nowNum - archiveThresholdMs;

      // Find chats auto-expired before cutoff and not yet archived
      const scanParams = {
        TableName: 'chats',
        FilterExpression: 'auto_expired = :true AND attribute_not_exists(archived_at)',
        ExpressionAttributeValues: { ':true': true }
      };
      const res = await ScyllaDb.scan(scanParams);
      for (const chat of res.Items || []) {
        await ScyllaDb.updateItem({
          TableName: 'chats',
          Key: { chat_id: chat.chat_id },
          UpdateExpression: 'SET archived_at = :ts',
          ExpressionAttributeValues: { ':ts': DateTime.now() }
        });
      }
      return true;
    } catch (err) {
      ErrorHandler.add_error('autoArchiveChats failed', { error: err.message });
      Logger.writeLog({
        flag: 'system_error',
        action: 'autoArchiveChats',
        message: err.message,
        critical: false
      });
      return false;
    }
  }

  /**
   * 9. Restrict chats to paying subscribers (blur previews)
   */
  static async updateChatSubscriptionFlag(chatId, subscriptionRequired) {
    try {
      const { chatId: cid, subscriptionRequired: flag } = Formatting.sanitizeValidate({
        chatId:               { value: chatId,             type: 'string',  required: true },
        subscriptionRequired: { value: subscriptionRequired, type: 'boolean', required: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chats',
        Key: { chat_id: cid },
        UpdateExpression: 'SET subscription_required = :flag',
        ExpressionAttributeValues: { ':flag': flag }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('updateChatSubscriptionFlag failed', { error: err.message, chatId, subscriptionRequired });
      Logger.writeLog({
        flag: 'system_error',
        action: 'updateChatSubscriptionFlag',
        message: err.message,
        critical: false,
        data: { chatId, subscriptionRequired }
      });
      return false;
    }
  }
}

 /**
   * 10. Update chat mode (“private” vs “broadcast”) and optionally max participants
   */
  static async updateChatMode(chatId, mode, maxParticipants = null) {
    try {
      const { chatId: cid, mode: newMode, maxParticipants: maxPart } = Formatting.sanitizeValidate({
        chatId:        { value: chatId,        type: 'string', required: true },
        mode:          { value: mode,          type: 'string', required: true },
        maxParticipants: { value: maxParticipants, type: 'number', required: false, default: null }
      });
      const expr = ['SET mode = :mode'];
      const vals  = { ':mode': newMode };
      if (Formatting.hasValue(maxPart)) {
        expr.push('max_participants = :max');
        vals[':max'] = maxPart;
      }
      await ScyllaDb.updateItem({
        TableName: 'chats',
        Key: { chat_id: cid },
        UpdateExpression: expr.join(', '),
        ExpressionAttributeValues: vals
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('updateChatMode failed', { error: err.message, chatId, mode, maxParticipants });
      Logger.writeLog({
        flag: 'system_error',
        action: 'updateChatMode',
        message: err.message,
        critical: false,
        data: { chatId, mode, maxParticipants }
      });
      return false;
    }
  }

  /**
   * 11. Set a user’s role in a group chat (e.g., “admin”, “member”)
   */
  static async setChatRole(chatId, userId, role) {
    try {
      const { chatId: cid, userId: uid, role: newRole } = Formatting.sanitizeValidate({
        chatId: { value: chatId, type: 'string', required: true },
        userId: { value: userId, type: 'string', required: true },
        role:   { value: role,   type: 'string', required: true }
      });
      // Fetch existing participants map
      const getRes = await ScyllaDb.getItem({
        TableName: 'chats',
        Key: { chat_id: cid }
      });
      const participants = getRes.Item?.participants || {};
      participants[uid] = newRole;
      // Write back updated map
      await ScyllaDb.updateItem({
        TableName: 'chats',
        Key: { chat_id: cid },
        UpdateExpression: 'SET participants = :parts',
        ExpressionAttributeValues: { ':parts': participants }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('setChatRole failed', { error: err.message, chatId, userId, role });
      Logger.writeLog({
        flag: 'system_error',
        action: 'setChatRole',
        message: err.message,
        critical: false,
        data: { chatId, userId, role }
      });
      return false;
    }
  }

  /**
   * 12. Create a general group chat (name, description, cover image, rules, category, type)
   */
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
        type
      } = Formatting.sanitizeValidate({
        createdBy:    { value: params.createdBy,    type: 'string', required: true },
        participants: { value: params.participants, type: 'array',  required: true },
        name:         { value: params.name,         type: 'string', required: false, default: null },
        description:  { value: params.description,  type: 'string', required: false, default: null },
        coverImageUrl:{ value: params.coverImageUrl,type: 'string', required: false, default: null },
        rulesJson:    { value: params.rulesJson,    type: 'object', required: false, default: {} },
        category:     { value: params.category,     type: 'string', required: false, default: null },
        type:         { value: params.type,         type: 'string', required: false, default: null }
      });
      const chatId = `chat#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmss')}`;
      const item = {
        chat_id:        chatId,
        is_group:       true,
        created_by:     createdBy,
        participants,
        name,
        description,
        cover_image_url: coverImageUrl,
        rules_json:     rulesJson,
        category,
        type,
        created_at:     DateTime.now()
      };
      await ScyllaDb.putItem('chats', item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error('createGroupChat failed', { error: err.message, params });
      Logger.writeLog({
        flag: 'system_error',
        action: 'createGroupChat',
        message: err.message,
        critical: true,
        data: { params }
      });
      return null;
    }
  }


 /**
   * 13. Update chat metadata (name, description, cover image, rules, category, type)
   */
  static async updateChatMetadata(chatId, metadata) {
    try {
      const { chatId: cid, metadata: meta } = Formatting.sanitizeValidate({
        chatId:   { value: chatId,   type: 'string', required: true },
        metadata: { value: metadata, type: 'object', required: true }
      });
      const fieldMap = {
        name:           'name',
        description:    'description',
        coverImageUrl:  'cover_image_url',
        rulesJson:      'rules_json',
        category:       'category',
        type:           'type'
      };
      const updates = [];
      const values  = {};
      for (const [key, dbField] of Object.entries(fieldMap)) {
        if (Formatting.hasValue(meta[key])) {
          updates.push(`${dbField} = :${key}`);
          values[`:${key}`] = meta[key];
        }
      }
      if (updates.length === 0) return true; // nothing to update
      await ScyllaDb.updateItem({
        TableName: 'chats',
        Key:       { chat_id: cid },
        UpdateExpression: 'SET ' + updates.join(', '),
        ExpressionAttributeValues: values
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('updateChatMetadata failed', { error: err.message, chatId, metadata });
      Logger.writeLog({
        flag: 'system_error',
        action: 'updateChatMetadata',
        message: err.message,
        critical: false,
        data: { chatId, metadata }
      });
      return false;
    }
  }

  /**
   * 14. Update per-chat notification settings for a user
   */
  static async updateNotificationSettings(userId, chatId, settings) {
    try {
      const { userId: uid, chatId: cid, settings: cfg } = Formatting.sanitizeValidate({
        userId:   { value: userId,   type: 'string', required: true },
        chatId:   { value: chatId,   type: 'string', required: true },
        settings: { value: settings, type: 'object', required: true }
      });
      // Fetch existing userSettings
      const getRes = await ScyllaDb.getItem({
        TableName: 'userSettings',
        Key:       { user_id: uid }
      });
      const notif = getRes.Item?.notifications || {};
      notif[cid] = cfg;
      await ScyllaDb.updateItem({
        TableName: 'userSettings',
        Key:       { user_id: uid },
        UpdateExpression: 'SET notifications = :n',
        ExpressionAttributeValues: { ':n': notif }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('updateNotificationSettings failed', { error: err.message, userId, chatId, settings });
      Logger.writeLog({
        flag: 'system_error',
        action: 'updateNotificationSettings',
        message: err.message,
        critical: false,
        data: { userId, chatId, settings }
      });
      return false;
    }
  }

  /**
   * 15. Search/discovery of groups (placeholder)
   */
  static async searchGroups(searchQuery) {
    try {
      const { searchQuery: q } = Formatting.sanitizeValidate({
        searchQuery: { value: searchQuery, type: 'string', required: true }
      });
      // Placeholder: perform search in Elasticsearch index 'chats'
      // e.g., const results = await Elastic.search({ index: 'chats', q });
      // return results.hits.hits.map(hit => hit._source);
      return []; // return matched chat metadata objects
    } catch (err) {
      ErrorHandler.add_error('searchGroups failed', { error: err.message, searchQuery });
      Logger.writeLog({
        flag: 'system_error',
        action: 'searchGroups',
        message: err.message,
        critical: false,
        data: { searchQuery }
      });
      return [];
    }
  }


export default class ChatManager {
  /**
   * 16. React to a message (emoji reactions)
   */
  static async reactToMessage(chatId, messageId, emoji, count = 1) {
    try {
      const { chatId: cid, messageId: mid, emoji: emj, count: cnt } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string',  required: true },
        messageId: { value: messageId, type: 'string',  required: true },
        emoji:     { value: emoji,     type: 'string',  required: true },
        count:     { value: count,     type: 'number',  required: false, default: 1 }
      });
      // Fetch existing message (assuming message_id is unique or secondary-indexed)
      const getRes = await ScyllaDb.getItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid }
      });
      const reactions = getRes.Item?.reactions || {};
      reactions[emj] = (reactions[emj] || 0) + cnt;
      // Update reactions map
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET reactions = :r',
        ExpressionAttributeValues: { ':r': reactions }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('reactToMessage failed', { error: err.message, chatId, messageId, emoji, count });
      Logger.writeLog({
        flag: 'system_error',
        action: 'reactToMessage',
        message: err.message,
        critical: false,
        data: { chatId, messageId, emoji, count }
      });
      return false;
    }
  }

  /**
   * 17. Send a text/media message
   */
  static async sendMessage(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = Formatting.sanitizeValidate({
        chatId:  { value: chatId,  type: 'string', required: true },
        payload: { value: payload, type: 'object', required: true }
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmssSSS')}`;
      const timestamp = DateTime.now('number');
      const item = {
        chat_id:      cid,
        message_id:   messageId,
        message_ts:   timestamp,
        content_type: pl.contentType || 'text',
        content:      pl,
        reactions:    {},
        created_at:   DateTime.now()
      };
      await ScyllaDb.putItem('chat_messages', item);
      return messageId;
    } catch (err) {
      ErrorHandler.add_error('sendMessage failed', { error: err.message, chatId, payload });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendMessage',
        message: err.message,
        critical: true,
        data: { chatId, payload }
      });
      return null;
    }
  }

  /**
   * 18. Send a voice/audio note
   */
  static async sendVoiceMessage(chatId, mediaUrl) {
    try {
      const { chatId: cid, mediaUrl: url } = Formatting.sanitizeValidate({
        chatId:   { value: chatId,  type: 'string', required: true },
        mediaUrl: { value: mediaUrl, type: 'string', required: true }
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmssSSS')}`;
      const timestamp = DateTime.now('number');
      const item = {
        chat_id:      cid,
        message_id:   messageId,
        message_ts:   timestamp,
        content_type: 'voice',
        content:      { media_url: url },
        reactions:    {},
        created_at:   DateTime.now()
      };
      await ScyllaDb.putItem('chat_messages', item);
      return messageId;
    } catch (err) {
      ErrorHandler.add_error('sendVoiceMessage failed', { error: err.message, chatId, mediaUrl });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendVoiceMessage',
        message: err.message,
        critical: true,
        data: { chatId, mediaUrl }
      });
      return null;
    }
  }
}


/**
   * 19. Link a poll to a message
   */
  static async linkPollToMessage(chatId, messageId, pollId) {
    try {
      const { chatId: cid, messageId: mid, pollId: pid } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true },
        pollId:    { value: pollId,    type: 'string', required: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET content.poll_id = :pid',
        ExpressionAttributeValues: { ':pid': pid }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('linkPollToMessage failed', { error: err.message, chatId, messageId, pollId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'linkPollToMessage',
        message: err.message,
        critical: false,
        data: { chatId, messageId, pollId }
      });
      return false;
    }
  }

  /**
   * 20. Send a mixed text + attachment message
   */
  static async sendMixedMessage(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = Formatting.sanitizeValidate({
        chatId:  { value: chatId,  type: 'string', required: true },
        payload: { value: payload, type: 'object', required: true }
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmssSSS')}`;
      const timestamp = DateTime.now('number');
      const item = {
        chat_id:      cid,
        message_id:   messageId,
        message_ts:   timestamp,
        content_type: 'mixed',
        content:      pl,
        reactions:    {},
        created_at:   DateTime.now()
      };
      await ScyllaDb.putItem('chat_messages', item);
      return messageId;
    } catch (err) {
      ErrorHandler.add_error('sendMixedMessage failed', { error: err.message, chatId, payload });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendMixedMessage',
        message: err.message,
        critical: true,
        data: { chatId, payload }
      });
      return null;
    }
  }

  /**
   * 21. Validate message length against a max limit
   */
  static validateMessageLength(text, maxLength = 1000) {
    try {
      const { text: t } = Formatting.sanitizeValidate({
        text: { value: text, type: 'string', required: true }
      });
      if (t.length > maxLength) {
        Logger.writeLog({
          flag: 'warn',
          action: 'validateMessageLength',
          message: `Message length ${t.length} exceeds max ${maxLength}`
        });
        return false;
      }
      return true;
    } catch (err) {
      Logger.writeLog({
        flag: 'system_error',
        action: 'validateMessageLength',
        message: err.message
      });
      return false;
    }
  }

  /**
   * 22. Filter banned words from text (replaces each with asterisks)
   */
  static filterBannedWords(text) {
    try {
      const { text: t } = Formatting.sanitizeValidate({
        text: { value: text, type: 'string', required: true }
      });
      // Placeholder banned-words list; replace with your real list or config
      const bannedWords = ['badword1', 'badword2', 'badword3'];
      let sanitized = t;
      for (const word of bannedWords) {
        const pattern = new RegExp(`\\b${word}\\b`, 'gi');
        sanitized = sanitized.replace(pattern, '****');
      }
      return sanitized;
    } catch (err) {
      Logger.writeLog({
        flag: 'system_error',
        action: 'filterBannedWords',
        message: err.message
      });
      return text;
    }
  }

  /**
   * 23. Render animated emoji (front‑end placeholder)
   */
  static renderAnimatedEmoji(emoji) {
    // Front‑end only; return a placeholder wrapper
    Logger.writeLog({
      flag: 'info',
      action: 'renderAnimatedEmoji',
      message: `Rendered animated emoji for "${emoji}"`
    });
    return `<span class="animated-emoji" data-emoji="${emoji}">${emoji}</span>`;
  }

  /**
   * 24. Edit a message (update content and mark edited)
   */
  static async editMessage(chatId, messageId, newContent) {
    try {
      const { chatId: cid, messageId: mid, newContent: content } = Formatting.sanitizeValidate({
        chatId:     { value: chatId,     type: 'string', required: true },
        messageId:  { value: messageId,  type: 'string', required: true },
        newContent: { value: newContent, type: 'object', required: true }
      });
      const ts = DateTime.now();
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET content = :c, edited_at = :e',
        ExpressionAttributeValues: {
          ':c': content,
          ':e': ts
        }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('editMessage failed', { error: err.message, chatId, messageId, newContent });
      Logger.writeLog({
        flag: 'system_error',
        action: 'editMessage',
        message: err.message,
        critical: false,
        data: { chatId, messageId, newContent }
      });
      return false;
    }
  }

export default class ChatManager {
  /**
   * 25. Delete a message (mark deleted)
   */
  static async deleteMessage(chatId, messageId) {
    try {
      const { chatId: cid, messageId: mid } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET deleted_at = :ts',
        ExpressionAttributeValues: { ':ts': DateTime.now() }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('deleteMessage failed', { error: err.message, chatId, messageId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'deleteMessage',
        message: err.message,
        critical: false,
        data: { chatId, messageId }
      });
      return false;
    }
  }

  /**
   * 26. Flag/unflag a message as urgent
   */
  static async flagMessageUrgent(chatId, messageId, isUrgent) {
    try {
      const { chatId: cid, messageId: mid, isUrgent: flag } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string',  required: true },
        messageId: { value: messageId, type: 'string',  required: true },
        isUrgent:  { value: isUrgent,  type: 'boolean', required: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET is_urgent = :flag',
        ExpressionAttributeValues: { ':flag': flag }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('flagMessageUrgent failed', { error: err.message, chatId, messageId, isUrgent });
      Logger.writeLog({
        flag: 'system_error',
        action: 'flagMessageUrgent',
        message: err.message,
        critical: false,
        data: { chatId, messageId, isUrgent }
      });
      return false;
    }
  }

  /**
   * 27. Pin/unpin a message
   */
  static async pinMessage(chatId, messageId, pin = true) {
    try {
      const { chatId: cid, messageId: mid, pin: shouldPin } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string',  required: true },
        messageId: { value: messageId, type: 'string',  required: true },
        pin:       { value: pin,       type: 'boolean', required: false, default: true }
      });
      const ts = shouldPin ? DateTime.now() : null;
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET is_pinned = :pin, pinned_at = :ts',
        ExpressionAttributeValues: {
          ':pin': shouldPin,
          ':ts':  ts
        }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('pinMessage failed', { error: err.message, chatId, messageId, pin });
      Logger.writeLog({
        flag: 'system_error',
        action: 'pinMessage',
        message: err.message,
        critical: false,
        data: { chatId, messageId, pin }
      });
      return false;
    }
  }
}

 /**
   * 28. Send typing indicator (ephemeral via WebSocket)
   */
  static sendTypingIndicator(chatId, userId, isTyping) {
    try {
      const { chatId: cid, userId: uid, isTyping: typing } = Formatting.sanitizeValidate({
        chatId:   { value: chatId,   type: 'string',  required: true },
        userId:   { value: userId,   type: 'string',  required: true },
        isTyping: { value: isTyping, type: 'boolean', required: false, default: true }
      });
      // Placeholder: publish to WebSocket channel `chat:${cid}:typing`
      // WebSocket.publish(`chat:${cid}:typing`, { userId: uid, isTyping: typing });
      Logger.writeLog({
        flag: 'info',
        action: 'sendTypingIndicator',
        message: `User ${uid} isTyping=${typing} in chat ${cid}`
      });
      return true;
    } catch (err) {
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendTypingIndicator',
        message: err.message
      });
      return false;
    }
  }

  /**
   * 29. Mark a message as read for a user
   */
  static async markMessageRead(chatId, messageId, userId) {
    try {
      const { chatId: cid, messageId: mid, userId: uid } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true },
        userId:    { value: userId,    type: 'string', required: true }
      });
      // Fetch message timestamp
      const msgRes = await ScyllaDb.getItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid }
      });
      const ts = msgRes.Item?.message_ts;
      if (!ts) return false;
      // Update user's last_read_ts in userSettings
      const getRes = await ScyllaDb.getItem({
        TableName: 'userSettings',
        Key: { user_id: uid }
      });
      const receipts = getRes.Item?.read_receipts || {};
      receipts[cid] = ts;
      await ScyllaDb.updateItem({
        TableName: 'userSettings',
        Key: { user_id: uid },
        UpdateExpression: 'SET read_receipts = :r',
        ExpressionAttributeValues: { ':r': receipts }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('markMessageRead failed', { error: err.message, chatId, messageId, userId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'markMessageRead',
        message: err.message,
        critical: false,
        data: { chatId, messageId, userId }
      });
      return false;
    }
  }

  /**
   * 30. Get unread message count for a user in a chat
   */
  static async getUnreadCount(userId, chatId) {
    try {
      const { userId: uid, chatId: cid } = Formatting.sanitizeValidate({
        userId: { value: userId, type: 'string', required: true },
        chatId: { value: chatId, type: 'string', required: true }
      });
      // Fetch last_read_ts
      const settings = await ScyllaDb.getItem({
        TableName: 'userSettings',
        Key: { user_id: uid }
      });
      const lastReadTs = settings.Item?.read_receipts?.[cid] || 0;
      // Query count of messages newer than lastReadTs
      const params = {
        TableName: 'chat_messages',
        KeyConditionExpression: 'chat_id = :cid AND message_ts > :ts',
        ExpressionAttributeValues: {
          ':cid': cid,
          ':ts':  lastReadTs
        },
        Select: 'COUNT'
      };
      const res = await ScyllaDb.query(params);
      return res.Count || 0;
    } catch (err) {
      ErrorHandler.add_error('getUnreadCount failed', { error: err.message, userId, chatId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'getUnreadCount',
        message: err.message,
        critical: false,
        data: { userId, chatId }
      });
      return 0;
    }
  }

   /**
   * 31. Process message payment (placeholder external)
   */
  static async processMessagePayment(chatId, messageId, userId, paymentDetails) {
    try {
      const { chatId: cid, messageId: mid, userId: uid, paymentDetails: pd } = Formatting.sanitizeValidate({
        chatId:         { value: chatId,         type: 'string', required: true },
        messageId:      { value: messageId,      type: 'string', required: true },
        userId:         { value: userId,         type: 'string', required: true },
        paymentDetails: { value: paymentDetails, type: 'object', required: true }
      });
      // Placeholder: call external payment gateway
      // e.g., await PaymentGateway.charge(uid, pd);
      Logger.writeLog({
        flag: 'info',
        action: 'processMessagePayment',
        message: `Processed payment for user ${uid} on message ${mid} in chat ${cid}`,
        data: { paymentDetails: pd }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('processMessagePayment failed', { error: err.message, chatId, messageId, userId, paymentDetails });
      Logger.writeLog({
        flag: 'system_error',
        action: 'processMessagePayment',
        message: err.message,
        critical: true,
        data: { chatId, messageId, userId, paymentDetails }
      });
      return false;
    }
  }

  /**
   * 32. Send a product recommendation message
   */
  static async sendProductRecommendation(chatId, productData) {
    try {
      const { chatId: cid, productData: pd } = Formatting.sanitizeValidate({
        chatId:      { value: chatId,     type: 'string', required: true },
        productData: { value: productData, type: 'object', required: true }
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmssSSS')}`;
      const timestamp = DateTime.now('number');
      const item = {
        chat_id:           cid,
        message_id:        messageId,
        message_ts:        timestamp,
        content_type:      'product_recommendation',
        content:           { product_recommendation: pd },
        reactions:         {},
        created_at:        DateTime.now()
      };
      await ScyllaDb.putItem('chat_messages', item);
      return messageId;
    } catch (err) {
      ErrorHandler.add_error('sendProductRecommendation failed', { error: err.message, chatId, productData });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendProductRecommendation',
        message: err.message,
        critical: true,
        data: { chatId, productData }
      });
      return null;
    }
  }

  /**
   * 33. Lock or unlock replies to a message
   */
  static async lockMessageReplies(chatId, messageId, lock = true) {
    try {
      const { chatId: cid, messageId: mid, lock: shouldLock } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string',  required: true },
        messageId: { value: messageId, type: 'string',  required: true },
        lock:      { value: lock,      type: 'boolean', required: false, default: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET locked = :l',
        ExpressionAttributeValues: { ':l': shouldLock }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('lockMessageReplies failed', { error: err.message, chatId, messageId, lock });
      Logger.writeLog({
        flag: 'system_error',
        action: 'lockMessageReplies',
        message: err.message,
        critical: false,
        data: { chatId, messageId, lock }
      });
      return false;
    }
  }


 /**
   * 34. Attach a task/to-do to a message
   */
  static async attachTaskToMessage(chatId, messageId, taskId) {
    try {
      const { chatId: cid, messageId: mid, taskId: tid } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true },
        taskId:    { value: taskId,    type: 'string', required: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET content.task_id = :tid',
        ExpressionAttributeValues: { ':tid': tid }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('attachTaskToMessage failed', { error: err.message, chatId, messageId, taskId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'attachTaskToMessage',
        message: err.message,
        critical: false,
        data: { chatId, messageId, taskId }
      });
      return false;
    }
  }

  /**
   * 35. Send a virtual gift (placeholder external)
   */
  static async sendVirtualGift(chatId, messageId, giftData) {
    try {
      const { chatId: cid, messageId: mid, giftData: gd } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true },
        giftData:  { value: giftData,  type: 'object', required: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET content.gift = :gd',
        ExpressionAttributeValues: { ':gd': gd }
      });
      // Placeholder: record transaction via external payment/inventory system
      Logger.writeLog({
        flag: 'info',
        action: 'sendVirtualGift',
        message: `Virtual gift attached to message ${mid}`,
        data: { giftData: gd }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('sendVirtualGift failed', { error: err.message, chatId, messageId, giftData });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendVirtualGift',
        message: err.message,
        critical: false,
        data: { chatId, messageId, giftData }
      });
      return false;
    }
  }

  /**
   * 36. Send a tip (token) in a message (placeholder external)
   */
  static async sendTip(chatId, messageId, amount, currency = 'AUD') {
    try {
      const { chatId: cid, messageId: mid, amount: amt, currency: cur } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true },
        amount:    { value: amount,    type: 'number', required: true },
        currency:  { value: currency,  type: 'string', required: false, default: 'AUD' }
      });
      const transaction = { amount: amt, currency: cur, type: 'tip' };
      await ScyllaDb.updateItem({
        TableName: 'chat_messages',
        Key: { chat_id: cid, message_id: mid },
        UpdateExpression: 'SET content.transaction = :tx',
        ExpressionAttributeValues: { ':tx': transaction }
      });
      // Placeholder: call external payment gateway if needed
      Logger.writeLog({
        flag: 'info',
        action: 'sendTip',
        message: `Tip recorded for message ${mid}`,
        data: { transaction }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('sendTip failed', { error: err.message, chatId, messageId, amount, currency });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendTip',
        message: err.message,
        critical: false,
        data: { chatId, messageId, amount, currency }
      });
      return false;
    }
  }

  /**
   * 37. Share a message externally (Twitter, etc.) — front‑end placeholder
   */
  static shareMessageExternally(chatId, messageId, platform) {
    try {
      const { chatId: cid, messageId: mid, platform: plt } = Formatting.sanitizeValidate({
        chatId:     { value: chatId,     type: 'string', required: true },
        messageId:  { value: messageId,  type: 'string', required: true },
        platform:   { value: platform,   type: 'string', required: true }
      });
      // Placeholder: invoke external share integration, e.g. SocialAPI.share(mid, plt);
      Logger.writeLog({
        flag: 'info',
        action: 'shareMessageExternally',
        message: `Shared message ${mid} from chat ${cid} to ${plt}`
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('shareMessageExternally failed', { error: err.message, chatId, messageId, platform });
      Logger.writeLog({
        flag: 'system_error',
        action: 'shareMessageExternally',
        message: err.message,
        critical: false,
        data: { chatId, messageId, platform }
      });
      return false;
    }
  }

  /**
   * 38. Send paid media (image/audio/video) with pay-to-view gating
   */
  static async sendPaidMedia(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = Formatting.sanitizeValidate({
        chatId:  { value: chatId,  type: 'string', required: true },
        payload: { value: payload, type: 'object', required: true }
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmssSSS')}`;
      const timestamp = DateTime.now('number');
      const item = {
        chat_id:      cid,
        message_id:   messageId,
        message_ts:   timestamp,
        content_type: 'paid_media',
        content:      pl,
        pay_to_view:  true,
        reactions:    {},
        created_at:   DateTime.now()
      };
      await ScyllaDb.putItem('chat_messages', item);
      return messageId;
    } catch (err) {
      ErrorHandler.add_error('sendPaidMedia failed', { error: err.message, chatId, payload });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendPaidMedia',
        message: err.message,
        critical: true,
        data: { chatId, payload }
      });
      return null;
    }
  }

  /**
   * 39. Update chat access level (free, premium, private)
   */
  static async updateChatAccess(chatId, accessLevel) {
    try {
      const { chatId: cid, accessLevel: lvl } = Formatting.sanitizeValidate({
        chatId:      { value: chatId,      type: 'string', required: true },
        accessLevel: { value: accessLevel, type: 'string', required: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chats',
        Key:       { chat_id: cid },
        UpdateExpression: 'SET access_level = :lvl',
        ExpressionAttributeValues: { ':lvl': lvl }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('updateChatAccess failed', { error: err.message, chatId, accessLevel });
      Logger.writeLog({
        flag: 'system_error',
        action: 'updateChatAccess',
        message: err.message,
        critical: false,
        data: { chatId, accessLevel }
      });
      return false;
    }
  }
  
   /**
   * 40. Create a pay‑per‑event chat
   */
  static async createEventChat(params) {
    try {
      const {
        createdBy,
        participants,
        eventId,
        eventPrice,
        name,
        description
      } = Formatting.sanitizeValidate({
        createdBy:    { value: params.createdBy,    type: 'string', required: true },
        participants: { value: params.participants, type: 'array',  required: true },
        eventId:      { value: params.eventId,      type: 'string', required: true },
        eventPrice:   { value: params.eventPrice,   type: 'number', required: true },
        name:         { value: params.name,         type: 'string', required: false, default: null },
        description:  { value: params.description,  type: 'string', required: false, default: null }
      });
      const chatId = `chat#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmss')}`;
      const item = {
        chat_id:        chatId,
        is_group:       true,
        created_by:     createdBy,
        participants,
        name,
        description,
        event_id:       eventId,
        event_price:    eventPrice,
        access_level:   'pay-per-event',
        created_at:     DateTime.now()
      };
      await ScyllaDb.putItem('chats', item);
      return chatId;
    } catch (err) {
      ErrorHandler.add_error('createEventChat failed', { error: err.message, params });
      Logger.writeLog({
        flag: 'system_error',
        action: 'createEventChat',
        message: err.message,
        critical: true,
        data: { params }
      });
      return null;
    }
  }

  /**
   * 41. Update membership tiers for a chat
   */
  static async updateMembershipTiers(chatId, tiers) {
    try {
      const { chatId: cid, tiers: t } = Formatting.sanitizeValidate({
        chatId: { value: chatId, type: 'string', required: true },
        tiers:  { value: tiers,  type: 'array',  required: true }
      });
      await ScyllaDb.updateItem({
        TableName: 'chats',
        Key:       { chat_id: cid },
        UpdateExpression: 'SET membership_tiers = :tiers',
        ExpressionAttributeValues: { ':tiers': t }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('updateMembershipTiers failed', { error: err.message, chatId, tiers });
      Logger.writeLog({
        flag: 'system_error',
        action: 'updateMembershipTiers',
        message: err.message,
        critical: false,
        data: { chatId, tiers }
      });
      return false;
    }
  }

  /**
   * 42. Send exclusive content message
   */
  static async sendExclusiveContent(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = Formatting.sanitizeValidate({
        chatId:  { value: chatId,  type: 'string', required: true },
        payload: { value: payload, type: 'object', required: true }
      });
      const messageId = `msg#${DateTime.generateRelativeTimestamp('yyyyMMddHHmmssSSS')}`;
      const timestamp = DateTime.now('number');
      const item = {
        chat_id:        cid,
        message_id:     messageId,
        message_ts:     timestamp,
        content_type:   'exclusive',
        content:        pl,
        content_flag:   'exclusive',
        reactions:      {},
        created_at:     DateTime.now()
      };
      await ScyllaDb.putItem('chat_messages', item);
      return messageId;
    } catch (err) {
      ErrorHandler.add_error('sendExclusiveContent failed', { error: err.message, chatId, payload });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendExclusiveContent',
        message: err.message,
        critical: true,
        data: { chatId, payload }
      });
      return null;
    }
  }



   /**
   * 43. Start trial access for a user in a chat
   */
  static async startChatTrial(userId, chatId, trialDays = 7) {
    try {
      const { userId: uid, chatId: cid, trialDays: days } = Formatting.sanitizeValidate({
        userId:    { value: userId,    type: 'string', required: true },
        chatId:    { value: chatId,    type: 'string', required: true },
        trialDays: { value: trialDays, type: 'number', required: false, default: 7 }
      });
      // Calculate expiry timestamp (ms)
      const nowNum = DateTime.now('number');
      const expiry = nowNum + days * 24 * 60 * 60 * 1000;
      // Fetch existing userSettings
      const getRes = await ScyllaDb.getItem({
        TableName: 'userSettings',
        Key:       { user_id: uid }
      });
      const trials = getRes.Item?.trial_access || {};
      trials[cid] = expiry;
      await ScyllaDb.updateItem({
        TableName: 'userSettings',
        Key:       { user_id: uid },
        UpdateExpression: 'SET trial_access = :t',
        ExpressionAttributeValues: { ':t': trials }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('startChatTrial failed', { error: err.message, userId, chatId, trialDays });
      Logger.writeLog({
        flag: 'system_error',
        action: 'startChatTrial',
        message: err.message,
        critical: false,
        data: { userId, chatId, trialDays }
      });
      return false;
    }
  }

  /**
   * 44. Render a chat item (front‑end placeholder)
   */
  static renderChatItem(chatData) {
    // Front‑end only; placeholder for UI component
    Logger.writeLog({
      flag: 'info',
      action: 'renderChatItem',
      message: `Rendering chat item for chat ${chatData.chat_id}`
    });
    // e.g., return <ChatItem {...chatData} />;
    return null;
  }

  /**
   * 45. Render chat sidebar (front‑end placeholder)
   */
  static renderChatSidebar(sidebarConfig) {
    // Front‑end only; placeholder for UI component
    Logger.writeLog({
      flag: 'info',
      action: 'renderChatSidebar',
      message: 'Rendering chat sidebar'
    });
    // e.g., return <ChatSidebar config={sidebarConfig} />;
    return null;
  }

 /**
   * 46. Render a list of message items (front‑end placeholder)
   */
  static renderMessageItems(messages) {
    // Front‑end only; placeholder for UI component
    Logger.writeLog({
      flag: 'info',
      action: 'renderMessageItems',
      message: `Rendering ${messages.length} messages`
    });
    // e.g., return messages.map(msg => <MessageItem key={msg.message_id} {...msg} />);
    return null;
  }

  /**
   * 47. Render a single chat message item (front‑end placeholder)
   */
  static renderChatMessageItem(message) {
    // Front‑end only; placeholder for UI component
    Logger.writeLog({
      flag: 'info',
      action: 'renderChatMessageItem',
      message: `Rendering message ${message.message_id}`
    });
    // e.g., return <ChatMessageItem {...message} />;
    return null;
  }

  /**
   * 48. Parse a chat message payload into displayable form
   */
  static parseChatMessage(payload) {
    try {
      const { content_type: type, content } = Formatting.sanitizeValidate({
        content_type: { value: payload.content_type, type: 'string', required: true },
        content:      { value: payload.content,      type: 'object', required: true }
      });
      switch (type) {
        case 'text':
          return content.text || '';
        case 'mixed':
          return (content.elements || []).map(el => el.text || '').join(' ');
        case 'voice':
          return `[Audio] ${content.media_url}`;
        case 'product_recommendation':
          return `[Product] ${content.product_recommendation.name}`;
        case 'exclusive':
          return `[Exclusive] ${JSON.stringify(content)}`;
        case 'paid_media':
          return `[Paid Media] ${JSON.stringify(content)}`;
        default:
          return JSON.stringify(content);
      }
    } catch (err) {
      Logger.writeLog({
        flag: 'system_error',
        action: 'parseChatMessage',
        message: err.message
      });
      return '';
    }
  }

 /**
   * 49. Show an error message in the chat UI (front‑end placeholder)
   */
  static showChatErrorMessage(chatId, error) {
    // Front‑end only; display error in UI
    const { chatId: cid, error: errMsg } = Formatting.sanitizeValidate({
      chatId: { value: chatId, type: 'string', required: true },
      error:  { value: error,  type: 'string', required: true }
    });
    Logger.writeLog({
      flag: 'error',
      action: 'showChatErrorMessage',
      message: `Chat ${cid} error: ${errMsg}`
    });
    // e.g., UI.showError(chatId, error);
    return null;
  }

  /**
   * 50. Store a chat message (alias for sendMessage)
   */
  static async storeChatMessage(chatId, payload) {
    try {
      const { chatId: cid, payload: pl } = Formatting.sanitizeValidate({
        chatId:  { value: chatId,  type: 'string', required: true },
        payload: { value: payload, type: 'object', required: true }
      });
      // Delegate to sendMessage to handle storage
      return await this.sendMessage(cid, pl);
    } catch (err) {
      ErrorHandler.add_error('storeChatMessage failed', { error: err.message, chatId, payload });
      Logger.writeLog({
        flag: 'system_error',
        action: 'storeChatMessage',
        message: err.message,
        critical: false,
        data: { chatId, payload }
      });
      return null;
    }
  }

  /**
   * 51. Set a chat item active in the UI (front‑end placeholder)
   */
  static setChatItemActive(chatId) {
    // Front‑end only; highlight/select the given chat
    const { chatId: cid } = Formatting.sanitizeValidate({
      chatId: { value: chatId, type: 'string', required: true }
    });
    Logger.writeLog({
      flag: 'info',
      action: 'setChatItemActive',
      message: `Chat ${cid} set active`
    });
    // e.g., UI.selectChat(chatId);
    return true;
  }
  /**
   * 52. Cache chat data in Redis (placeholder)
   */
  static async cacheChatData(chatId, data) {
    try {
      const { chatId: cid, data: payload } = Formatting.sanitizeValidate({
        chatId: { value: chatId, type: 'string', required: true },
        data:   { value: data,   type: 'object', required: true }
      });
      // Placeholder: write to Redis
      // e.g., await Redis.set(`chat:${cid}:cache`, JSON.stringify(payload));
      Logger.writeLog({
        flag: 'info',
        action: 'cacheChatData',
        message: `Cached data for chat ${cid}`,
        data: payload
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('cacheChatData failed', { error: err.message, chatId, data });
      Logger.writeLog({
        flag: 'system_error',
        action: 'cacheChatData',
        message: err.message,
        critical: false,
        data: { chatId, data }
      });
      return false;
    }
  }

  /**
   * 53. Subscribe to typing indicators (placeholder)
   */
  static subscribeToTyping(chatId, handler) {
    try {
      const { chatId: cid, handler: cb } = Formatting.sanitizeValidate({
        chatId:  { value: chatId,  type: 'string', required: true },
        handler: { value: handler, type: 'object', required: true } // expecting a function
      });
      // Placeholder: subscribe to Redis pub/sub or WebSocket channel
      // e.g., Redis.subscribe(`chat:${cid}:typing`, msg => cb(JSON.parse(msg)));
      Logger.writeLog({
        flag: 'info',
        action: 'subscribeToTyping',
        message: `Subscribed to typing for chat ${cid}`
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('subscribeToTyping failed', { error: err.message, chatId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'subscribeToTyping',
        message: err.message,
        critical: false,
        data: { chatId }
      });
      return false;
    }
  }

  /**
   * 54. Initialize WebSocket connection for real‑time events (placeholder)
   */
  static initWebSocket(wsUrl) {
    try {
      const { wsUrl: url } = Formatting.sanitizeValidate({
        wsUrl: { value: wsUrl, type: 'string', required: true }
      });
      // Placeholder: connect to WebSocket
      // const socket = new WebSocket(url);
      // socket.onopen    = () => Logger.writeLog({ flag:'info', action:'initWebSocket', message:'WebSocket connected' });
      // socket.onmessage = evt => handleIncomingMessage(JSON.parse(evt.data));
      Logger.writeLog({
        flag: 'info',
        action: 'initWebSocket',
        message: `Initialized WebSocket at ${url}`
      });
      return null; // return socket if implemented
    } catch (err) {
      Logger.writeLog({
        flag: 'system_error',
        action: 'initWebSocket',
        message: err.message
      });
      return null;
    }
  }
  export default class ChatManager {
  /**
   * 55. Handle incoming WebSocket message (placeholder)
   */
  static handleIncomingMessage(rawEvent) {
    try {
      const { rawEvent: evt } = Formatting.sanitizeValidate({
        rawEvent: { value: rawEvent, type: 'string', required: true }
      });
      const data = JSON.parse(evt);
      Logger.writeLog({
        flag: 'info',
        action: 'handleIncomingMessage',
        message: 'Received event',
        data
      });
      return data;
    } catch (err) {
      Logger.writeLog({
        flag: 'system_error',
        action: 'handleIncomingMessage',
        message: err.message
      });
      return null;
    }
  }

  /**
   * 56. Send fallback notification via email/push (placeholder)
   */
  static async sendFallbackNotification(chatId, messageId, userId, channels) {
    try {
      const { chatId: cid, messageId: mid, userId: uid, channels: ch } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true },
        userId:    { value: userId,    type: 'string', required: true },
        channels:  { value: channels,  type: 'array',  required: true }
      });
      // Placeholder: loop channels and send notifications
      for (const channel of ch) {
        // e.g., if (channel === 'email') NotificationService.email(uid, mid);
      }
      Logger.writeLog({
        flag: 'info',
        action: 'sendFallbackNotification',
        message: `Sent fallback notifications via ${JSON.stringify(ch)}`,
        data: { chatId: cid, messageId: mid, userId: uid }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('sendFallbackNotification failed', { error: err.message, chatId, messageId, userId, channels });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendFallbackNotification',
        message: err.message,
        critical: false,
        data: { chatId, messageId, userId, channels }
      });
      return false;
    }
  }

  /**
   * 57. Deliver batch messages to a chat (placeholder for large groups)
   */
  static async deliverBatchMessages(chatId, messages) {
    try {
      const { chatId: cid, messages: msgs } = Formatting.sanitizeValidate({
        chatId:   { value: chatId,   type: 'string', required: true },
        messages: { value: messages, type: 'array',  required: true }
      });
      // Placeholder: chunk messages and send via WebSocket or push
      // e.g., const chunks = chunkArray(msgs, 50);
      // for (const chunk of chunks) WebSocket.publish(`chat:${cid}`, chunk);
      Logger.writeLog({
        flag: 'info',
        action: 'deliverBatchMessages',
        message: `Delivered ${msgs.length} messages in batch to chat ${cid}`
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('deliverBatchMessages failed', { error: err.message, chatId, messages });
      Logger.writeLog({
        flag: 'system_error',
        action: 'deliverBatchMessages',
        message: err.message,
        critical: false,
        data: { chatId, messages }
      });
      return false;
    }
  }
}


/**
   * 58. Send a real‑time notification via WebSocket/Redis pub‑sub
   */
  static sendWebSocketNotification(chatId, message) {
    try {
      const { chatId: cid, message: msg } = Formatting.sanitizeValidate({
        chatId:  { value: chatId,  type: 'string', required: true },
        message: { value: message, type: 'object', required: true }
      });
      // Placeholder: publish to WebSocket or Redis channel
      // e.g., WebSocket.publish(`chat:${cid}`, msg);
      Logger.writeLog({
        flag: 'info',
        action: 'sendWebSocketNotification',
        message: `Published WS notification for chat ${cid}`,
        data: msg
      });
      return true;
    } catch (err) {
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendWebSocketNotification',
        message: err.message
      });
      return false;
    }
  }

  /**
   * 59. Send an email notification for a new message
   */
  static async sendEmailNotification(chatId, messageId, userId) {
    try {
      const { chatId: cid, messageId: mid, userId: uid } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true },
        userId:    { value: userId,    type: 'string', required: true }
      });
      // Placeholder: send email via your email service
      // e.g., await EmailService.sendNewMessageAlert(uid, cid, mid);
      Logger.writeLog({
        flag: 'info',
        action: 'sendEmailNotification',
        message: `Email notification sent to user ${uid} for message ${mid} in chat ${cid}`
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('sendEmailNotification failed', { error: err.message, chatId, messageId, userId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendEmailNotification',
        message: err.message,
        critical: false,
        data: { chatId, messageId, userId }
      });
      return false;
    }
  }

  /**
   * 60. Send a push notification for a new message
   */
  static async sendPushNotification(chatId, messageId, userId) {
    try {
      const { chatId: cid, messageId: mid, userId: uid } = Formatting.sanitizeValidate({
        chatId:    { value: chatId,    type: 'string', required: true },
        messageId: { value: messageId, type: 'string', required: true },
        userId:    { value: userId,    type: 'string', required: true }
      });
      // Placeholder: send push via your push service
      // e.g., await PushService.sendNotification(uid, { chatId: cid, messageId: mid });
      Logger.writeLog({
        flag: 'info',
        action: 'sendPushNotification',
        message: `Push notification sent to user ${uid} for message ${mid} in chat ${cid}`
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('sendPushNotification failed', { error: err.message, chatId, messageId, userId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'sendPushNotification',
        message: err.message,
        critical: false,
        data: { chatId, messageId, userId }
      });
      return false;
    }
  }


/**
   * 61. User joins a chat
   */
  static async joinChat(chatId, userId) {
    try {
      const { chatId: cid, userId: uid } = Formatting.sanitizeValidate({
        chatId: { value: chatId, type: 'string', required: true },
        userId: { value: userId, type: 'string', required: true }
      });
      // Fetch current participants
      const res = await ScyllaDb.getItem({
        TableName: 'chats',
        Key: { chat_id: cid }
      });
      const participants = Array.isArray(res.Item?.participants)
        ? res.Item.participants.slice()
        : [];
      if (!participants.includes(uid)) {
        participants.push(uid);
        await ScyllaDb.updateItem({
          TableName: 'chats',
          Key: { chat_id: cid },
          UpdateExpression: 'SET participants = :p',
          ExpressionAttributeValues: { ':p': participants }
        });
      }
      return true;
    } catch (err) {
      ErrorHandler.add_error('joinChat failed', { error: err.message, chatId, userId });
      Logger.writeLog({
        flag: 'system_error',
        action: 'joinChat',
        message: err.message,
        critical: false,
        data: { chatId, userId }
      });
      return false;
    }
  }

  /**
   * 62. Upgrade a user’s membership tier in a chat
   */
  static async upgradeMembership(userId, chatId, newTier) {
    try {
      const { userId: uid, chatId: cid, newTier: tier } = Formatting.sanitizeValidate({
        userId:   { value: userId,   type: 'string', required: true },
        chatId:   { value: chatId,   type: 'string', required: true },
        newTier:  { value: newTier,  type: 'string', required: true }
      });
      // Fetch existing membership info
      const res = await ScyllaDb.getItem({
        TableName: 'userSettings',
        Key: { user_id: uid }
      });
      const memberships = res.Item?.memberships || {};
      memberships[cid] = tier;
      await ScyllaDb.updateItem({
        TableName: 'userSettings',
        Key: { user_id: uid },
        UpdateExpression: 'SET memberships = :m',
        ExpressionAttributeValues: { ':m': memberships }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('upgradeMembership failed', { error: err.message, userId, chatId, newTier });
      Logger.writeLog({
        flag: 'system_error',
        action: 'upgradeMembership',
        message: err.message,
        critical: false,
        data: { userId, chatId, newTier }
      });
      return false;
    }
  }

  /**
   * 63. Process payment for an event chat (placeholder external)
   */
  static async processEventPayment(chatId, userId, paymentDetails) {
    try {
      const { chatId: cid, userId: uid, paymentDetails: pd } = Formatting.sanitizeValidate({
        chatId:         { value: chatId,         type: 'string', required: true },
        userId:         { value: userId,         type: 'string', required: true },
        paymentDetails: { value: paymentDetails, type: 'object', required: true }
      });
      // Placeholder: call external payment system
      // e.g., await PaymentGateway.charge(uid, pd);
      Logger.writeLog({
        flag: 'info',
        action: 'processEventPayment',
        message: `Processed event payment for user ${uid} in chat ${cid}`,
        data: { paymentDetails: pd }
      });
      return true;
    } catch (err) {
      ErrorHandler.add_error('processEventPayment failed', { error: err.message, chatId, userId, paymentDetails });
      Logger.writeLog({
        flag: 'system_error',
        action: 'processEventPayment',
        message: err.message,
        critical: true,
        data: { chatId, userId, paymentDetails }
      });
      return false;
    }
  }



  }

  

  



































































  
}
