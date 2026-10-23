# 📋 Changelog

All notable changes to the **PennyFlow** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-24

### 🚀 Major Release: PennyFlow Production Ready

We are excited to announce the official **v1.0.0** release of **PennyFlow** — the intelligent, entertaining, and privacy-focused personal expense tracker and financial companion!

### ✨ Highlights & New Features

- **📱 Production Android APK Release**: Standalone APK distribution with automated CI/CD builds via GitHub Actions.
- **🌐 Interactive GitHub Pages Web Application**:
  - **Instant Guest / Demo Mode**: Explore realistic finances, budget burn graphs, and AI insights with zero setup.
  - **Supabase Cloud Sync Mode**: Real-time multi-device cloud synchronization with row-level security.
  - **Mobile Chassis Simulator**: Toggle between a realistic 3D smartphone simulator frame and expansive desktop web app.
- **🤖 "Penny" AI Financial Coach (Triple Personality Engine)**:
  - 🧐 **Pragmatic Advisor**: Actionable 50/30/20 recommendations and burn rate forecasts.
  - 🔥 **Roast My Spending**: Hilarious and brutally honest roasts of discretionary splurges.
  - 🏆 **Hype Coach**: High-energy celebrations for saving money and hitting targets.
- **📷 Interactive Receipt Scanner & Laser OCR**:
  - Live animated laser scan with real-time OCR bounding box detection.
  - Drag-and-drop receipt upload with instant parsing of vendor, total, tax, and itemized sub-items.
  - One-click confirmation into expense history.
- **🧟 Zombie Subscription Killer**:
  - Radar detection for recurring subscriptions.
  - Price-creep analysis and one-click copy cancellation templates.
  - Annual savings calculator.
- **🎮 Gamified Audio & Celebrations**:
  - Lightweight Web Audio API synthesizer for satisfying haptic coin clinks and cash register dings.
  - Confetti cannon bursts upon reaching savings milestones and respecting budget limits.
- **💼 Real-World Data Management**:
  - One-click **Export to CSV** for spreadsheets (Excel, Google Sheets).
  - One-click **Export / Import JSON** backup.
  - Multi-Currency Support: USD ($), EUR (€), GBP (£), PHP (₱), INR (₹), JPY (¥), CAD (C$), AUD (A$).
- **⚡ Safe-to-Spend Real-Time Dial**:
  - Dynamically calculates daily allowance based on remaining days and reserved bills.

### 🛠️ Architecture & Tech Stack

- **Cross-Platform Core**: React Native (Expo SDK 51) + TypeScript + NativeWind (Tailwind CSS).
- **Backend & Auth**: Supabase (PostgreSQL, Row-Level Security, Edge Functions).
- **Web App**: Vanilla modern JavaScript, Chart.js, Tailwind CDN, Web Audio API, Canvas Confetti.
- **CI/CD**: GitHub Actions for automated Android APK builds and GitHub Pages deployment.

---

### 📦 Assets

- `PennyFlow-v1.0.0.apk`: Android standalone application package.
- `PennyFlow-v1.0.0.apk.sha256`: Cryptographic integrity checksum.
- Live Web App: [https://watot12345.github.io/Expense-Tracker/](https://watot12345.github.io/Expense-Tracker/)
