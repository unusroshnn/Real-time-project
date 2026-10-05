require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const DATABASE_URL = process.env.DATABASE_URL;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
const EMAIL_TO = process.env.EMAIL_TO || process.env.HOSPITAL_EMAIL || '';
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const DEPARTMENTS = new Set([
  'Dental',
  'Homeopathy',
  'Cosmetology',
  'Counselling Psychology'
]);
const VISIT_TIMES = new Set(['9:00 AM – 1:00 PM', '5:00 PM – 9:00 PM']);

if (IS_PRODUCTION && !DATABASE_URL) {
  throw new Error('DATABASE_URL is required in production; local JSON storage is not safe for deployment.');
}
if (IS_PRODUCTION && (!SMTP_USER || !SMTP_PASS || !EMAIL_TO)) {
  throw new Error('SMTP_USER, SMTP_PASS, and EMAIL_TO must be configured before accepting public appointment requests.');
}

const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL })
  : null;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '15kb' }));
app.use('/api/appointments', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a little or call the clinic.' }
}));
app.use(express.static(PUBLIC_DIR));

function buildAppointmentEmail(item) {
  return [
    'New appointment request',
    '',
    `Reference: ${item.id}`,
    `Name: ${item.name}`,
    `Phone: ${item.phone}`,
    `Department: ${item.department}`,
    `Date: ${item.date}`,
    `Time: ${item.time}`,
    `Message: ${item.message || 'No additional notes'}`
  ].join('\n');
}

async function sendAppointmentEmail(item) {
  if (!SMTP_USER || !SMTP_PASS || !EMAIL_TO) {
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject: `New appointment request: ${item.department} on ${item.date}`,
    text: buildAppointmentEmail(item)
  });
  return { skipped: false };
}

async function saveAppointment(item) {
  if (pool) {
    await pool.query(
      `INSERT INTO appointments
        (id, name, phone, department, visit_date, visit_time, message, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        item.id,
        item.name,
        item.phone,
        item.department,
        item.date,
        item.time,
        item.message,
        item.status,
        item.createdAt
      ]
    );
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(APPOINTMENTS_FILE)) {
    fs.writeFileSync(APPOINTMENTS_FILE, '[]', 'utf8');
  }
  const list = JSON.parse(fs.readFileSync(APPOINTMENTS_FILE, 'utf8'));
  list.push(item);
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

async function initializeDatabase() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      phone VARCHAR(25) NOT NULL,
      department VARCHAR(60) NOT NULL,
      visit_date DATE NOT NULL,
      visit_time VARCHAR(40) NOT NULL,
      message VARCHAR(500) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMPTZ NOT NULL
    )
  `);
}

app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/api/health', async (_req, res) => {
  try {
    if (pool) await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ status: 'unavailable' });
  }
});

app.post('/api/appointments', async (req, res) => {
  const { name, phone, department, date, time, message = '', consent } = req.body || {};
  const required = [name, phone, department, date, time];
  if (!required.every(value => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ error: 'Please complete all required fields.' });
  }
  if (!/^[0-9+()\s-]{8,18}$/.test(phone.trim())) {
    return res.status(400).json({ error: 'Please enter a valid phone number.' });
  }
  if (!DEPARTMENTS.has(department.trim()) || !VISIT_TIMES.has(time.trim())) {
    return res.status(400).json({ error: 'Please choose a valid department and appointment time.' });
  }
  const requestedDate = date.trim();
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? new Date(`${requestedDate}T00:00:00.000Z`)
    : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== requestedDate) {
    return res.status(400).json({ error: 'Please enter a valid appointment date.' });
  }
  const todayInIndia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  if (requestedDate < todayInIndia) {
    return res.status(400).json({ error: 'Please choose today or a future date.' });
  }
  if (consent !== 'on') {
    return res.status(400).json({ error: 'Please confirm that the clinic may use your details to respond.' });
  }
  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'Please check the optional message field.' });
  }

  const item = {
    id: `STS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 80),
    phone: phone.trim().slice(0, 25),
    department: department.trim(),
    date: date.trim(),
    time: time.trim(),
    message: message.trim().slice(0, 500),
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  try {
    await saveAppointment(item);
  } catch (err) {
    console.error('Unable to save appointment:', err.message);
    return res.status(500).json({ error: 'We could not save your request. Please call the clinic.' });
  }

  try {
    const email = await sendAppointmentEmail(item);
    return res.status(201).json({
      success: true,
      message: email.skipped
        ? 'Your request was saved, but email notifications are not configured. Please call the clinic to confirm.'
        : 'Your request was received and sent to the clinic.',
      appointmentId: item.id
    });
  } catch (err) {
    console.error('Unable to send appointment email:', err.message);
    return res.status(202).json({
      success: true,
      notificationSent: false,
      message: 'Your request was saved, but we could not notify the clinic by email. Please call the clinic to confirm.',
      appointmentId: item.id
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(400).json({ error: 'Invalid request. Please check the form and try again.' });
});

async function start() {
  await initializeDatabase();
  app.listen(PORT, () => console.log(`Skin to Smiles is running on port ${PORT}`));
}

start().catch(err => {
  console.error('Unable to start the server:', err.message);
  if (pool) {
    pool.end().finally(() => {
      process.exitCode = 1;
    });
  } else {
    process.exitCode = 1;
  }
});
