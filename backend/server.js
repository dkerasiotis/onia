const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { sendPushNotifications } = require('./notifications');

const app = express();
const PORT = process.env.PORT || 5003;
const DB_PATH = process.env.DB_PATH || '/data/onia.db';
const SESSION_SECRET = process.env.SESSION_SECRET || 'onia-secret-key';
const JWT_SECRET = process.env.JWT_SECRET || 'onia-jwt-secret-key';
const ADMIN_INITIAL_PASS = process.env.ADMIN_INITIAL_PASS || 'admin';

// Ensure /data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ── Middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Static files
app.use(express.static(path.join(__dirname, '../web'), { index: false }));

// ── Database setup ──
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    expo_push_token TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📦',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    default_unit TEXT DEFAULT 'τεμ',
    default_quantity REAL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shopping_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_by TEXT NOT NULL,
    claimed_by TEXT DEFAULT NULL,
    claimed_at TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT DEFAULT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (claimed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS shopping_list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'τεμ',
    priority TEXT NOT NULL DEFAULT 'normal',
    is_bought INTEGER DEFAULT 0,
    bought_by TEXT DEFAULT NULL,
    bought_at TEXT DEFAULT NULL,
    FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (bought_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_items_list ON shopping_list_items(list_id);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_lists_status ON shopping_lists(status);
`);

// Seed admin user if no users exist
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const hash = bcrypt.hashSync(ADMIN_INITIAL_PASS, 10);
  db.prepare('INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)')
    .run('u_admin', 'admin', hash, 'Διαχειριστής', 'admin');
  console.log('Admin user created (username: admin)');
}

// ── Public routes ──
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, '../web/login.html'));
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Συμπλήρωσε όλα τα πεδία' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Λάθος στοιχεία σύνδεσης' });
  }
  // Session for web
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  req.session.displayName = user.display_name;
  // JWT for mobile
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ ok: true, token, user: { id: user.id, displayName: user.display_name, role: user.role } });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Auth middleware — everything below requires login ──
app.use((req, res, next) => {
  // Check JWT first (mobile)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      req.user = { id: decoded.userId, username: decoded.username, role: decoded.role };
      // Load display_name from DB
      const u = db.prepare('SELECT display_name FROM users WHERE id = ?').get(decoded.userId);
      req.user.displayName = u ? u.display_name : decoded.username;
      return next();
    } catch (e) { /* fall through to session check */ }
  }
  // Session check (web)
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role,
      displayName: req.session.displayName
    };
    return next();
  }
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
  res.redirect('/login');
});

// Helper: check if user is admin
function isAdmin(req) { return req.user.role === 'admin'; }

// ══════════════════════════════
// CURRENT USER
// ══════════════════════════════
app.get('/api/me', (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    displayName: req.user.displayName,
    role: req.user.role
  });
});

app.post('/api/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Συμπλήρωσε όλα τα πεδία' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 4 χαρακτήρες' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Λάθος τρέχων κωδικός' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ ok: true });
});

app.post('/api/register-push-token', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Απαιτείται token' });
  db.prepare('UPDATE users SET expo_push_token = ? WHERE id = ?').run(token, req.user.id);
  res.json({ ok: true });
});

// ══════════════════════════════
// USER MANAGEMENT (admin only)
// ══════════════════════════════
app.get('/api/users', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Μόνο admin' });
  const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at').all();
  res.json(users);
});

app.post('/api/users', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Μόνο admin' });
  const { username, password, displayName, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Απαιτείται username και password' });
  if (password.length < 4) return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 4 χαρακτήρες' });
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: 'Το username υπάρχει ήδη' });
  const id = 'u' + Date.now();
  const hash = bcrypt.hashSync(password, 10);
  const r = role === 'admin' ? 'admin' : 'user';
  db.prepare('INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, username, hash, displayName || username, r);
  res.json({ id, username, display_name: displayName || username, role: r });
});

app.delete('/api/users/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Μόνο admin' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Δεν μπορείς να διαγράψεις τον εαυτό σου' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/users/:id/reset-password', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Μόνο admin' });
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 4 χαρακτήρες' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════
// CATEGORIES
// ══════════════════════════════
app.get('/api/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order, c.name
  `).all();
  res.json(categories);
});

