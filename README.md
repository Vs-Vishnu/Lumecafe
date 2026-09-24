# LumeBills - Fast. Simple. Accurate.

LumeBills is a complete, modern, and production-ready POS and Billing Management web application tailored for cafes, juice shops, restaurants, and small retail businesses.

## Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS (v4), React Router, Axios, Lucide React, Recharts.
- **Backend**: Node.js, Express.js, REST APIs.
- **Database**: MongoDB & Mongoose.
- **Security**: JWT (JSON Web Tokens), bcryptjs password hashing, role-based route guard checks.

---

## Folder Structure

```text
lumebills/
│
├── frontend/
│   ├── src/
│   │   ├── components/      # UI elements: Button, Modal, Sidebar, Toast, Invoice, etc.
│   │   ├── context/         # AuthContext for global login/profile state
│   │   ├── layouts/         # MainLayout shell wrapping views
│   │   ├── pages/           # View pages: Billing POS, Dashboard, Products, Expenses, etc.
│   │   ├── services/        # Axios API client helper intercepting JWT headers
│   │   ├── App.jsx          # React routing definitions
│   │   └── main.jsx         # App entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
│
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB connection handler
│   │   ├── controllers/     # MVC controller logic for Auth, Orders, Reports, Settings, etc.
│   │   ├── middleware/      # Auth validations, Role checking, and central Error Handler
│   │   ├── models/          # Mongoose Schemas (User, Product, Order, Expense, etc.)
│   │   ├── routes/          # Express REST Endpoints
│   │   ├── scripts/         # DB Seeder script
│   │   ├── app.js           # Express App setup
│   │   └── server.js        # Server entry point
│   ├── package.json
│   └── .env.example
│
├── README.md
└── .gitignore
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- Local MongoDB running at `mongodb://localhost:27017` (or MongoDB Atlas connection string)

### 1. Database & Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   Modify `.env` to customize your ports or MongoDB URI:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/lumebills
   JWT_SECRET=supersecretkey_lumebills_2026
   NODE_ENV=development
   ```
4. Run database seed script (Seeds initial categories, products, and default accounts):
   ```bash
   npm run seed
   ```
5. Launch the backend dev server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Launch the frontend React app:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Default Development Accounts

Use the following seeded accounts to test different role permissions:

* **Administrator Account**
  - **Email**: `admin@lumebills.com`
  - **Password**: `admin123`
  - *Provides full access to Products, Settings, Cashiers, Expenses, Reports.*

* **Cashier Account**
  - **Email**: `cashier@lumebills.com`
  - **Password**: `cashier123`
  - *Provides access to Billing screen, Customers list, Orders catalog, and Expenses.*

---

## Key Billing POS Workflow

1. Log in using Cashier/Admin credentials.
2. Go to the **Billing** screen from the sidebar.
3. Select a category or search for products. Click on items to add them to the cart.
4. Optionally search/select or register a new customer (or default to Walk-in).
5. Review quantities, apply a discount, choose payment method (Cash/UPI/Card).
6. Click **Complete Bill**.
7. In the resulting modal, verify invoice details and select **Print Receipt** to open the browser print window (pre-styled for 80mm rolls).

---

## Future Thermal Printer Integration

LumeBills' invoice printing is handled via a clean service boundary using standard CSS `@media print` directives to match 80mm thermal receipt formats. To integrate physical ESC/POS hardware later:
1. Build a Node.js printing microservice or use a browser-level print client (e.g. QZ Tray or raw WebUSB/WebBluetooth APIs).
2. Format the order JSON into binary ESC/POS buffers (using npm libraries like `escpos`).
3. Send raw binary buffers directly to the printer address (USB, IP/LAN, or Bluetooth) without altering any database schemas or checkout routes.
