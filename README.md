# AssetFlow — Minimalist Asset & Task Management System

A simple, user-friendly, responsive asset and task operations management system with a color-coded status tracking engine.

## Features
- **Task Status Engine**:
  - 🔴 **Overdue** (Red)
  - 🔵 **Due Today** (Blue)
  - 🟠 **Due Soon** (Orange)
  - ⚪ **Upcoming** (Gray)
  - 🟢 **Completed** (Green)
- **Role-Based Workflows**:
  - **Administrator Account** (`admin@assetflow.com` / `admin123`): Task creation, assignment, specific next maintenance cycle date scheduling, custom categories & conditions creation, store branch credentials management, and task reopening.
  - **Store Accounts**: Branch login via PIN, mark tasks complete with mandatory date of completion, proof photos & remarks, and communication notes.
- **Left Sidebar Navigation & Off-Canvas Mobile Drawer**:
  - Sticky left sidebar with live status counter badges and quick management links.
  - Off-canvas mobile drawer with smooth slide-in transition.
- **Custom Categories & Asset Conditions**: Add and synchronize custom categories and asset condition tags on the fly.
- **Verification Workflow**: Required proof photo upload/dropzone + remarks + date of completion.
- **Dual View Modes**: Interactive Card Grid and Sortable Table View.
- **Activity Log & Remarks**: Slide-in comment history drawer with role badges and photo evidence viewer.

## Running Locally
- **Option 1 (1-Click)**: Double-click [go_live.bat](file:///f:/One%20drive%20personal/OneDrive/Desktop/newgitasset/go_live.bat).
- **Option 2 (PowerShell)**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File server.ps1
  ```
- **Option 3 (Direct Browser)**: Double-click [index.html](file:///f:/One%20drive%20personal/OneDrive/Desktop/newgitasset/index.html).

