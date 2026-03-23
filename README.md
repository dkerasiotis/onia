# 🛒 Ώνια (Onia) — Household Shopping List App

A self-hosted household shopping list application where family members can manage product catalogs, create shopping lists, claim lists, and check off items as they shop — with real-time push notifications.

**[Ελληνικά](#ελληνικά)** | **[English](#english)**

---

## Ελληνικά

### Τι είναι

Το **Ώνια** είναι μια εφαρμογή διαχείρισης λίστας αγορών νοικοκυριού. Τα μέλη της οικογένειας μπορούν να:

- 📦 Δημιουργούν κατάλογο προϊόντων ανά κατηγορία (π.χ. Ζυμαρικά → Σπαγγέτι, Βίδες)
- 🛒 Φτιάχνουν λίστες ψωνιών επιλέγοντας προϊόντα από τον κατάλογο
- 🙋 Αναλαμβάνουν μια λίστα ώστε οι υπόλοιποι να ξέρουν ότι κάποιος πάει για ψώνια
- ✅ Τσεκάρουν τα προϊόντα καθώς τα αγοράζουν
- 📋 Αντιγράφουν παλιές λίστες για γρήγορη επανάληψη
- 🔔 Λαμβάνουν push notifications (νέα λίστα, ανάληψη, ολοκλήρωση)

### Αρχιτεκτονική

| Component | Τεχνολογία | Περιγραφή |
|-----------|------------|-----------|
| **Backend** | Node.js / Express / SQLite | REST API, port 5003 |
| **Web App** | Vanilla HTML/CSS/JS (SPA) | Πλήρης διαχείριση (κατάλογος + λίστες) |
| **Mobile App** | React Native / Expo (Android) | Προβολή, ανάληψη, check-off, notifications |

### Εγκατάσταση

#### Προαπαιτούμενα
- Docker & Docker Compose

#### Backend + Web

```bash
git clone https://github.com/dkerasiotis/onia.git
cd onia
docker compose up -d --build
```

Η εφαρμογή θα τρέχει στο `http://localhost:5003`

**Default login:** `admin` / `admin`

> ⚠️ Άλλαξε τον κωδικό του admin μετά την πρώτη σύνδεση!

#### Μεταβλητές Περιβάλλοντος

| Μεταβλητή | Default | Περιγραφή |
|-----------|---------|-----------|
| `PORT` | `5003` | Port του server |
| `DB_PATH` | `/data/onia.db` | Τοποθεσία βάσης δεδομένων |
| `SESSION_SECRET` | `onia-session-secret-change-me` | Secret για sessions (web) |
| `JWT_SECRET` | `onia-jwt-secret-change-me` | Secret για JWT tokens (mobile) |
| `ADMIN_INITIAL_PASS` | `admin` | Αρχικός κωδικός admin |

#### Mobile App (Android)

Το mobile app χρειάζεται Node.js για development:

```bash
# Εγκατάσταση dependencies
cd mobile
npm install

# Development (Expo Go)
npx expo start

# Build APK (αυτόνομη εφαρμογή)
eas login
eas build --platform android --profile preview
```

Για το APK build χρειάζεται δωρεάν [Expo account](https://expo.dev/signup).

**Ρύθμιση server URL:** Στο `mobile/src/api/client.js` άλλαξε το `API_URL` στη διεύθυνση του server σου.

#### Reverse Proxy (HTTPS)

Για πρόσβαση εξωτερικά, ρύθμισε nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name onia.yourdomain.com;

    location / {
        proxy_pass http://localhost:5003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Μετά εγκατέστησε SSL με certbot:
```bash
sudo certbot --nginx -d onia.yourdomain.com
```

### Χρήση

#### Web App
1. **Κατηγορίες** — Δημιούργησε κατηγορίες προϊόντων (π.χ. Ζυμαρικά, Γαλακτοκομικά, Κρέατα)
2. **Κατάλογος** — Πρόσθεσε προϊόντα στις κατηγορίες (π.χ. Σπαγγέτι, Γάλα)
3. **Νέα Λίστα** — Επίλεξε προϊόντα, ποσότητα, μονάδα, προτεραιότητα
4. **Διαχείριση** — Claim, check-off, ολοκλήρωση, αντιγραφή

#### Mobile App
1. Login με τα στοιχεία σου
2. Βλέπεις τις ενεργές λίστες
3. Πατάς σε μια λίστα → ανάληψη, τσεκάρισμα προϊόντων
4. Λαμβάνεις push notifications για νέες λίστες/αναλήψεις

### Επίπεδα Προτεραιότητας

| Επίπεδο | Χρώμα |
|---------|-------|
| 🔴 Υψηλή | Κόκκινο |
| 🔵 Κανονική | Μπλε |
| ⚪ Χαμηλή | Γκρι |

### Καταστάσεις Λίστας

```
Ανοιχτή → Ανατέθηκε → Σε εξέλιξη → Ολοκληρωμένη
   ↑                                        |
   └──────────── Επαναφορά ─────────────────┘
```

---

## English

### What is it

**Onia** (Ώνια — Greek for "shopping/purchases") is a self-hosted household shopping list app. Family members can:

- 📦 Maintain a product catalog organized by categories
- 🛒 Create shopping lists by picking products from the catalog
- 🙋 Claim a list so others know someone is already shopping
- ✅ Check off items as they buy them
- 📋 Copy previous lists for quick reuse
- 🔔 Receive push notifications (new list, claim, completion)

### Architecture

| Component | Technology | Description |
|-----------|-----------|-------------|
| **Backend** | Node.js / Express / SQLite | REST API on port 5003 |
| **Web App** | Vanilla HTML/CSS/JS (SPA) | Full management (catalog + lists) |
| **Mobile App** | React Native / Expo (Android) | View, claim, check-off, notifications |

### Quick Start

```bash
git clone https://github.com/dkerasiotis/onia.git
cd onia
docker compose up -d --build
```

Open `http://localhost:5003` — login with `admin` / `admin`

### Project Structure

```
onia/
├── backend/
│   ├── server.js           # Express API server (routes, DB, auth)
│   ├── notifications.js    # Expo push notification helper
│   └── package.json
├── web/
│   ├── index.html          # Main SPA (catalog + lists + history)
│   ├── login.html          # Login page
│   └── favicon.svg
├── mobile/                 # React Native / Expo (Android)
│   ├── App.js              # Root navigator + auth flow
│   ├── app.json            # Expo configuration
│   ├── eas.json            # EAS Build configuration
│   └── src/
│       ├── api/client.js           # API client with JWT auth
│       ├── context/AuthContext.js   # Authentication state
│       ├── screens/
│       │   ├── LoginScreen.js
│       │   ├── ListsScreen.js      # Active shopping lists
│       │   ├── ListDetailScreen.js # Items, check-off, claim
│       │   ├── HistoryScreen.js    # Completed lists
│       │   └── SettingsScreen.js   # Password, logout
│       ├── components/
│       │   ├── ListCard.js
│       │   ├── ItemRow.js
│       │   ├── StatusBadge.js
│       │   └── PriorityBadge.js
│       └── utils/
│           ├── theme.js            # Colors and constants
│           └── notifications.js    # Push notification setup
├── Dockerfile
├── docker-compose.yml
└── .gitignore
```

### Database Schema

- **users** — Multi-user auth with roles (admin/user), Expo push tokens
- **categories** — Product categories with emoji icons and sort order
- **products** — Products linked to categories with default unit/quantity
- **shopping_lists** — Lists with status tracking (open → claimed → in_progress → completed)
- **shopping_list_items** — Items with quantity, unit, priority, and buy status

### API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Login (returns session + JWT) |
| POST | `/api/logout` | Logout |
| GET | `/api/me` | Current user info |
| POST | `/api/register-push-token` | Register Expo push token |

#### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

#### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (?category_id=X) |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

#### Shopping Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lists` | Active lists (?status=completed for history) |
| POST | `/api/lists` | Create list with items |
| GET | `/api/lists/:id` | Get list with items |
| PUT | `/api/lists/:id` | Update list metadata |
| DELETE | `/api/lists/:id` | Delete list |
| POST | `/api/lists/:id/claim` | Claim list |
| POST | `/api/lists/:id/unclaim` | Unclaim list |
| POST | `/api/lists/:id/complete` | Complete list |
| POST | `/api/lists/:id/reopen` | Reopen completed list |
| POST | `/api/lists/:id/copy` | Copy list |

#### List Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lists/:id/items` | Add item |
| PUT | `/api/lists/:id/items/:itemId` | Update item |
| DELETE | `/api/lists/:id/items/:itemId` | Remove item |
| POST | `/api/lists/:id/items/:itemId/buy` | Mark as bought |
| POST | `/api/lists/:id/items/:itemId/unbuy` | Unmark |

### Push Notifications

Push notifications are sent via the [Expo Push API](https://docs.expo.dev/push-notifications/overview/). They work in standalone APK builds (not in Expo Go since SDK 53).

| Event | Notification |
|-------|-------------|
| New list created | "Δημιουργήθηκε: {title}" |
| List claimed | "Ο {name} ανέλαβε: {title}" |
| List completed | "{title} ολοκληρώθηκε" |

### Tech Stack

- **Backend**: Node.js 20, Express 4, better-sqlite3, bcryptjs, jsonwebtoken
- **Web**: Vanilla HTML/CSS/JS, dark theme with green accent
- **Mobile**: React Native, Expo SDK 54, React Navigation
- **Infrastructure**: Docker, nginx reverse proxy, Let's Encrypt SSL
- **Notifications**: Expo Push API (routes to FCM for Android)

### License

MIT
