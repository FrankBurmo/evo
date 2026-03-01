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

app.use(cors());
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
  res.json({ status: 'ok', message: 'Evo API is running' });
});

// Mount route modules
app.use('/api', reposRoutes);
app.use('/api', issuesRoutes);
app.use('/api', scanRoutes);

app.listen(port, () => {
  console.log(`Evo API running on port ${port}`);
  console.log(`Visit http://localhost:${port}/api/health to check status`);
});
