# Metro Mobile Shop ERP Backend

Metro Mobile ERP is a production-ready, enterprise-grade, highly scalable backend system for a Mobile Shop Management ERP application. Built with **Node.js**, **Express.js**, and **MySQL (Sequelize ORM)**, it follows the robust **MVC + Repository-Service-Controller Pattern** and incorporates central ledger-based transactional systems for financials, stock tracking, and vendor accounts.

---

## 🚀 Key Modules & Business Engines

1. **Centralized Financial Engine**: Dual-balance ledger maintaining `cash_balance` and `online_balance` with transactions, automated rollback on failure, daily balance sheets, and profit/loss statements.
2. **Stock Engine**: Serial number / IMEI-based stock deduction and tracking. Prevents negative inventory levels and maintains detailed transaction logs.
3. **Supplier Pending Engine**: Centralized ledger managing outsourcing vendor repair fees, raw inventory supplier billing, and payment processing adjustments.
4. **Exchange System**: Trade-in module supporting customer verification details, ID uploads, device photos, and automatic expense registration of the trade-in device under the `EXCHANGE` category.
5. **Activity Log (Audit Trail)**: Deep audit logger capturing detailed user operations (creates, updates, soft deletes) with comprehensive diffs (`oldData` vs `newData`), client IP, and User Agent logging.
6. **Reports & Exports**: Highly flexible filters to aggregate Sales, Service, Expenses, Exchanges, and Stock, with direct exports to **Excel** (`exceljs`) and **PDF** (`pdfkit`) formats.

---

## 🛠️ Technology Stack & Security

- **Core**: Node.js, Express.js (REST APIs)
- **Database**: MySQL 8.x + Sequelize ORM
- **Authentication**: JWT Access Token (24h) + Refresh Token (7d)
- **Security Middlewares**:
  - **Helmet**: Secures HTTP headers
  - **CORS**: Origin filtering and cross-origin resource sharing
  - **Rate Limiting**: Protects against brute-force/DoS attacks (limit 1000 requests per 15 minutes)
  - **Request Sanitization**: Custom recursive sanitizer striping inline XSS tags, scripts, and SQL injection strings from bodies, queries, and param scopes.
  - **CENTRAL ACID Transactions**: Explicit transaction boundaries wrapped in all financial and inventory services.

---

## 📂 Backend Architecture Folder Tree

```
src/
├── config/             # Sequelize and DB connections config
├── controllers/        # Parses HTTP payloads, calls services, sends standard JSON
├── services/           # Standard CRUD and Transactional business logic
├── repositories/       # Pure database operations using Sequelize models
├── models/             # Sequelize UUID paranoid models (soft delete)
├── migrations/         # Database table definitions
├── seeders/            # Database mock and initial data seeds
├── routes/             # API routes
├── middlewares/        # Authentication, Authorization, Validations, File upload rules
├── validations/        # express-validator strict definitions
├── helpers/            # Reusable utilities (Response, Pagination, Upload, Invoice helpers)
├── utils/              # Winston, JWT, Bcrypt wrappers
├── uploads/            # Organized folders (logos, customers, exchange, invoices, idproofs)
└── server.js           # Server startup script
```

---

## 💻 Installation & Local Setup

### 1. Prerequisites
- **Node.js** (v18.x or higher)
- **MySQL Server** (v8.x)

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Creation
Connect to your local MySQL database and create the database:
```sql
CREATE DATABASE metro_mobile;
```

### 4. Configuration
Create a local `.env` file (copied from `.env.example`):
```bash
PORT=5000
NODE_ENV=development

# Database Settings
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=yourpassword
DB_NAME=metro_mobile

# JWT Settings
JWT_SECRET=super_secret_jwt_key_metro_mobile_erp_2026
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_metro_mobile_erp_2026
```

### 5. Running Database Migrations & Seeds
Apply all table definitions and seed the default administrator user and initial variables:
```bash
# Apply table migrations
npm run db:migrate

# Apply initial seeder
npm run db:seed
```

### 6. Run Application
```bash
# Start in Dev Mode (Nodemon reload)
npm run dev

# Start in Production Mode
npm start
```

---

## 🔐 Default Credentials (Admin User)

- **Email**: `admin@gmail.com`
- **Password**: `Admin@123`

---

## 📮 Postman Collection API Requests

A pre-configured, complete **Postman Collection** is saved inside:
📄 [PostmanCollection.json](file:///d:/clientProjects/metromobilebackend/src/docs/PostmanCollection.json)

**How to use:**
1. Import `PostmanCollection.json` into Postman.
2. Select the **Admin Login** request and run it. The collection contains test script assertions that automatically extract the JWT token on login success and save it to the collection environment variable.
3. All subsequent requests in the collection will be automatically authorized using the bearer token!

---

## 📈 Standard REST API Reference list

| Endpoint | Method | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | Public | - | Admin Login (returns Access & Refresh tokens) |
| `/api/v1/auth/profile` | `GET` | Protected | - | Fetch Admin profile & shop settings |
| `/api/v1/auth/profile` | `PUT` | Protected | - | Update profile information |
| `/api/v1/auth/upload-logo` | `POST` | Protected | - | Upload shop logo image file |
| `/api/v1/categories` | `POST` | Protected | - | Create category |
| `/api/v1/products` | `POST` | Protected | - | Add product item with initial stock |
| `/api/v1/accessory-bills` | `POST` | Protected | - | Finalize accessory bill (reduces stock, adds balance) |
| `/api/v1/mobile-sales` | `POST` | Protected | - | Finalize mobile sale (reduces stock, validates IMEI) |
| `/api/v1/service-bills` | `POST` | Protected | - | Finalize service repair bill (outsourcing vendor logic) |
| `/api/v1/exchanges` | `POST` | Protected | - | Process trade-in (auto creates EXCHANGE expense) |
| `/api/v1/dashboard/summary` | `GET` | Protected | - | Aggregated balances & statistics |
| `/api/v1/reports/sales?export=excel`| `GET`| Protected | - | Export Sales Report directly to Excel buffer |
| `/api/v1/activity-logs` | `GET` | Protected | `admin`| View system audits log (restricted to admin) |
