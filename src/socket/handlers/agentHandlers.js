const { promisePool } = require('../../config/db');

/**
 * Register all agent-related event handlers
 */
function registerAgentHandlers(socket, io) {
  // Only register agent handlers for admin/support agents
  if ([3, 4].includes(socket.user.role_id)) {
    socket.on('agent:accept_chat', (data, callback) =>
      handleAcceptChat(socket, io, data, callback)
    );
    socket.on('agent:change_status', (data, callback) =>
      handleChangeStatus(socket, io, data, callback)
    );
    socket.on('agent:get_pending_chats', (callback) =>
      handleGetPendingChats(socket, io, callback)
    );
    socket.on('agent:get_active_chats', (callback) =>
      handleGetActiveChats(socket, io, callback)
    );
  }
}

/**
 * Handle agent accepting a pending chat
 */
async function handleAcceptChat(socket, io, data, callback) {
  const { conversationId } = data;
  const agentId = socket.user.uuid;

  try {
    // Verify agent is available and not at max capacity
    const [agentStatus] = await promisePool.query(
      `SELECT current_active_chats, max_concurrent_chats, status
       FROM support_agent_status
       WHERE agent_id = ?`,
      [agentId]
    );

    if (agentStatus.length === 0) {
      return callback({ success: false, message: 'Agent status not found' });
    }

    if (agentStatus[0].status === 'offline' || agentStatus[0].status === 'away') {
      return callback({ success: false, message: 'Agent is not available' });
    }

    if (agentStatus[0].current_active_chats >= agentStatus[0].max_concurrent_chats) {
      return callback({ success: false, message: 'Agent has reached maximum concurrent chats' });
    }

    // Check if conversation is still waiting
    const [conversations] = await promisePool.query(
      `SELECT status, assigned_agent_id FROM support_conversations WHERE conversation_id = ?`,
      [conversationId]
    );

    if (conversations.length === 0) {
      return callback({ success: false, message: 'Conversation not found' });
    }

    if (conversations[0].status !== 'waiting') {
      return callback({
        success: false,
        message: 'Conversation is no longer waiting (already assigned or closed)',
      });
    }

    // Assign agent to conversation and change status to active
    await promisePool.query(
      `UPDATE support_conversations
       SET assigned_agent_id = ?, status = 'active'
       WHERE conversation_id = ? AND status = 'waiting'`,
      [agentId, conversationId]
    );

    // Increment agent's active chat count
    await promisePool.query(
      `UPDATE support_agent_status
       SET current_active_chats = current_active_chats + 1
       WHERE agent_id = ?`,
      [agentId]
    );

    // Join agent to conversation room
    socket.join(`conversation:${conversationId}`);

    // Get user info for this conversation
    const [userInfo] = await promisePool.query(
      `SELECT c.user_id, u.email
       FROM support_conversations c
       JOIN users u ON c.user_id = u.uuid
       WHERE c.conversation_id = ?`,
      [conversationId]
    );

    // Notify user that agent has joined
    io.to(`conversation:${conversationId}`).emit('chat:agent_joined', {
      conversationId,
      agent: {
        uuid: socket.user.uuid,
        email: socket.user.email,
      },
      timestamp: new Date(),
    });

    // Notify other agents that this chat was accepted
    io.to('agents').emit('chat:request_accepted', {
      conversationId,
      acceptedBy: {
        uuid: socket.user.uuid,
        email: socket.user.email,
      },
    });

    console.log(
      `✅ Agent ${socket.user.email} accepted chat ${conversationId} from ${userInfo[0].email}`
    );

    callback({ success: true, conversationId });
  } catch (error) {
    console.error('Error in agent:accept_chat:', error);
    callback({ success: false, message: 'Failed to accept chat' });
  }
}

/**
 * Handle agent changing their availability status
 */
async function handleChangeStatus(socket, io, data, callback) {
  const { status } = data;
  const agentId = socket.user.uuid;

  try {
    // Validate status
    const validStatuses = ['available', 'busy', 'away', 'offline'];
    if (!validStatuses.includes(status)) {
      return callback({ success: false, message: 'Invalid status' });
    }

    // Update agent status
    await promisePool.query(
      `UPDATE support_agent_status
       SET status = ?, is_online = ?, last_seen = NOW()
       WHERE agent_id = ?`,
      [status, status !== 'offline', agentId]
    );

    // Broadcast status change to all agents
    io.to('agents').emit('agent:status_change', {
      agentId,
      email: socket.user.email,
      isOnline: status !== 'offline',
      status,
      timestamp: new Date(),
    });

    console.log(`🔄 Agent ${socket.user.email} changed status to ${status}`);

    callback({ success: true });
  } catch (error) {
    console.error('Error in agent:change_status:', error);
    callback({ success: false, message: 'Failed to change status' });
  }
}

