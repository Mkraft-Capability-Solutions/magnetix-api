const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan'); // Added for request logging
const rateLimit = require('express-rate-limit'); // Added for rate limiting
const helmet = require('helmet'); // Added for security headers
const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Parsing
app.use(bodyParser.json()); 
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));

// Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  const fs = require('fs');
  const path = require('path');
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to LMS API',
    version: '1.0.0',
    documentation: '/api-docs' // Would link to your API docs
  });
});

// Import routes
const authRoutes = require('./routes/auth_routes');
const protectedRoutes = require('./routes/protected_routes');
const userRoutes = require('./routes/user_routes');

// Apply routes with rate limiting
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/users', userRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false,
    message: 'Resource not found' 
  });
});



console.log('Registered routes:');
app._router.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
  } else if (layer.name === 'router') { // Handle mounted routers (like /api/users)
    layer.handle.stack.forEach((sublayer) => {
      if (sublayer.route) {
        const methods = Object.keys(sublayer.route.methods).map(m => m.toUpperCase());
        console.log(`${methods} ${layer.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', '')}${sublayer.route.path}`);
      }
    });
  }

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;