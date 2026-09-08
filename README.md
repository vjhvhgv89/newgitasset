# AssetFlow — Minimalist Asset & Task Management System

A simple, user-friendly, responsive asset and task operations management system with a color-coded status tracking engine.

## Features
- **Active Task Status Engine**:
  - 🔴 **Overdue** (Red)
  - 🔵 **Due Today** (Blue)
  - 🟠 **Due Soon** (Orange)
  - ⚪ **Upcoming** (Gray)
  *(Note: Standalone "Completed" status tab has been removed; completed history is tracked in the Remarks section with Scheduled Date, Completed Date, and Next Cycle Date, advancing recurring maintenance tasks directly to their next cycle).*
- **Role-Based Workflows**:
  - **Administrator Account** (`admin` / `admin010211`): Task creation, assignment, specific next maintenance cycle date scheduling, custom categories & conditions creation, store branch credentials management, task reopening, and full remarks management.
  - **Admin Comment & Photo Replacement Editor**: Admin can edit store remarks, completion notes, and admin remarks, replace attached verification/evidence photos, and have all edits immediately sync in real-time to the assigned Store account.
  - **Store Accounts**: Branch login via PIN, mark tasks complete with mandatory date of completion, proof photos & remarks, and communication notes.
- **Left Sidebar Navigation & Off-Canvas Mobile Drawer**:
  - Sticky left sidebar with live status counter badges (Overdue, Due Today, Due Soon, Upcoming) and quick management links.
  - Off-canvas mobile drawer with smooth slide-in transition.
- **Custom Categories & Asset Conditions**: Add and synchronize custom categories and asset condition tags on the fly.
- **Completed History in Remarks / Activity Section**:
  - When maintenance tasks are marked complete, a structured completion record is logged in the Remarks section displaying:
    - **Task Date Sched**: The original scheduled date of the task.
    - **When Completed**: Exact date/time when completed and by whom.
    - **Next Cycle Date**: The calculated next maintenance cycle schedule.
  - Recurring tasks automatically advance to the next cycle date so maintenance remains in the active operational pipeline.
- **View Modes**: Sortable Table View and Monthly Calendar View (showing all due dates and next cycle maintenance dates).
- **Recycle Bin (Trash Recovery & Safety Vault)**:
  - **Admin-Only Visibility**: Deleted tasks are safely moved to the Recycle Bin rather than permanently erased immediately.
  - **Real-Time Store Sync & Restore**: When an Admin restores a task from the Recycle Bin, real-time cloud synchronization immediately restores the task back into the assigned Store Account's active workspace and calendar.
  - **Bulk Actions**: Support for 1-click "Restore All" or "Empty Recycle Bin" (permanent purge).
- **Activity Log & Remarks**: Slide-in comment history drawer with role badges, edit controls, and photo evidence viewer with replacement capabilities.

## Running Locally
- **Option 1 (1-Click)**: Double-click [go_live.bat](file:///f:/One%20drive%20personal/OneDrive/Desktop/newgitasset/go_live.bat).
- **Option 2 (PowerShell)**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File server.ps1
  ```
- **Option 3 (Direct Browser)**: Double-click [index.html](file:///f:/One%20drive%20personal/OneDrive/Desktop/newgitasset/index.html).

