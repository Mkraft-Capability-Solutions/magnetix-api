const { promisePool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

/**
 * Register all chat-related event handlers
 */
function registerChatHandlers(socket, io) {
  socket.on('chat:request', (callback) => handleChatRequest(socket, io, callback));
  socket.on('chat:send_message', (data, callback) =>
    handleSendMessage(socket, io, data, callback)
  );
  socket.on('chat:typing', (data) => handleTypingIndicator(socket, io, data));
  socket.on('chat:upload_file', (data, callback) =>
    handleFileUpload(socket, io, data, callback)
  );
  socket.on('chat:mark_read', (data, callback) => handleMarkRead(socket, io, data, callback));
  socket.on('chat:close', (data, callback) => handleCloseChat(socket, io, data, callback));
  socket.on('chat:get_history', (data, callback) => handleGetHistory(socket, io, data, callback));
}

/**
 * Handle user requesting a new chat session
 */
async function handleChatRequest(socket, io, callback) {
  const userId = socket.user.uuid;

  try {
    // Check if user already has an active or waiting conversation
    const [existingConversations] = await promisePool.query(
      `SELECT conversation_id, status, assigned_agent_id
       FROM support_conversations
       WHERE user_id = ? AND status IN ('waiting', 'active')
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    if (existingConversations.length > 0) {
      const conversation = existingConversations[0];
      // Join conversation room
      socket.join(`conversation:${conversation.conversation_id}`);

      return callback({
        success: true,
        conversationId: conversation.conversation_id,
        status: conversation.status,
        message: 'Rejoined existing conversation',
      });
    }

    // Create new conversation
    const conversationId = uuidv4();

    await promisePool.query(
      `INSERT INTO support_conversations
       (conversation_id, user_id, status, started_at, last_message_at)
       VALUES (?, ?, 'waiting', NOW(), NOW())`,
      [conversationId, userId]
    );

    // Join conversation room
    socket.join(`conversation:${conversationId}`);

    // Notify all agents about new chat request
    io.to('agents').emit('chat:new_request', {
      conversationId,
      user: {
        uuid: socket.user.uuid,
        email: socket.user.email,
      },
      timestamp: new Date(),
    });

    console.log(`💬 New chat requested by ${socket.user.email} - ID: ${conversationId}`);

    callback({
      success: true,
      conversationId,
      status: 'waiting',
      message: 'Chat request created, waiting for agent',
    });
  } catch (error) {
    console.error('Error in chat:request:', error);
    callback({ success: false, message: 'Failed to create chat request' });
  }
}

/**
 * Handle sending a text message
 */
async function handleSendMessage(socket, io, data, callback) {
  const { conversationId, content } = data;
  const userId = socket.user.uuid;
  const senderType = [3, 4].includes(socket.user.role_id) ? 'agent' : 'user';

  try {
    // Verify conversation exists and user has access
    const [conversations] = await promisePool.query(
      `SELECT user_id, assigned_agent_id, status
       FROM support_conversations
       WHERE conversation_id = ?`,
      [conversationId]
    );

    if (conversations.length === 0) {
      return callback({ success: false, message: 'Conversation not found' });
    }

    const conversation = conversations[0];

    // Check authorization
    if (
      conversation.user_id !== userId &&
      conversation.assigned_agent_id !== userId &&
      ![3, 4].includes(socket.user.role_id)
    ) {
      return callback({ success: false, message: 'Not authorized' });
    }

    if (conversation.status === 'closed') {
      return callback({ success: false, message: 'Conversation is closed' });
    }

    // Insert message
    const messageId = uuidv4();
    await promisePool.query(
      `INSERT INTO support_messages
       (message_id, conversation_id, sender_id, sender_type, message_type, content, sent_at)
       VALUES (?, ?, ?, ?, 'text', ?, NOW())`,
      [messageId, conversationId, userId, senderType, content]
    );

    // Update conversation last_message_at
    await promisePool.query(
      `UPDATE support_conversations
       SET last_message_at = NOW()
       WHERE conversation_id = ?`,
      [conversationId]
    );

    // Prepare message object
    const message = {
      messageId,
      conversationId,
      sender: {
        uuid: socket.user.uuid,
        email: socket.user.email,
        role_id: socket.user.role_id,
      },
      senderType,
      messageType: 'text',
      content,
      timestamp: new Date(),
    };

    // Broadcast to conversation room
    io.to(`conversation:${conversationId}`).emit('chat:message', message);

    console.log(`📨 Message sent in conversation ${conversationId} by ${socket.user.email}`);

    callback({ success: true, messageId });
  } catch (error) {
    console.error('Error in chat:send_message:', error);
    callback({ success: false, message: 'Failed to send message' });
  }
}

/**
 * Handle typing indicator
 */
async function handleTypingIndicator(socket, io, data) {
  const { conversationId, isTyping } = data;
  const userId = socket.user.uuid;

  try {
    // Verify access to conversation
    const [conversations] = await promisePool.query(
      `SELECT user_id, assigned_agent_id FROM support_conversations WHERE conversation_id = ?`,
      [conversationId]
    );

    if (conversations.length === 0) return;

    const conversation = conversations[0];
    if (
      conversation.user_id !== userId &&
      conversation.assigned_agent_id !== userId &&
      ![3, 4].includes(socket.user.role_id)
    ) {
      return;
    }

    // Broadcast typing indicator to others in conversation (exclude sender)
    socket.to(`conversation:${conversationId}`).emit('chat:typing_indicator', {
      conversationId,
      user: {
        uuid: socket.user.uuid,
        email: socket.user.email,
      },
      isTyping,
    });
  } catch (error) {
    console.error('Error in chat:typing:', error);
  }
}

/**
 * Handle file upload
 */
async function handleFileUpload(socket, io, data, callback) {
  const { conversationId, file, fileName, fileType, fileSize } = data;
  const userId = socket.user.uuid;
  const senderType = [3, 4].includes(socket.user.role_id) ? 'agent' : 'user';

  try {
    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return callback({ success: false, message: 'File size exceeds 10MB limit' });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(fileType)) {
      return callback({ success: false, message: 'File type not allowed' });
    }

    // Verify conversation access
    const [conversations] = await promisePool.query(
      `SELECT user_id, assigned_agent_id, status FROM support_conversations WHERE conversation_id = ?`,
      [conversationId]
    );

    if (conversations.length === 0) {
      return callback({ success: false, message: 'Conversation not found' });
    }

    const conversation = conversations[0];
    if (
      conversation.user_id !== userId &&
      conversation.assigned_agent_id !== userId &&
      ![3, 4].includes(socket.user.role_id)
    ) {
      return callback({ success: false, message: 'Not authorized' });
    }

    if (conversation.status === 'closed') {
      return callback({ success: false, message: 'Conversation is closed' });
    }

    // Create upload directory if not exists
    const uploadDir = path.join(__dirname, '../../../uploads/support/files');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    // Convert base64 to buffer and save
    const fileBuffer = Buffer.from(file.split(',')[1] || file, 'base64');
    await fs.writeFile(filePath, fileBuffer);

    // Save file URL (relative path)
    const fileUrl = `/uploads/support/files/${uniqueFileName}`;

    // Determine message type based on file type
    const messageType = fileType.startsWith('image/') ? 'image' : 'file';

    // Insert message
    const messageId = uuidv4();
    await promisePool.query(
      `INSERT INTO support_messages
       (message_id, conversation_id, sender_id, sender_type, message_type, content, file_url, file_name, file_size, file_type, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [messageId, conversationId, userId, senderType, messageType, null, fileUrl, fileName, fileSize, fileType]
    );

    // Update conversation last_message_at
    await promisePool.query(
      `UPDATE support_conversations SET last_message_at = NOW() WHERE conversation_id = ?`,
      [conversationId]
    );

    // Prepare message object
    const message = {
      messageId,
      conversationId,
      sender: {
        uuid: socket.user.uuid,
        email: socket.user.email,
        role_id: socket.user.role_id,
      },
      senderType,
      messageType,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      timestamp: new Date(),
    };

    // Broadcast to conversation room
    io.to(`conversation:${conversationId}`).emit('chat:message', message);

    console.log(`📎 File uploaded in conversation ${conversationId} by ${socket.user.email}`);

    callback({ success: true, messageId, fileUrl });
  } catch (error) {
    console.error('Error in chat:upload_file:', error);
    callback({ success: false, message: 'Failed to upload file' });
  }
}

/**
 * Handle marking messages as read
 */
async function handleMarkRead(socket, io, data, callback) {
  const { conversationId, messageIds } = data;
  const userId = socket.user.uuid;

  try {
    // Verify conversation access
    const [conversations] = await promisePool.query(
      `SELECT user_id, assigned_agent_id FROM support_conversations WHERE conversation_id = ?`,
      [conversationId]
    );

    if (conversations.length === 0) {
      return callback({ success: false, message: 'Conversation not found' });
    }

    const conversation = conversations[0];
    if (
      conversation.user_id !== userId &&
      conversation.assigned_agent_id !== userId &&
      ![3, 4].includes(socket.user.role_id)
    ) {
      return callback({ success: false, message: 'Not authorized' });
    }

    // Mark messages as read (only messages sent by others)
    await promisePool.query(
      `UPDATE support_messages
       SET is_read = TRUE
       WHERE conversation_id = ?
       AND message_id IN (?)
       AND sender_id != ?`,
      [conversationId, messageIds, userId]
    );

    callback({ success: true });
  } catch (error) {
    console.error('Error in chat:mark_read:', error);
    callback({ success: false, message: 'Failed to mark messages as read' });
  }
}

/**
 * Handle closing a conversation
 */
async function handleCloseChat(socket, io, data, callback) {
  const { conversationId, rating, feedback } = data;
  const userId = socket.user.uuid;

  try {
    // Verify conversation access
    const [conversations] = await promisePool.query(
      `SELECT user_id, assigned_agent_id, status FROM support_conversations WHERE conversation_id = ?`,
      [conversationId]
    );

    if (conversations.length === 0) {
      return callback({ success: false, message: 'Conversation not found' });
    }

    const conversation = conversations[0];
    if (
      conversation.user_id !== userId &&
      conversation.assigned_agent_id !== userId &&
      ![3, 4].includes(socket.user.role_id)
    ) {
      return callback({ success: false, message: 'Not authorized' });
    }

    // Update conversation status
    await promisePool.query(
      `UPDATE support_conversations
       SET status = 'closed', closed_at = NOW(), rating = ?, feedback = ?
       WHERE conversation_id = ?`,
      [rating || null, feedback || null, conversationId]
    );

    // If agent is closing, update their active chat count
    if ([3, 4].includes(socket.user.role_id)) {
      await promisePool.query(
        `UPDATE support_agent_status
         SET current_active_chats = GREATEST(current_active_chats - 1, 0)
         WHERE agent_id = ?`,
        [userId]
      );
    }

    // Broadcast close event to conversation room
    io.to(`conversation:${conversationId}`).emit('chat:closed', {
      conversationId,
      closedBy: {
        uuid: socket.user.uuid,
        email: socket.user.email,
      },
      timestamp: new Date(),
    });

    console.log(`🔒 Conversation ${conversationId} closed by ${socket.user.email}`);

    callback({ success: true });
  } catch (error) {
    console.error('Error in chat:close:', error);
    callback({ success: false, message: 'Failed to close conversation' });
  }
}

/**
 * Handle getting chat history
 */
async function handleGetHistory(socket, io, data, callback) {
  const { conversationId, limit = 50, offset = 0 } = data;
  const userId = socket.user.uuid;

  try {
    // Verify conversation access
    const [conversations] = await promisePool.query(
      `SELECT user_id, assigned_agent_id FROM support_conversations WHERE conversation_id = ?`,
      [conversationId]
    );

    if (conversations.length === 0) {
      return callback({ success: false, message: 'Conversation not found' });
    }

    const conversation = conversations[0];
    if (
      conversation.user_id !== userId &&
      conversation.assigned_agent_id !== userId &&
      ![3, 4].includes(socket.user.role_id)
    ) {
      return callback({ success: false, message: 'Not authorized' });
    }

    // Get messages
    const [messages] = await promisePool.query(
      `SELECT
        m.message_id, m.sender_id, m.sender_type, m.message_type,
        m.content, m.file_url, m.file_name, m.file_size, m.file_type,
        m.is_read, m.sent_at,
        u.email as sender_email, u.role_id as sender_role
       FROM support_messages m
       JOIN users u ON m.sender_id = u.uuid
       WHERE m.conversation_id = ?
       ORDER BY m.sent_at DESC
       LIMIT ? OFFSET ?`,
      [conversationId, limit, offset]
    );

    callback({
      success: true,
      messages: messages.map((msg) => ({
        messageId: msg.message_id,
        sender: {
          uuid: msg.sender_id,
          email: msg.sender_email,
          role_id: msg.sender_role,
        },
        senderType: msg.sender_type,
        messageType: msg.message_type,
        content: msg.content,
        fileUrl: msg.file_url,
        fileName: msg.file_name,
        fileSize: msg.file_size,
        fileType: msg.file_type,
        isRead: msg.is_read,
        timestamp: msg.sent_at,
      })),
    });
  } catch (error) {
    console.error('Error in chat:get_history:', error);
    callback({ success: false, message: 'Failed to get chat history' });
  }
}

module.exports = {
  registerChatHandlers,
};