app.post('/api/categories', (req, res) => {
  const { name, icon, sort_order } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Απαιτείται όνομα κατηγορίας' });
  try {
    const result = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)')
      .run(name.trim(), icon || '📦', sort_order || 0);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.json(cat);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Η κατηγορία υπάρχει ήδη' });
    throw e;
  }
});

app.put('/api/categories/:id', (req, res) => {
  const { name, icon, sort_order } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Απαιτείται όνομα κατηγορίας' });
  try {
    db.prepare('UPDATE categories SET name = ?, icon = ?, sort_order = ? WHERE id = ?')
      .run(name.trim(), icon || '📦', sort_order ?? 0, req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json(cat);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Η κατηγορία υπάρχει ήδη' });
    throw e;
  }
});

app.delete('/api/categories/:id', (req, res) => {
  const products = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(req.params.id);
  if (products.c > 0) return res.status(400).json({ error: `Η κατηγορία έχει ${products.c} προϊόντα. Διέγραψέ τα πρώτα.` });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════
// PRODUCTS
// ══════════════════════════════
app.get('/api/products', (req, res) => {
  const { category_id } = req.query;
  let query = `
    SELECT p.*, c.name as category_name, c.icon as category_icon
    FROM products p
    JOIN categories c ON c.id = p.category_id
  `;
  const params = [];
  if (category_id) {
    query += ' WHERE p.category_id = ?';
    params.push(category_id);
  }
  query += ' ORDER BY c.sort_order, c.name, p.name';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/products', (req, res) => {
  const { name, category_id, default_unit, default_quantity } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Απαιτείται όνομα προϊόντος' });
  if (!category_id) return res.status(400).json({ error: 'Απαιτείται κατηγορία' });
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
  if (!cat) return res.status(400).json({ error: 'Η κατηγορία δεν βρέθηκε' });
  const result = db.prepare('INSERT INTO products (name, category_id, default_unit, default_quantity) VALUES (?, ?, ?, ?)')
    .run(name.trim(), category_id, default_unit || 'τεμ', default_quantity || 1);
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.icon as category_icon
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);
  res.json(product);
});

app.put('/api/products/:id', (req, res) => {
  const { name, category_id, default_unit, default_quantity } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Απαιτείται όνομα προϊόντος' });
  if (!category_id) return res.status(400).json({ error: 'Απαιτείται κατηγορία' });
  db.prepare('UPDATE products SET name = ?, category_id = ?, default_unit = ?, default_quantity = ? WHERE id = ?')
    .run(name.trim(), category_id, default_unit || 'τεμ', default_quantity || 1, req.params.id);
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.icon as category_icon
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(req.params.id);
  res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
  const inUse = db.prepare(`
    SELECT COUNT(*) as c FROM shopping_list_items sli
    JOIN shopping_lists sl ON sl.id = sli.list_id
    WHERE sli.product_id = ? AND sl.status != 'completed'
  `).get(req.params.id);
  if (inUse.c > 0) return res.status(400).json({ error: 'Το προϊόν χρησιμοποιείται σε ενεργή λίστα' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════
// SHOPPING LISTS
// ══════════════════════════════

// Helper: get list with items
function getListWithItems(listId) {
  const list = db.prepare(`
    SELECT sl.*,
      cu.display_name as created_by_name,
      clu.display_name as claimed_by_name
    FROM shopping_lists sl
    LEFT JOIN users cu ON cu.id = sl.created_by
    LEFT JOIN users clu ON clu.id = sl.claimed_by
    WHERE sl.id = ?
  `).get(listId);
  if (!list) return null;
  list.items = db.prepare(`
    SELECT sli.*,
      p.name as product_name, p.category_id,
      c.name as category_name, c.icon as category_icon,
      bu.display_name as bought_by_name
    FROM shopping_list_items sli
    JOIN products p ON p.id = sli.product_id
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN users bu ON bu.id = sli.bought_by
    WHERE sli.list_id = ?
    ORDER BY c.sort_order, c.name, p.name
  `).all(listId);
  return list;
}

app.get('/api/lists', (req, res) => {
  const { status } = req.query;
  let where = "WHERE sl.status != 'completed'";
  if (status === 'completed') where = "WHERE sl.status = 'completed'";
  else if (status === 'all') where = '';

  const lists = db.prepare(`
    SELECT sl.*,
      cu.display_name as created_by_name,
      clu.display_name as claimed_by_name,
      COUNT(sli.id) as total_items,
      SUM(CASE WHEN sli.is_bought = 1 THEN 1 ELSE 0 END) as bought_items
    FROM shopping_lists sl
    LEFT JOIN users cu ON cu.id = sl.created_by
    LEFT JOIN users clu ON clu.id = sl.claimed_by
    LEFT JOIN shopping_list_items sli ON sli.list_id = sl.id
    ${where}
    GROUP BY sl.id
    ORDER BY sl.created_at DESC
  `).all();
  res.json(lists);
});

app.post('/api/lists', (req, res) => {
  const { title, notes, items } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Απαιτείται τίτλος λίστας' });
  if (!items || !items.length) return res.status(400).json({ error: 'Προσθέστε τουλάχιστον ένα προϊόν' });

  const insertList = db.prepare('INSERT INTO shopping_lists (title, created_by, notes) VALUES (?, ?, ?)');
  const insertItem = db.prepare('INSERT INTO shopping_list_items (list_id, product_id, quantity, unit, priority) VALUES (?, ?, ?, ?, ?)');

  const result = db.transaction(() => {
    const listResult = insertList.run(title.trim(), req.user.id, notes || '');
    const listId = listResult.lastInsertRowid;
    for (const item of items) {
      insertItem.run(listId, item.product_id, item.quantity || 1, item.unit || 'τεμ', item.priority || 'normal');
    }
    return listId;
  })();

  const list = getListWithItems(result);

  // Push notification
  sendPushNotifications(db, 'Νέα Λίστα Αγορών', `Δημιουργήθηκε: "${title.trim()}"`, req.user.id);

  res.json(list);
});

app.get('/api/lists/:id', (req, res) => {
  const list = getListWithItems(req.params.id);
  if (!list) return res.status(404).json({ error: 'Η λίστα δεν βρέθηκε' });
  res.json(list);
});

app.put('/api/lists/:id', (req, res) => {
  const { title, notes } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Απαιτείται τίτλος λίστας' });
  db.prepare('UPDATE shopping_lists SET title = ?, notes = ? WHERE id = ?')
    .run(title.trim(), notes || '', req.params.id);
  res.json(getListWithItems(req.params.id));
});

app.delete('/api/lists/:id', (req, res) => {
  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Η λίστα δεν βρέθηκε' });
  if (list.status !== 'open' && !isAdmin(req)) {
    return res.status(400).json({ error: 'Μόνο ανοιχτές λίστες μπορούν να διαγραφούν' });
  }
  db.prepare('DELETE FROM shopping_lists WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Claim a list
app.post('/api/lists/:id/claim', (req, res) => {
  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Η λίστα δεν βρέθηκε' });
  if (list.claimed_by && list.claimed_by !== req.user.id) {
    const claimer = db.prepare('SELECT display_name FROM users WHERE id = ?').get(list.claimed_by);
    return res.status(400).json({ error: `Η λίστα έχει αναληφθεί από ${claimer?.display_name || 'άλλον χρήστη'}` });
  }
  db.prepare("UPDATE shopping_lists SET claimed_by = ?, claimed_at = datetime('now'), status = 'claimed' WHERE id = ?")
    .run(req.user.id, req.params.id);

  // Push notification
  sendPushNotifications(db, 'Ανάληψη Λίστας', `Ο ${req.user.displayName} ανέλαβε: "${list.title}"`, req.user.id);

  res.json(getListWithItems(req.params.id));
});

// Unclaim
app.post('/api/lists/:id/unclaim', (req, res) => {
  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Η λίστα δεν βρέθηκε' });
  if (list.claimed_by !== req.user.id && !isAdmin(req)) {
    return res.status(403).json({ error: 'Μόνο αυτός που ανέλαβε ή ο admin μπορεί να ακυρώσει' });
  }
  db.prepare("UPDATE shopping_lists SET claimed_by = NULL, claimed_at = NULL, status = 'open' WHERE id = ?")
    .run(req.params.id);
  res.json(getListWithItems(req.params.id));
});

// Complete
app.post('/api/lists/:id/complete', (req, res) => {
  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Η λίστα δεν βρέθηκε' });
  db.prepare("UPDATE shopping_lists SET status = 'completed', completed_at = datetime('now') WHERE id = ?")
    .run(req.params.id);

  // Push notification
  sendPushNotifications(db, 'Λίστα Ολοκληρώθηκε', `"${list.title}" ολοκληρώθηκε`, req.user.id);

  res.json(getListWithItems(req.params.id));
});

// Reopen
app.post('/api/lists/:id/reopen', (req, res) => {
  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Η λίστα δεν βρέθηκε' });
  if (list.created_by !== req.user.id && !isAdmin(req)) {
    return res.status(403).json({ error: 'Μόνο ο δημιουργός ή ο admin μπορεί να ξανανοίξει τη λίστα' });
  }
  db.prepare("UPDATE shopping_lists SET status = 'open', claimed_by = NULL, claimed_at = NULL, completed_at = NULL WHERE id = ?")
    .run(req.params.id);
  res.json(getListWithItems(req.params.id));
});

// Copy list
app.post('/api/lists/:id/copy', (req, res) => {
  const source = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
  if (!source) return res.status(404).json({ error: 'Η λίστα δεν βρέθηκε' });
  const items = db.prepare('SELECT product_id, quantity, unit, priority FROM shopping_list_items WHERE list_id = ?')
    .all(req.params.id);

  const title = req.body.title || `${source.title} (αντιγραφή)`;

  const result = db.transaction(() => {
    const listResult = db.prepare('INSERT INTO shopping_lists (title, created_by, notes) VALUES (?, ?, ?)')
      .run(title, req.user.id, source.notes || '');
    const listId = listResult.lastInsertRowid;
    const ins = db.prepare('INSERT INTO shopping_list_items (list_id, product_id, quantity, unit, priority) VALUES (?, ?, ?, ?, ?)');
    for (const item of items) {
      ins.run(listId, item.product_id, item.quantity, item.unit, item.priority);
    }
    return listId;
  })();

  sendPushNotifications(db, 'Νέα Λίστα Αγορών', `Δημιουργήθηκε: "${title}"`, req.user.id);

  res.json(getListWithItems(result));
});

// ══════════════════════════════
// SHOPPING LIST ITEMS
// ══════════════════════════════
app.post('/api/lists/:id/items', (req, res) => {
  const { product_id, quantity, unit, priority } = req.body;
  if (!product_id) return res.status(400).json({ error: 'Απαιτείται προϊόν' });
  const list = db.prepare('SELECT * FROM shopping_lists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Η λίστα δεν βρέθηκε' });
  if (list.status === 'completed') return res.status(400).json({ error: 'Η λίστα έχει ολοκληρωθεί' });

  db.prepare('INSERT INTO shopping_list_items (list_id, product_id, quantity, unit, priority) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, product_id, quantity || 1, unit || 'τεμ', priority || 'normal');
  res.json(getListWithItems(req.params.id));
});

app.put('/api/lists/:id/items/:itemId', (req, res) => {
  const { quantity, unit, priority } = req.body;
  db.prepare('UPDATE shopping_list_items SET quantity = ?, unit = ?, priority = ? WHERE id = ? AND list_id = ?')
    .run(quantity || 1, unit || 'τεμ', priority || 'normal', req.params.itemId, req.params.id);
  res.json(getListWithItems(req.params.id));
});

app.delete('/api/lists/:id/items/:itemId', (req, res) => {
  db.prepare('DELETE FROM shopping_list_items WHERE id = ? AND list_id = ?')
    .run(req.params.itemId, req.params.id);
  res.json(getListWithItems(req.params.id));
});

// Buy item
app.post('/api/lists/:id/items/:itemId/buy', (req, res) => {
  db.prepare("UPDATE shopping_list_items SET is_bought = 1, bought_by = ?, bought_at = datetime('now') WHERE id = ? AND list_id = ?")
    .run(req.user.id, req.params.itemId, req.params.id);

  // Auto-transition to in_progress if currently claimed
  const list = db.prepare('SELECT status FROM shopping_lists WHERE id = ?').get(req.params.id);
  if (list && list.status === 'claimed') {
    db.prepare("UPDATE shopping_lists SET status = 'in_progress' WHERE id = ?").run(req.params.id);
  }

  res.json(getListWithItems(req.params.id));
});

// Unbuy item
app.post('/api/lists/:id/items/:itemId/unbuy', (req, res) => {
  db.prepare('UPDATE shopping_list_items SET is_bought = 0, bought_by = NULL, bought_at = NULL WHERE id = ? AND list_id = ?')
    .run(req.params.itemId, req.params.id);
  res.json(getListWithItems(req.params.id));
});

// ── Catch-all: serve index.html ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`Ώνια server running on port ${PORT}`);
});
