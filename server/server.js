const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // NEW: For Security Tokens
const rateLimit = require('express-rate-limit'); // NEW: For Brute Force Protection
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = "super_secret_majeng_key_123"; // In production, keep this in .env

// 1. Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Security: Rate Limiting (Block IP after 100 requests in 15 mins)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

// 3. Database Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// 4. File Upload Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/') },
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname) }
});
const upload = multer({ storage: storage });

// --- AUTHENTICATION ROUTES (NEW) ---

// Login Endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // 2. Verify Password (Plain text check as requested)
    // WARNING: In a real production app, use bcrypt here.
    if (password !== user.password_hash) { // Assuming 'password_hash' column holds plain text for now
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Generate Token (JWT Session)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' } // Session expires in 8 hours
    );

    // 4. Log the action
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)', [user.id, 'User Logged In']);

    // 5. Send back token and role
    res.json({ token, role: user.role, username: user.username });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// --- EXISTING DATA ROUTES ---

// File Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const fileUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Policies
app.get('/api/policies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM policies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/policies', async (req, res) => {
  const { name, idNumber, age, smoker, coverage, premium, status, inceptionDate, paidUntil, riskFactor } = req.body;
  const policyNum = `POL-${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const query = `INSERT INTO policies (policy_number, applicant_name, id_number, age, smoker, coverage, premium, risk_factor, status, inception_date, paid_until) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
    const values = [policyNum, name, idNumber, age, smoker, coverage, premium, riskFactor, status, inceptionDate, paidUntil];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.patch('/api/policies/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const keys = Object.keys(updates).filter(k => updates[k] !== undefined);
  if (keys.length === 0) return res.status(400).send("No fields provided");

  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = keys.map(key => updates[key]);
  const query = `UPDATE policies SET ${setClause} WHERE policy_number = $${keys.length + 1} RETURNING *`;
  values.push(id);

  try {
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// Claims
app.get('/api/claims', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM claims ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/claims', async (req, res) => {
  const { policyId, claimant, amount, reason, date, status } = req.body;
  const claimNum = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const query = `INSERT INTO claims (claim_number, policy_id, claimant_name, amount, reason, date_filed, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const values = [claimNum, policyId, claimant, amount, reason, date, status];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.patch('/api/claims/:id', async (req, res) => {
  const { id } = req.params; 
  const { status, settlement_form_url, rejection_reason } = req.body;
  try {
    let query = 'UPDATE claims SET status = $1';
    const values = [status];
    let counter = 2;
    if (settlement_form_url) { query += `, settlement_form_url = $${counter}`; values.push(settlement_form_url); counter++; }
    if (rejection_reason) { query += `, rejection_reason = $${counter}`; values.push(rejection_reason); counter++; }
    query += ` WHERE claim_number = $${counter} RETURNING *`;
    values.push(id);
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/complaints', async (req, res) => {
  const { policyId, customer, subject, priority, status, date } = req.body;
  const ticketNum = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const query = `INSERT INTO complaints (ticket_number, policy_id, customer_name, subject, priority, status, date_logged) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const values = [ticketNum, policyId, customer, subject, priority, status, date];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.patch('/api/complaints/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query('UPDATE complaints SET status = $1 WHERE ticket_number = $2 RETURNING *', [status, id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.listen(port, () => {
  console.log(`Majeng API running on port ${port}`);
});