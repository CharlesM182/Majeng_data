const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = "super_secret_majeng_key_123"; 

// 1. Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Security: Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 2000, 
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

// --- HELPER: AUDIT LOGGER ---
const logAction = async (userId, action) => {
  if (!userId) return;
  try {
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)', [userId, action]);
  } catch (err) {
    console.error("Audit Log Error:", err.message);
  }
};

// --- AUTHENTICATION ROUTES ---

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    if (password !== user.password_hash) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    
    // Log Login
    await logAction(user.id, 'User Logged In');

    // Return ID so frontend can use it for auditing
    res.json({ token, role: user.role, username: user.username, id: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// --- DATA ROUTES ---

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
  const { 
    name, idNumber, age, smoker, coverage, premium, status, 
    inceptionDate, paidUntil, riskFactor, gender, beneficiary, userId 
  } = req.body;
  
  const policyNum = `POL-${Math.floor(1000 + Math.random() * 9000)}`;
  const benName = beneficiary ? beneficiary.name : null;
  const benId = beneficiary ? beneficiary.id : null;
  const benPhone = beneficiary ? beneficiary.phone : null;
  const benEmail = beneficiary ? beneficiary.email : null;

  try {
    const query = `
      INSERT INTO policies (
        policy_number, applicant_name, id_number, age, smoker, coverage, premium, 
        risk_factor, status, inception_date, paid_until, gender,
        beneficiary_name, beneficiary_id, beneficiary_phone, beneficiary_email
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const values = [
      policyNum, name, idNumber, age, smoker, coverage, premium, 
      riskFactor, status, inceptionDate, paidUntil, gender,
      benName, benId, benPhone, benEmail
    ];
    
    const result = await pool.query(query, values);
    
    // Audit
    await logAction(userId, `Created Policy ${policyNum}`);
    
    res.json(result.rows[0]);
  } catch (err) { 
    console.error(err);
    res.status(500).send(err.message); 
  }
});

app.patch('/api/policies/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  // Separate userId from the SQL updates
  const { userId, ...sqlUpdates } = updates;

  const keys = Object.keys(sqlUpdates).filter(k => sqlUpdates[k] !== undefined);
  if (keys.length === 0) return res.status(400).send("No fields provided");

  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = keys.map(key => sqlUpdates[key]);
  const query = `UPDATE policies SET ${setClause} WHERE policy_number = $${keys.length + 1} RETURNING *`;
  values.push(id);

  try {
    const result = await pool.query(query, values);
    
    // Audit Logic based on what changed
    if (sqlUpdates.status) await logAction(userId, `Policy ${id} status changed to ${sqlUpdates.status}`);
    if (sqlUpdates.paid_until) await logAction(userId, `Policy ${id} payment processed until ${sqlUpdates.paid_until}`);

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
  const { policyId, claimant, amount, reason, date, status, userId } = req.body;
  const claimNum = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const query = `INSERT INTO claims (claim_number, policy_id, claimant_name, amount, reason, date_filed, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const values = [claimNum, policyId, claimant, amount, reason, date, status];
    const result = await pool.query(query, values);
    
    // Audit
    await logAction(userId, `Logged Claim ${claimNum} for Policy ${policyId}`);

    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.patch('/api/claims/:id', async (req, res) => {
  const { id } = req.params; 
  const { status, settlement_form_url, rejection_reason, userId } = req.body;
  try {
    let query = 'UPDATE claims SET status = $1';
    const values = [status];
    let counter = 2;
    if (settlement_form_url) { query += `, settlement_form_url = $${counter}`; values.push(settlement_form_url); counter++; }
    if (rejection_reason) { query += `, rejection_reason = $${counter}`; values.push(rejection_reason); counter++; }
    query += ` WHERE claim_number = $${counter} RETURNING *`;
    values.push(id);
    const result = await pool.query(query, values);

    // Audit
    await logAction(userId, `Claim ${id} ${status}`);

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
  const { policyId, customer, subject, priority, status, date, userId } = req.body;
  const ticketNum = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    const query = `INSERT INTO complaints (ticket_number, policy_id, customer_name, subject, priority, status, date_logged) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const values = [ticketNum, policyId, customer, subject, priority, status, date];
    const result = await pool.query(query, values);

    // Audit (Optional based on request, but good practice)
    await logAction(userId, `Logged Complaint ${ticketNum}`);

    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// UPDATED: Now supports Status AND Comments
app.patch('/api/complaints/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Remove userId from SQL updates if it's passed for audit purposes
  const { userId, ...sqlUpdates } = updates;

  const keys = Object.keys(sqlUpdates).filter(k => sqlUpdates[k] !== undefined);
  if (keys.length === 0) return res.status(400).send("No fields provided");

  // Build dynamic SQL: "UPDATE complaints SET status=$1, comments=$2 WHERE ticket_number=$3"
  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = keys.map(key => sqlUpdates[key]);
  
  // Note: key indexes match values array. The WHERE clause needs the NEXT index.
  const query = `UPDATE complaints SET ${setClause} WHERE ticket_number = $${keys.length + 1} RETURNING *`;
  values.push(id);

  try {
    const result = await pool.query(query, values);
    
    // Audit Log (if you have the audit function setup)
    if (userId) {
       // Simple audit log call if you implemented the logAction helper
       // logAction(userId, `Updated Complaint ${id}`); 
    }

    res.json(result.rows[0]);
  } catch (err) { 
    console.error(err);
    res.status(500).send('Server Error'); 
  }
});

// Add this to server/server.js
app.get('/api/audit-logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT audit_logs.*, users.username 
      FROM audit_logs 
      LEFT JOIN users ON audit_logs.user_id = users.id 
      ORDER BY timestamp DESC
    `);
    res.json(result.rows);
  } catch (err) { 
    console.error(err);
    res.status(500).send('Server Error'); 
  }
});

app.listen(port, () => {
  console.log(`Majeng API running on port ${port}`);
});