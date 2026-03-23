# Travelogue Tours — Business Management System

## How to Run

**Option 1 — Double-click (simplest)**
Just double-click `index.html` to open it in your browser. The app runs entirely offline — no internet required.

**Option 2 — Use a local server (recommended for best experience)**
If you have Python installed, open a terminal in this folder and run:
```
python -m http.server 8080
```
Then open your browser and go to: `http://localhost:8080`

---

## Your Data
All data (clients, suppliers, invoices, etc.) is saved automatically in your browser's local storage. It persists between sessions as long as you use the same browser on the same computer.

> **Important:** Clearing your browser's cache/data will erase the app's data. To back up your data, use the browser's developer tools or contact your IT person to export the localStorage contents.

---

## File Structure
```
travelogue-tours/
│
├── index.html          ← Open this to run the app
├── logo.png            ← Your company logo (replace to update it)
│
├── css/
│   └── style.css       ← All styling
│
└── js/
    ├── db.js           ← Data storage & sample data
    ├── helpers.js      ← Utility functions
    ├── renders.js      ← Page rendering (Dashboard, Tables, etc.)
    ├── forms.js        ← All form dialogs (New Invoice, New PO, etc.)
    ├── views.js        ← View modals (Invoice preview, SOA, etc.)
    └── app.js          ← Navigation & app startup
```

---

## Modules
- **Dashboard** — Revenue, profit, outstanding receivables & payables
- **Client Master Data** — All client records with TIN, VAT, contact details
- **Supplier Master Data** — All suppliers with service type & billing currency
- **Client Invoices** — Create & manage invoices (Air Tickets with pax details, Hotel, Transfers)
- **Purchase Orders** — Raise POs to suppliers, link to client invoices
- **Supplier Invoices** — Log & track supplier bills
- **Profit Tracker** — Revenue vs cost analysis by invoice and service type
- **Statements (SOA)** — Full statements for clients and suppliers
- **Settings** — Company profile, TIN/VAT, exchange rate

---

## Updating the Logo
Replace `logo.png` in the main folder with your new logo file. Keep the filename as `logo.png`.

---

*Built for Travelogue Tours Ltd, Dar es Salaam*