/**
 * Handle getting pending chats (waiting for assignment)
 */
async function handleGetPendingChats(socket, io, callback) {
  try {
    const [pendingChats] = await promisePool.query(
      `SELECT
        c.conversation_id, c.user_id, c.started_at,
        u.email as user_email,
        (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.conversation_id) as message_count
       FROM support_conversations c
       JOIN users u ON c.user_id = u.uuid
       WHERE c.status = 'waiting'
       ORDER BY c.started_at ASC`
    );

    callback({
      success: true,
      conversations: pendingChats.map((chat) => ({
        conversationId: chat.conversation_id,
        user: {
          uuid: chat.user_id,
          email: chat.user_email,
        },
        startedAt: chat.started_at,
        messageCount: chat.message_count,
      })),
    });
  } catch (error) {
    console.error('Error in agent:get_pending_chats:', error);
    callback({ success: false, message: 'Failed to get pending chats' });
  }
}

/**
 * Handle getting agent's active chats
 */
async function handleGetActiveChats(socket, io, callback) {
  const agentId = socket.user.uuid;

  try {
    const [activeChats] = await promisePool.query(
      `SELECT
        c.conversation_id, c.user_id, c.started_at, c.last_message_at,
        u.email as user_email,
        (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.conversation_id AND is_read = FALSE AND sender_id != ?) as unread_count,
        (SELECT content FROM support_messages WHERE conversation_id = c.conversation_id ORDER BY sent_at DESC LIMIT 1) as last_message
       FROM support_conversations c
       JOIN users u ON c.user_id = u.uuid
       WHERE c.assigned_agent_id = ? AND c.status = 'active'
       ORDER BY c.last_message_at DESC`,
      [agentId, agentId]
    );

    callback({
      success: true,
      conversations: activeChats.map((chat) => ({
        conversationId: chat.conversation_id,
        user: {
          uuid: chat.user_id,
          email: chat.user_email,
        },
        startedAt: chat.started_at,
        lastMessageAt: chat.last_message_at,
        lastMessage: chat.last_message,
        unreadCount: chat.unread_count,
      })),
    });
  } catch (error) {
    console.error('Error in agent:get_active_chats:', error);
    callback({ success: false, message: 'Failed to get active chats' });
  }
}

/**
 * Handle agent coming online (called from socketServer.js)
 */
async function handleAgentOnline(socket, io) {
  const agentId = socket.user.uuid;

  try {
    // Check if agent status record exists
    const [existingStatus] = await promisePool.query(
      `SELECT agent_id FROM support_agent_status WHERE agent_id = ?`,
      [agentId]
    );

    if (existingStatus.length === 0) {
      // Create new status record
      await promisePool.query(
        `INSERT INTO support_agent_status
         (agent_id, is_online, status, current_active_chats, max_concurrent_chats, last_seen)
         VALUES (?, TRUE, 'available', 0, 5, NOW())`,
        [agentId]
      );
    } else {
      // Update existing status
      await promisePool.query(
        `UPDATE support_agent_status
         SET is_online = TRUE, status = 'available', last_seen = NOW()
         WHERE agent_id = ?`,
        [agentId]
      );
    }

    // Join agent's active conversations
    const [activeConversations] = await promisePool.query(
      `SELECT conversation_id FROM support_conversations
       WHERE assigned_agent_id = ? AND status = 'active'`,
      [agentId]
    );

    activeConversations.forEach((conv) => {
      socket.join(`conversation:${conv.conversation_id}`);
    });

    // Broadcast agent online status to all agents
    io.to('agents').emit('agent:status_change', {
      agentId,
      email: socket.user.email,
      isOnline: true,
      status: 'available',
      timestamp: new Date(),
    });

    console.log(`🟢 Agent ${socket.user.email} is now online`);
  } catch (error) {
    console.error('Error in handleAgentOnline:', error);
  }
}

/**
 * Handle agent going offline (called from socketServer.js)
 */
async function handleAgentOffline(agentId, io) {
  try {
    // Update agent status to offline
    await promisePool.query(
      `UPDATE support_agent_status
       SET is_online = FALSE, status = 'offline', last_seen = NOW()
       WHERE agent_id = ?`,
      [agentId]
    );

    // Get agent email for logging
    const [agentInfo] = await promisePool.query(
      `SELECT email FROM users WHERE uuid = ?`,
      [agentId]
    );

    // Broadcast agent offline status to all agents
    io.to('agents').emit('agent:status_change', {
      agentId,
      email: agentInfo[0]?.email,
      isOnline: false,
      status: 'offline',
      timestamp: new Date(),
    });

    console.log(`🔴 Agent ${agentInfo[0]?.email} is now offline`);
  } catch (error) {
    console.error('Error in handleAgentOffline:', error);
  }
}

module.exports = {
  registerAgentHandlers,
  handleAgentOnline,
  handleAgentOffline,
};
