require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Route modules
const reposRoutes = require('./routes/repos');
const issuesRoutes = require('./routes/issues');
const scanRoutes = require('./routes/scan');

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, same-origin server requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Product Orchestrator API is running' });
});

// Mount route modules
app.use('/api', reposRoutes);
app.use('/api', issuesRoutes);
app.use('/api', scanRoutes);

app.listen(port, () => {
  console.log(`Product Orchestrator API running on port ${port}`);
  console.log(`Visit http://localhost:${port}/api/health to check status`);
});
