const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { promisePool } = require('../config/db');

// Import event handlers
const chatHandlers = require('./handlers/chatHandlers');
const agentHandlers = require('./handlers/agentHandlers');
const ticketHandlers = require('./handlers/ticketHandlers');

// Track active socket connections
const activeConnections = new Map(); // userId -> Set of socketIds

/**
 * Initialize Socket.io server with authentication and event handlers
 * @param {http.Server} server - HTTP server instance
 * @returns {SocketIO.Server} - Socket.io server instance
 */
function initializeSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Make io globally accessible for emitting events from REST API
  global.io = io;

  // JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      // Extract token from handshake (query or auth)
      const token =
        socket.handshake.auth.token ||
        socket.handshake.query.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, jwtConfig.accessSecret);

      // Check if user exists and session is valid
      const [rows] = await promisePool.query(
        'SELECT uuid, email, role_id, status, session_id FROM users WHERE uuid = ? AND is_deleted = 0',
        [decoded.uuid]
      );

      if (rows.length === 0) {
        return next(new Error('Authentication error: User not found'));
      }

      if (rows[0].session_id !== decoded.session_id) {
        return next(new Error('Authentication error: Session expired'));
      }

      if (rows[0].status !== 'active') {
        return next(new Error('Authentication error: User account is not active'));
      }

      // Attach user info to socket
      socket.user = rows[0];
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired'));
      }
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user.uuid;
    const userEmail = socket.user.email;
    const roleId = socket.user.role_id;

    console.log(`✅ User connected: ${userEmail} (${userId}) - Socket ID: ${socket.id}`);

    // Track active connection
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId).add(socket.id);

    // Join user to their personal room for targeted notifications
    socket.join(`user:${userId}`);

    // If user is admin/support agent (role_id 3 or 4), handle agent-specific logic
    if ([3, 4].includes(roleId)) {
      socket.join('agents'); // Join agents room for broadcast
      agentHandlers.handleAgentOnline(socket, io);
    }

    // Register event handlers
    chatHandlers.registerChatHandlers(socket, io);
    agentHandlers.registerAgentHandlers(socket, io);
    ticketHandlers.registerTicketHandlers(socket, io);

    // Disconnection handler
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${userEmail} (${userId}) - Reason: ${reason}`);

      // Remove from active connections
      const userSockets = activeConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeConnections.delete(userId);

          // If admin/agent, mark as offline if no other connections
          if ([3, 4].includes(roleId)) {
            agentHandlers.handleAgentOffline(userId, io);
          }
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userEmail}:`, error);
    });
  });

  // Log total connections periodically
  setInterval(() => {
    const totalUsers = activeConnections.size;
    const totalSockets = Array.from(activeConnections.values()).reduce(
      (sum, sockets) => sum + sockets.size,
      0
    );
    console.log(`📊 Active connections: ${totalUsers} users, ${totalSockets} sockets`);
  }, 300000); // Every 5 minutes

  return io;
}

/**
 * Get active socket connections for a user
 * @param {string} userId - User UUID
 * @returns {Set<string>} - Set of socket IDs
 */
function getUserSockets(userId) {
  return activeConnections.get(userId) || new Set();
}

/**
 * Check if user is currently connected
 * @param {string} userId - User UUID
 * @returns {boolean}
 */
function isUserOnline(userId) {
  return activeConnections.has(userId) && activeConnections.get(userId).size > 0;
}

module.exports = {
  initializeSocketIO,
  getUserSockets,
  isUserOnline,
};
