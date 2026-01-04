const { promisePool } = require('../../config/db');

/**
 * Register all ticket-related event handlers
 */
function registerTicketHandlers(socket, io) {
  socket.on('ticket:subscribe', (data, callback) =>
    handleSubscribeToTicket(socket, io, data, callback)
  );
  socket.on('ticket:unsubscribe', (data, callback) =>
    handleUnsubscribeFromTicket(socket, io, data, callback)
  );
}

/**
 * Handle subscribing to ticket updates
 */
async function handleSubscribeToTicket(socket, io, data, callback) {
  const { ticketId } = data;
  const userId = socket.user.uuid;
  const roleId = socket.user.role_id;

  try {
    // Verify ticket exists and user has access
    const [tickets] = await promisePool.query(
      `SELECT id, ticket_number, user_id, assigned_to, status
       FROM support_tickets
       WHERE id = ?`,
      [ticketId]
    );

    if (tickets.length === 0) {
      return callback({ success: false, message: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Check authorization: user is ticket owner, assigned agent, or admin
    if (
      ticket.user_id !== userId &&
      ticket.assigned_to !== userId &&
      ![3, 4].includes(roleId)
    ) {
      return callback({ success: false, message: 'Not authorized to access this ticket' });
    }

    // Join ticket room for real-time updates
    const roomName = `ticket:${ticketId}`;
    socket.join(roomName);

    console.log(
      `📌 User ${socket.user.email} subscribed to ticket ${ticket.ticket_number} (ID: ${ticketId})`
    );

    callback({ success: true, ticketNumber: ticket.ticket_number });
  } catch (error) {
    console.error('Error in ticket:subscribe:', error);
    callback({ success: false, message: 'Failed to subscribe to ticket' });
  }
}

/**
 * Handle unsubscribing from ticket updates
 */
async function handleUnsubscribeFromTicket(socket, io, data, callback) {
  const { ticketId } = data;

  try {
    const roomName = `ticket:${ticketId}`;
    socket.leave(roomName);

    console.log(`📌 User ${socket.user.email} unsubscribed from ticket ${ticketId}`);

    callback({ success: true });
  } catch (error) {
    console.error('Error in ticket:unsubscribe:', error);
    callback({ success: false, message: 'Failed to unsubscribe from ticket' });
  }
}

/**
 * Emit ticket update to all subscribers
 * This function is called from REST API controllers via global.io
 * @param {number} ticketId - Ticket ID
 * @param {string} updateType - Type of update (status_change, new_reply, assigned, etc.)
 * @param {object} data - Update data
 */
function emitTicketUpdate(ticketId, updateType, data) {
  if (!global.io) {
    console.error('Socket.io not initialized');
    return;
  }

  const roomName = `ticket:${ticketId}`;

  global.io.to(roomName).emit('ticket:update', {
    ticketId,
    updateType,
    data,
    timestamp: new Date(),
  });

  console.log(`📢 Ticket update emitted for ticket ${ticketId}: ${updateType}`);
}

/**
 * Emit new ticket notification to all agents
 * @param {object} ticketData - Ticket information
 */
function emitNewTicketToAgents(ticketData) {
  if (!global.io) {
    console.error('Socket.io not initialized');
    return;
  }

  global.io.to('agents').emit('ticket:new', {
    ticketId: ticketData.id,
    ticketNumber: ticketData.ticket_number,
    subject: ticketData.subject,
    category: ticketData.category,
    priority: ticketData.priority,
    user: ticketData.user,
    timestamp: new Date(),
  });

  console.log(`🎫 New ticket notification sent to agents: ${ticketData.ticket_number}`);
}

module.exports = {
  registerTicketHandlers,
  emitTicketUpdate,
  emitNewTicketToAgents,
};
