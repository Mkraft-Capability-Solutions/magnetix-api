
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Simple route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to LMS API' });
});

// Import routes
const authRoutes = require('./routes/auth_routes');
const protectedRoutes = require('./routes/protected_routes');
const userRoutes = require('./routes/user_routes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/users', userRoutes);

app.use('/uploads', express.static('./uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: err.message || 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;
