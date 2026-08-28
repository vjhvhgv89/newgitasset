/**
 * AssetFlow — Minimalist Asset & Task Management System with Firebase Cloud Database
 * Features:
 * - Real-Time Google Firebase Firestore Cloud Sync (Accessible worldwide on any PC/device)
 * - Persistent Left Sidebar Navigation & Off-Canvas Mobile Drawer
 * - Store Account Date of Completion selection on task verification
 * - Custom Category & Custom Asset Condition Creation & Cloud Synchronization
 * - Admin Store Credentials Management (Add, Edit PIN, Delete Store Accounts)
 * - Strict Store Permissions (Store accounts cannot edit or reopen tasks; only mark done with date, photo & remarks, and add comments)
 * - Maintenance Cycle Automation & Dynamic Color Status Tracking (Overdue: Red, Due Today: Blue, Due Soon: Orange, Upcoming: Gray, Completed: Green)
 * - Admin Specific Next Maintenance Cycle Date scheduling with real-time status preview
 */

(function () {
  'use strict';

  // Reference Date: August 24, 2026
  const TODAY_STR = '2026-08-24';
  const TODAY = new Date(TODAY_STR + 'T00:00:00');

  // Firebase Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyARd5ueTOKiEk-HOLLM1G-hqQtuv_8KTe0",
    authDomain: "gitassetmanagement.firebaseapp.com",
    projectId: "gitassetmanagement",
    storageBucket: "gitassetmanagement.firebasestorage.app",
    messagingSenderId: "809200034755",
    appId: "1:809200034755:web:47e58e2b6dfcb0e7b8d376",
    measurementId: "G-TKR89Q3PWE"
  };

  // Initialize Firebase Cloud Firestore + Storage
  let db = null;
  let storage = null;
  let isFirebaseReady = false;

  try {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      if (typeof firebase.storage === 'function') {
        try {
          storage = firebase.storage();
        } catch (e) {
          console.warn('Firebase Storage init notice:', e);
        }
      }
      isFirebaseReady = true;
      console.log('Firebase Cloud Firestore Initialized Successfully');
    }
  } catch (err) {
    console.warn('Firebase init error, fallback to local storage:', err);
  }

  // Storage keys (Offline Cache / Local Backup)
  const STORAGE_KEY = 'assetflow_tasks_db_v4';
  const AUTH_STORAGE_KEY = 'assetflow_auth_session_v4';
  const STORES_STORAGE_KEY = 'assetflow_stores_db_v4';
  const CATEGORIES_STORAGE_KEY = 'assetflow_categories_db_v4';
  const CONDITIONS_STORAGE_KEY = 'assetflow_conditions_db_v4';
  const NOTIFICATIONS_STORAGE_KEY = 'assetflow_notifications_db_v4';

  // Default Categories
  const DEFAULT_CATEGORIES = [
    'Kitchen Equipment',
    'HVAC & Cooling',
    'POS & Tech',
    'Safety & Security',
    'Furniture & Fixtures',
    'Facility & Plumbing'
  ];

  // Default Asset Conditions
  const DEFAULT_CONDITIONS = [
    'Excellent',
    'Good',
    'Fair',
    'Needs Repair',
    'Critical'
  ];

  // Default Store Branches
  const DEFAULT_STORES = [
    { id: 'store-101', name: 'Store #101 - Main Branch', code: 'ST-101', manager: 'Alex Morgan (alex@store.com)', pin: '1234', createdAt: '2026-08-24T00:00:00.000Z' },
    { id: 'store-102', name: 'Store #102 - Downtown', code: 'ST-102', manager: 'Sarah Connor (sarah@store.com)', pin: '1234', createdAt: '2026-08-24T00:00:00.000Z' }
  ];
  const DEFAULT_TASKS = [];

  // Sample SVG Data URLs for 1-click test verification photos
  const SAMPLE_PHOTOS = {
    oven: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='380' viewBox='0 0 600 380'><rect width='600' height='380' fill='%231E293B'/><rect x='40' y='40' width='520' height='300' rx='12' fill='%23334155' stroke='%23475569' stroke-width='4'/><rect x='70' y='70' width='460' height='100' rx='6' fill='%230F172A'/><circle cx='480' cy='120' r='18' fill='%23EF4444'/><circle cx='430' cy='120' r='18' fill='%2310B981'/><rect x='70' y='190' width='460' height='120' rx='6' fill='%230F172A'/><text x='300' y='260' font-family='sans-serif' font-size='22' font-weight='bold' fill='%2310B981' text-anchor='middle'>VERIFIED: HEATING COIL CLEANED &amp; SEALED</text><text x='300' y='355' font-family='sans-serif' font-size='14' fill='%2394A3B8' text-anchor='middle'>Inspection Photo — Chamber Test Passed (350°C)</text></svg>`,
    clean: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='380' viewBox='0 0 600 380'><rect width='600' height='380' fill='%230F766E'/><rect x='40' y='40' width='520' height='300' rx='12' fill='%23115E59' stroke='%2314B8A6' stroke-width='4'/><circle cx='300' cy='160' r='60' fill='%23CCFBF1'/><path d='M280 160 L295 175 L325 145' stroke='%230F766E' stroke-width='10' fill='none' stroke-linecap='round' stroke-linejoin='round'/><text x='300' y='260' font-family='sans-serif' font-size='22' font-weight='bold' fill='%23FFFFFF' text-anchor='middle'>FILTER REPLACED &amp; SANITIZED</text><text x='300' y='290' font-family='sans-serif' font-size='14' fill='%2399F6E4' text-anchor='middle'>Cartridge Batch #OEM-2026-X • Pressure 4.2 Bar</text></svg>`,
    tech: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='380' viewBox='0 0 600 380'><rect width='600' height='380' fill='%231E1B4B'/><rect x='60' y='50' width='480' height='260' rx='12' fill='%23312E81' stroke='%236366F1' stroke-width='4'/><rect x='90' y='80' width='420' height='160' rx='6' fill='%230F172A'/><text x='300' y='150' font-family='monospace' font-size='20' fill='%2338BDF8' text-anchor='middle'>SYSTEM SELF-TEST: 100% OK</text><text x='300' y='180' font-family='monospace' font-size='14' fill='%23A5B4FC' text-anchor='middle'>Printer Head Clean • Scanner Latency 12ms</text><rect x='250' y='320' width='100' height='20' rx='4' fill='%234338CA'/></svg>`
  };

  // Application State
  let state = {
    auth: {
      isAuthenticated: false,
      role: 'admin',
      store: null,
      username: 'admin',
      displayName: 'Admin (Headquarters)'
    },
    authTab: 'store',
    categories: [],
    conditions: [],
    storeAccounts: [],
    tasks: [],
    notifications: [],
    filterStatus: 'all',
    filterStore: 'all',
    filterCategory: 'all',
    searchQuery: '',
    sortBy: 'urgency',
    viewMode: 'grid',
    calendarYear: 2026,
    calendarMonth: 7,
    activeDrawerTaskId: null,
    drawerActiveTab: 'all',

    // Completion Modal State
    completingTaskId: null,
    completionAttachedImageData: null
  };

  // Helper: Format Date
  function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTimeDisplay(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  // Calculate status for any date string relative to reference date (August 24, 2026)
  function calculateDateStatus(dateStr) {
    if (!dateStr) return 'Upcoming';
    const cleanStr = String(dateStr).split('T')[0];
    const targetDate = new Date(cleanStr + 'T00:00:00');
    const diffTime = targetDate.getTime() - TODAY.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Overdue';      // Red
    } else if (diffDays === 0) {
      return 'Due Today';    // Blue
    } else if (diffDays > 0 && diffDays <= 3) {
      return 'Due Soon';     // Orange
    } else {
      return 'Upcoming';     // Gray
    }
  }

  // Calculate task status based on scheduled due date, next recurring cycle, and completed state
  function calculateTaskStatus(task) {
    if (!task) return 'Upcoming';
    const isComplete = (task.status === 'Completed' || Boolean(task.completedAt));
    if (isComplete) {
      const nextCycleDate = task.nextCycleDueDate || calculateNextCycleDate(task.dueDate || TODAY_STR, task.cycle);
      const hasNextCycle = Boolean(nextCycleDate && task.cycle && task.cycle !== 'One-Time Inspection');
      if (hasNextCycle) {
        return calculateDateStatus(nextCycleDate);
      }
      return 'Completed';    // Green
    }
    return calculateDateStatus(task.dueDate);
  }

  // Calculate Next Maintenance Cycle Due Date
  function calculateNextCycleDate(baseDateStr, cycle) {
    if (!baseDateStr || !cycle || cycle === 'One-Time Inspection') return null;
    const cleanStr = String(baseDateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return null;

    const base = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    switch (cycle) {
      case 'Weekly':
        base.setDate(base.getDate() + 7);
        break;
      case 'Bi-Weekly':
        base.setDate(base.getDate() + 14);
        break;
      case 'Monthly':
        base.setMonth(base.getMonth() + 1);
        break;
      case 'Quarterly':
      case 'Every 3 Months':
        base.setMonth(base.getMonth() + 3);
        break;
      case 'Semi-Annual':
      case 'Every 6 Months':
        base.setMonth(base.getMonth() + 6);
        break;
      case 'Every 9 Months':
        base.setMonth(base.getMonth() + 9);
        break;
      case 'Annual':
      case 'Every 12 Months':
        base.setFullYear(base.getFullYear() + 1);
        break;
      case 'Custom Scheduled Date':
        return null;
      default:
        return null;
    }

    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getStatusMeta(status) {
    switch (status) {
      case 'Overdue':
        return { label: 'Overdue', className: 'chip-overdue', dotClass: 'dot-overdue', rank: 1 };
      case 'Due Today':
        return { label: 'Due Today', className: 'chip-due-today', dotClass: 'dot-due-today', rank: 2 };
      case 'Due Soon':
        return { label: 'Due Soon', className: 'chip-due-soon', dotClass: 'dot-due-soon', rank: 3 };
      case 'Upcoming':
        return { label: 'Upcoming', className: 'chip-upcoming', dotClass: 'dot-upcoming', rank: 4 };
      case 'Completed':
        return { label: 'Completed', className: 'chip-completed', dotClass: 'dot-completed', rank: 5 };
      default:
        return { label: status, className: 'chip-upcoming', dotClass: 'dot-upcoming', rank: 99 };
    }
  }

  function getConditionClass(condition) {
    switch (condition) {
      case 'Excellent': return 'cond-excellent';
      case 'Good': return 'cond-good';
      case 'Fair': return 'cond-fair';
      case 'Needs Repair': return 'cond-repair';
      case 'Critical': return 'cond-critical';
      default: return 'cond-custom';
    }
  }

  function isAdmin() {
    return state.auth.role === 'admin';
  }

  function getCurrentUserLabel() {
    if (isAdmin()) return 'Admin (HQ Operations)';
    return state.auth.store || 'Store Account';
  }

  // =========================================================================
  // Firebase Cloud Database Synchronization
  // =========================================================================

  function syncTaskToCloud(task) {
    if (!isFirebaseReady || !db) return;
    db.collection('tasks').doc(task.id).set(task).catch(err => {
      console.warn('Error saving task to Firebase:', err);
    });
  }

  function syncStoreToCloud(store) {
    if (!isFirebaseReady || !db) return;
    if (!store.id) {
      store.id = 'store-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    }
    db.collection('stores').doc(store.id).set(store).catch(err => {
      console.warn('Error saving store to Firebase:', err);
    });
  }

  function removeStoreFromCloud(storeId) {
    if (!isFirebaseReady || !db) return;
    db.collection('stores').doc(storeId).delete().catch(err => {
      console.warn('Error deleting store from Firebase:', err);
    });
  }

  function removeTaskFromCloud(taskId) {
    if (!isFirebaseReady || !db) return;
    db.collection('tasks').doc(taskId).delete().catch(err => {
      console.warn('Error deleting task from Firebase:', err);
    });
  }

  function syncMetadataToCloud() {
    if (!isFirebaseReady || !db) return;
    db.collection('settings').doc('metadata').set({
      categories: state.categories,
      conditions: state.conditions,
      updatedAt: new Date().toISOString()
    }).catch(err => {
      console.warn('Error saving metadata to Firebase:', err);
    });
  }

  // Listen to Real-time Cloud updates from Firebase
  function setupCloudRealtimeListeners() {
    if (!isFirebaseReady || !db) return;

    // 1. Live Stores Listener
    db.collection('stores').onSnapshot((snapshot) => {
      const cloudStores = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.name) {
          if (!data.id) data.id = doc.id;
          cloudStores.push(data);
        }
      });

      if (snapshot.empty && state.storeAccounts && state.storeAccounts.length > 0) {
        state.storeAccounts.forEach(s => syncStoreToCloud(s));
      } else if (!snapshot.empty && cloudStores.length > 0) {
        cloudStores.sort((a, b) => (a.createdAt || a.name || '').localeCompare(b.createdAt || b.name || ''));
        state.storeAccounts = cloudStores;
        localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(state.storeAccounts));
        syncStoreOptions();
        renderStoreAccountsList();
        render();
      } else if (snapshot.empty && (!state.storeAccounts || state.storeAccounts.length === 0)) {
        state.storeAccounts = [...DEFAULT_STORES];
        state.storeAccounts.forEach(s => syncStoreToCloud(s));
        localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(state.storeAccounts));
        syncStoreOptions();
        renderStoreAccountsList();
        render();
      }
    }, err => {
      console.warn('Stores realtime sync note:', err.message);
    });

    // 2. Live Tasks Listener
    db.collection('tasks').onSnapshot((snapshot) => {
      const cloudTasks = [];
      snapshot.forEach(doc => {
        const t = doc.data();
        if (t.status !== 'Completed') {
          t.status = calculateTaskStatus(t);
        }
        cloudTasks.push(t);
      });

      if (snapshot.empty && state.tasks && state.tasks.length > 0) {
        state.tasks.forEach(t => syncTaskToCloud(t));
      } else if (!snapshot.empty) {
        state.tasks = cloudTasks;
        state.tasks.forEach(t => {
          if (t.proofImage && t.comments && t.comments.length) {
            const verifComment = [...t.comments].reverse().find(c => c.isVerification);
            if (verifComment && !verifComment.proofImage) {
              verifComment.proofImage = t.proofImage;
            }
          }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
        render();
      }
    }, err => {
      console.warn('Tasks realtime sync note:', err.message);
    });

    // 3. Live Metadata (Categories & Conditions) Listener
    db.collection('settings').doc('metadata').onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data.categories && Array.isArray(data.categories)) {
          state.categories = data.categories;
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(state.categories));
          syncCategoryOptions();
        }
        if (data.conditions && Array.isArray(data.conditions)) {
          state.conditions = data.conditions;
          localStorage.setItem(CONDITIONS_STORAGE_KEY, JSON.stringify(state.conditions));
          syncConditionOptions();
        }
        render();
      } else {
        syncMetadataToCloud();
      }
    }, err => {
      console.warn('Metadata realtime sync note:', err.message);
    });

    // 4. Live Notifications Listener
    db.collection('notifications').orderBy('createdAt', 'desc').limit(40).onSnapshot((snapshot) => {
      const cloudNotifs = [];
      snapshot.forEach(doc => {
        const n = doc.data();
        if (!n.id) n.id = doc.id;
        cloudNotifs.push(n);
      });

      if (!snapshot.empty) {
        // Detect brand new notifications to show toast popup
        const currentIds = new Set((state.notifications || []).map(item => item.id));
        cloudNotifs.forEach(n => {
          if (!currentIds.has(n.id) && isNotificationRelevant(n) && n.sender !== getCurrentUserLabel()) {
            showToast(`🔔 ${n.title}: ${n.message}`);
          }
        });

        state.notifications = cloudNotifs;
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state.notifications));
        renderNotifications();
      }
    }, err => {
      console.warn('Notifications realtime sync note:', err.message);
    });
  }

  // Save to localStorage & Cloud
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.auth));
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(state.storeAccounts));
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(state.categories));
      localStorage.setItem(CONDITIONS_STORAGE_KEY, JSON.stringify(state.conditions));
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state.notifications || []));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  // Load initial state from storage
  function loadState() {
    try {
      const savedConditions = localStorage.getItem(CONDITIONS_STORAGE_KEY);
      if (savedConditions) {
        state.conditions = JSON.parse(savedConditions);
      } else {
        state.conditions = [...DEFAULT_CONDITIONS];
      }

      const savedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (savedCategories) {
        state.categories = JSON.parse(savedCategories);
      } else {
        state.categories = [...DEFAULT_CATEGORIES];
      }

      const savedStores = localStorage.getItem(STORES_STORAGE_KEY);
      if (savedStores) {
        state.storeAccounts = JSON.parse(savedStores);
      }
      if (!state.storeAccounts || state.storeAccounts.length === 0) {
        state.storeAccounts = [...DEFAULT_STORES];
      }

      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        state.auth = JSON.parse(savedAuth);
      }

      const savedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (savedNotifications) {
        state.notifications = JSON.parse(savedNotifications);
      } else {
        state.notifications = [];
      }

      const rawTasks = localStorage.getItem(STORAGE_KEY);
      if (rawTasks) {
        state.tasks = JSON.parse(rawTasks);
      } else {
        state.tasks = [];
      }
    } catch (e) {
      console.warn('Error loading from localStorage, resetting to defaults', e);
      state.conditions = [...DEFAULT_CONDITIONS];
      state.categories = [...DEFAULT_CATEGORIES];
      state.storeAccounts = [];
      state.notifications = [];
      state.tasks = [];
    }

    state.tasks.forEach(t => {
      if (t.status !== 'Completed') {
        t.status = calculateTaskStatus(t);
      }
      if (t.proofImage && t.comments && t.comments.length) {
        const verifComment = [...t.comments].reverse().find(c => c.isVerification);
        if (verifComment && !verifComment.proofImage) {
          verifComment.proofImage = t.proofImage;
        }
      }
    });
  }

  // DOM Elements Cache
  const el = {
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app'),
    tabStoreLogin: document.getElementById('tab-store-login'),
    tabAdminLogin: document.getElementById('tab-admin-login'),
    loginForm: document.getElementById('login-form'),
    storeLoginFields: document.getElementById('store-login-fields'),
    adminLoginFields: document.getElementById('admin-login-fields'),
    loginStoreSelect: document.getElementById('login-store-select'),
    loginStorePin: document.getElementById('login-store-pin'),
    loginAdminUser: document.getElementById('login-admin-user'),
    loginAdminPassword: document.getElementById('login-admin-password'),
    loginErrorMsg: document.getElementById('login-error-msg'),

    // Sidebar & Navigation
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    btnCloseSidebar: document.getElementById('btn-close-sidebar'),
    mobileRoleDot: document.getElementById('mobile-role-dot'),
    userDisplayName: document.getElementById('user-display-name'),
    userRoleLabel: document.getElementById('user-role-label'),
    roleDot: document.getElementById('role-dot'),
    adminStoreSwitcherWrapper: document.getElementById('admin-store-switcher-wrapper'),
    adminStoreQuickSwitch: document.getElementById('admin-store-quick-switch'),
    btnManageStores: document.getElementById('btn-manage-stores'),
    btnLogout: document.getElementById('btn-logout'),
    btnCreateTask: document.getElementById('btn-create-task'),

    // Sidebar Badge Counts
    sideCountAll: document.getElementById('side-count-all'),
    sideCountOverdue: document.getElementById('side-count-overdue'),
    sideCountDueToday: document.getElementById('side-count-due-today'),
    sideCountDueSoon: document.getElementById('side-count-due-soon'),
    sideCountUpcoming: document.getElementById('side-count-upcoming'),
    sideCountCompleted: document.getElementById('side-count-completed'),
    sidebarLinks: document.querySelectorAll('.sidebar-link[data-sidebar-filter]'),

    viewTitle: document.getElementById('view-title'),
    viewCaption: document.getElementById('view-caption'),
    currentDateDisplay: document.getElementById('current-date-display'),

    // Notification Center
    btnNotificationBell: document.getElementById('btn-notification-bell'),
    notificationBadge: document.getElementById('notification-badge'),
    notificationDropdown: document.getElementById('notification-dropdown'),
    notificationUnreadPill: document.getElementById('notification-unread-pill'),
    notificationList: document.getElementById('notification-list'),
    btnMarkAllRead: document.getElementById('btn-mark-all-read'),
    btnClearNotifications: document.getElementById('btn-clear-notifications'),

    // KPI counters
    countAll: document.getElementById('count-all'),
    countOverdue: document.getElementById('count-overdue'),
    countDueToday: document.getElementById('count-due-today'),
    countDueSoon: document.getElementById('count-due-soon'),
    countUpcoming: document.getElementById('count-upcoming'),
    countCompleted: document.getElementById('count-completed'),
    kpiCards: document.querySelectorAll('.kpi-card'),

    // Filters
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    filterStoreWrapper: document.getElementById('filter-store-wrapper'),
    filterStore: document.getElementById('filter-store'),
    filterCategory: document.getElementById('filter-category'),
    sortSelect: document.getElementById('sort-select'),
    activeFiltersBar: document.getElementById('active-filters-bar'),
    activeStatusTag: document.getElementById('active-status-tag'),
    btnClearAllFilters: document.getElementById('btn-clear-all-filters'),

    // View toggles & Calendar
    viewToggleGrid: document.getElementById('view-toggle-grid'),
    viewToggleTable: document.getElementById('view-toggle-table'),
    viewToggleCalendar: document.getElementById('view-toggle-calendar'),
    taskGrid: document.getElementById('task-grid'),
    taskTableWrapper: document.getElementById('task-table-wrapper'),
    taskTableBody: document.getElementById('task-table-body'),
    taskCalendarWrapper: document.getElementById('task-calendar-wrapper'),
    calendarMonthTitle: document.getElementById('calendar-month-title'),
    btnCalendarPrev: document.getElementById('btn-calendar-prev'),
    btnCalendarToday: document.getElementById('btn-calendar-today'),
    btnCalendarNext: document.getElementById('btn-calendar-next'),
    calendarDaysGrid: document.getElementById('calendar-days-grid'),
    emptyState: document.getElementById('empty-state'),
    btnEmptyReset: document.getElementById('btn-empty-reset'),

    // Store Accounts Management Modal
    storeManagementModal: document.getElementById('store-management-modal'),
    btnStoreMgmtClose: document.getElementById('btn-store-mgmt-close'),
    btnStoreMgmtDone: document.getElementById('btn-store-mgmt-done'),
    storeAccountsTbody: document.getElementById('store-accounts-tbody'),
    addStoreForm: document.getElementById('add-store-form'),
    newStoreName: document.getElementById('new-store-name'),
    newStoreCode: document.getElementById('new-store-code'),
    newStoreManager: document.getElementById('new-store-manager'),
    newStorePin: document.getElementById('new-store-pin'),

    // Completion Verification Modal
    completionModal: document.getElementById('completion-modal'),
    completionModalTitle: document.getElementById('completion-modal-title'),
    btnCompletionModalClose: document.getElementById('btn-completion-modal-close'),
    btnCompletionModalCancel: document.getElementById('btn-completion-modal-cancel'),
    completionForm: document.getElementById('completion-form'),
    completionTaskId: document.getElementById('completion-task-id'),
    completionAssetName: document.getElementById('completion-asset-name'),
    completionAssetCategory: document.getElementById('completion-asset-category'),
    completionAssetLocation: document.getElementById('completion-asset-location'),
    completionStatusPill: document.getElementById('completion-status-pill'),
    completionDateInput: document.getElementById('completion-date-input'),
    completionStaffName: document.getElementById('completion-staff-name'),
    completionRemarksInput: document.getElementById('completion-remarks-input'),
    completionConditionSelect: document.getElementById('completion-condition-select'),
    imageUploadZone: document.getElementById('image-upload-zone'),
    completionImageFile: document.getElementById('completion-image-file'),
    uploadZonePrompt: document.getElementById('upload-zone-prompt'),
    imagePreviewContainer: document.getElementById('image-preview-container'),
    imagePreviewImg: document.getElementById('image-preview-img'),
    btnRemoveImage: document.getElementById('btn-remove-image'),

    // Modal: Create / Edit
    taskModal: document.getElementById('task-modal'),
    modalTitle: document.getElementById('modal-title'),
    btnModalClose: document.getElementById('btn-modal-close'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    taskForm: document.getElementById('task-form'),
    formTaskId: document.getElementById('form-task-id'),
    formAssetName: document.getElementById('form-asset-name'),

    // Category controls
    formCategory: document.getElementById('form-category'),
    btnToggleCustomCategory: document.getElementById('btn-toggle-custom-category'),
    formCustomCategoryContainer: document.getElementById('form-custom-category-container'),
    formCustomCategoryInput: document.getElementById('form-custom-category-input'),
    btnSaveCustomCategory: document.getElementById('btn-save-custom-category'),
    btnCancelCustomCategory: document.getElementById('btn-cancel-custom-category'),

    // Condition controls
    formCondition: document.getElementById('form-condition'),
    btnToggleCustomCondition: document.getElementById('btn-toggle-custom-condition'),
    formCustomConditionContainer: document.getElementById('form-custom-condition-container'),
    formCustomConditionInput: document.getElementById('form-custom-condition-input'),
    btnSaveCustomCondition: document.getElementById('btn-save-custom-condition'),
    btnCancelCustomCondition: document.getElementById('btn-cancel-custom-condition'),

    formStore: document.getElementById('form-store'),
    formLocation: document.getElementById('form-location'),
    formDueDate: document.getElementById('form-due-date'),
    formCycle: document.getElementById('form-cycle'),
    formNextCycleDate: document.getElementById('form-next-cycle-date'),
    formNextCycleStatusPreview: document.getElementById('form-next-cycle-status-preview'),
    btnAutoCalcCycle: document.getElementById('btn-auto-calc-cycle'),
    formSerial: document.getElementById('form-serial'),
    formCost: document.getElementById('form-cost'),
    formPriority: document.getElementById('form-priority'),
    formStatusOverrideContainer: document.getElementById('form-status-override-container'),
    formStatusOverride: document.getElementById('form-status-override'),
    formDescription: document.getElementById('form-description'),

    // Comments & Activity Drawer
    commentsDrawer: document.getElementById('comments-drawer'),
    btnDrawerClose: document.getElementById('btn-drawer-close'),
    drawerAssetName: document.getElementById('drawer-asset-name'),
    drawerAssetMeta: document.getElementById('drawer-asset-meta'),
    drawerStatusBadge: document.getElementById('drawer-status-badge'),
    drawerDueBadge: document.getElementById('drawer-due-badge'),
    drawerConditionBadge: document.getElementById('drawer-condition-badge'),
    drawerCycleBadge: document.getElementById('drawer-cycle-badge'),
    drawerInstructionsBox: document.getElementById('drawer-instructions-box'),
    drawerInstructionsToggle: document.getElementById('drawer-instructions-toggle'),
    drawerInstructionsContent: document.getElementById('drawer-instructions-content'),
    drawerInstructionsText: document.getElementById('drawer-instructions-text'),
    tabAllCount: document.getElementById('tab-all-count'),
    tabPhotosCount: document.getElementById('tab-photos-count'),
    tabRemarksCount: document.getElementById('tab-remarks-count'),
    drawerViewTimeline: document.getElementById('drawer-view-timeline'),
    drawerViewPhotos: document.getElementById('drawer-view-photos'),
    photosGalleryGrid: document.getElementById('photos-gallery-grid'),
    drawerQuickChips: document.getElementById('drawer-quick-chips'),
    commentsList: document.getElementById('comments-list'),
    commentForm: document.getElementById('comment-form'),
    commentAuthorLabel: document.getElementById('comment-author-label'),
    commentInput: document.getElementById('comment-input'),

    // Lightbox Modal
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxCaption: document.getElementById('lightbox-caption'),
    btnLightboxClose: document.getElementById('btn-lightbox-close'),

    // Confirmation Dialog Card Modal
    confirmModal: document.getElementById('confirm-modal'),
    confirmModalIcon: document.getElementById('confirm-modal-icon'),
    confirmModalTitle: document.getElementById('confirm-modal-title'),
    confirmModalMessage: document.getElementById('confirm-modal-message'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    btnConfirmOk: document.getElementById('btn-confirm-ok'),

    // Export Reports Modal
    btnOpenExport: document.getElementById('btn-open-export'),
    exportModal: document.getElementById('export-modal'),
    btnExportClose: document.getElementById('btn-export-close'),
    btnExportCancel: document.getElementById('btn-export-cancel'),
    exportScopeSelect: document.getElementById('export-scope-select'),
    exportTargetStore: document.getElementById('export-target-store'),
    exportItemCount: document.getElementById('export-item-count'),
    exportComplianceRate: document.getElementById('export-compliance-rate'),
    exportGeneratedBy: document.getElementById('export-generated-by'),
    btnExportPdf: document.getElementById('btn-export-pdf'),
    btnExportCsv: document.getElementById('btn-export-csv'),

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
  };

  let toastTimeout = null;
  function showToast(message) {
    if (!el.toast) return;
    el.toastMessage.textContent = message;
    el.toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.toast.classList.add('hidden');
    }, 3500);
  }

  function showConfirmModal({ title, message, iconType = 'primary', okText = 'Confirm', okClass = 'btn-primary', onConfirm }) {
    if (!el.confirmModal) return;

    if (el.confirmModalTitle) el.confirmModalTitle.textContent = title;
    if (el.confirmModalMessage) el.confirmModalMessage.innerHTML = message;

    if (el.confirmModalIcon) {
      if (iconType === 'danger') {
        el.confirmModalIcon.className = 'confirm-modal-icon-wrapper danger';
        el.confirmModalIcon.innerHTML = `
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path><path d="M14 11v6"></path>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
          </svg>
        `;
      } else {
        el.confirmModalIcon.className = 'confirm-modal-icon-wrapper';
        el.confirmModalIcon.innerHTML = `
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
        `;
      }
    }

    if (el.btnConfirmOk) {
      el.btnConfirmOk.textContent = okText;
      el.btnConfirmOk.className = `btn ${okClass}`;
      el.btnConfirmOk.onclick = () => {
        closeConfirmModal();
        if (typeof onConfirm === 'function') onConfirm();
      };
    }

    if (el.btnConfirmCancel) {
      el.btnConfirmCancel.onclick = () => {
        closeConfirmModal();
      };
    }

    el.confirmModal.classList.add('open');
    el.confirmModal.setAttribute('aria-hidden', 'false');
  }

  function closeConfirmModal() {
    if (!el.confirmModal) return;
    el.confirmModal.classList.remove('open');
    el.confirmModal.setAttribute('aria-hidden', 'true');
  }

  // =========================================================================
  // Multi-Account Real-Time Notification Center
  // =========================================================================

  function isNotificationRelevant(notif) {
    if (!notif) return false;
    if (isAdmin()) {
      return notif.target === 'admin' || notif.target === 'all';
    } else {
      const currentStore = state.auth.store;
      return notif.target === currentStore || notif.target === 'all';
    }
  }

  function sendAppNotification({ target, type, title, message, taskId, sender }) {
    const notif = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      target: target || 'all',
      type: type || 'task_updated',
      title: title || 'Task Alert',
      message: message || '',
      taskId: taskId || null,
      sender: sender || getCurrentUserLabel(),
      createdAt: new Date().toISOString(),
      readBy: []
    };

    state.notifications = state.notifications || [];
    state.notifications.unshift(notif);
    if (state.notifications.length > 50) state.notifications.pop();
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state.notifications));

    // Push to Firestore Cloud
    if (isFirebaseReady && db) {
      db.collection('notifications').doc(notif.id).set(notif).catch(e => console.warn('Notification sync note:', e));
    }

    renderNotifications();
  }

  function formatTimeAgo(isoStr) {
    if (!isoStr) return '';
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function renderNotifications() {
    if (!el.notificationList) return;
    const userRoleOrStore = isAdmin() ? 'admin' : (state.auth.store || 'store');
    const relevantNotifs = (state.notifications || []).filter(isNotificationRelevant);

    const unreadNotifs = relevantNotifs.filter(n => !(n.readBy && n.readBy.includes(userRoleOrStore)));
    const unreadCount = unreadNotifs.length;

    if (el.notificationBadge) {
      if (unreadCount > 0) {
        el.notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        el.notificationBadge.classList.remove('hidden');
      } else {
        el.notificationBadge.classList.add('hidden');
      }
    }

    if (el.notificationUnreadPill) {
      el.notificationUnreadPill.textContent = `${unreadCount} new`;
    }

    if (relevantNotifs.length === 0) {
      el.notificationList.innerHTML = `
        <div class="notification-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span>No notifications yet</span>
        </div>
      `;
      return;
    }

    el.notificationList.innerHTML = relevantNotifs.map(n => {
      const isUnread = !(n.readBy && n.readBy.includes(userRoleOrStore));
      let iconClass = 'type-updated';
      let iconSvg = '📌';
      if (n.type === 'task_created') {
        iconClass = 'type-created';
        iconSvg = '➕';
      } else if (n.type === 'task_completed') {
        iconClass = 'type-completed';
        iconSvg = '✅';
      } else if (n.type === 'comment_added') {
        iconClass = 'type-comment';
        iconSvg = '💬';
      } else if (n.type === 'task_reopened') {
        iconClass = 'type-created';
        iconSvg = '🔄';
      }

      const timeAgo = formatTimeAgo(n.createdAt);

      return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="window.assetApp.handleNotificationClick('${n.id}', '${n.taskId || ''}')">
          <div class="notification-icon-box ${iconClass}">${iconSvg}</div>
          <div class="notification-content">
            <div class="notification-item-title">${escapeHTML(n.title)}</div>
            <div class="notification-item-msg">${escapeHTML(n.message)}</div>
            <div class="notification-item-time">${timeAgo} • From ${escapeHTML(n.sender || 'System')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function toggleNotificationDropdown() {
    if (!el.notificationDropdown) return;
    const isHidden = el.notificationDropdown.classList.contains('hidden');
    if (isHidden) {
      el.notificationDropdown.classList.remove('hidden');
      renderNotifications();
    } else {
      el.notificationDropdown.classList.add('hidden');
    }
  }

  function closeNotificationDropdown() {
    if (el.notificationDropdown) {
      el.notificationDropdown.classList.add('hidden');
    }
  }

  function markNotificationRead(notifId) {
    const notif = (state.notifications || []).find(n => n.id === notifId);
    if (!notif) return;
    const userRoleOrStore = isAdmin() ? 'admin' : (state.auth.store || 'store');
    notif.readBy = notif.readBy || [];
    if (!notif.readBy.includes(userRoleOrStore)) {
      notif.readBy.push(userRoleOrStore);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state.notifications));
      if (isFirebaseReady && db) {
        db.collection('notifications').doc(notif.id).update({ readBy: notif.readBy }).catch(() => {});
      }
      renderNotifications();
    }
  }

  function markAllNotificationsRead() {
    const userRoleOrStore = isAdmin() ? 'admin' : (state.auth.store || 'store');
    (state.notifications || []).forEach(notif => {
      if (isNotificationRelevant(notif)) {
        notif.readBy = notif.readBy || [];
        if (!notif.readBy.includes(userRoleOrStore)) {
          notif.readBy.push(userRoleOrStore);
          if (isFirebaseReady && db) {
            db.collection('notifications').doc(notif.id).update({ readBy: notif.readBy }).catch(() => {});
          }
        }
      }
    });
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state.notifications));
    renderNotifications();
    showToast('All notifications marked as read');
  }

  function clearNotifications() {
    const userRoleOrStore = isAdmin() ? 'admin' : (state.auth.store || 'store');
    state.notifications = (state.notifications || []).filter(n => !isNotificationRelevant(n));
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state.notifications));
    renderNotifications();
    showToast('Notifications cleared');
  }

  function handleNotificationClick(notifId, taskId) {
    markNotificationRead(notifId);
    closeNotificationDropdown();
    if (taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        openCommentsDrawer(taskId);
      }
    }
  }

  // =========================================================================
  // 1-Click Audit & Compliance PDF and Excel/CSV Reports
  // =========================================================================

  function getExportDataset(scope = 'filtered') {
    const baseTasks = isAdmin()
      ? state.tasks
      : state.tasks.filter(t => t.store === state.auth.store);

    if (scope === 'filtered') {
      return getFilteredTasks();
    } else if (scope === 'completed') {
      return baseTasks.filter(t => t.status === 'Completed' || t.completedAt);
    } else if (scope === 'overdue') {
      return baseTasks.filter(t => t.status !== 'Completed' && !t.completedAt);
    }
    return baseTasks;
  }

  function updateExportPreview() {
    if (!el.exportModal) return;
    const scope = el.exportScopeSelect ? el.exportScopeSelect.value : 'filtered';
    const tasks = getExportDataset(scope);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed' || t.completedAt).length;
    const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    if (el.exportItemCount) el.exportItemCount.textContent = `${totalTasks} items`;
    if (el.exportComplianceRate) el.exportComplianceRate.textContent = `${rate}% (${completedTasks} completed)`;
    if (el.exportTargetStore) {
      el.exportTargetStore.textContent = !isAdmin()
        ? state.auth.store
        : (state.filterStore === 'all' ? 'All Stores (Global)' : state.filterStore);
    }
    if (el.exportGeneratedBy) {
      el.exportGeneratedBy.textContent = getCurrentUserLabel();
    }
  }

  function openExportModal() {
    if (!el.exportModal) return;
    updateExportPreview();
    el.exportModal.classList.add('open');
    el.exportModal.setAttribute('aria-hidden', 'false');
  }

  function closeExportModal() {
    if (!el.exportModal) return;
    el.exportModal.classList.remove('open');
    el.exportModal.setAttribute('aria-hidden', 'true');
  }

  function exportToCSV() {
    const scope = el.exportScopeSelect ? el.exportScopeSelect.value : 'filtered';
    const tasks = getExportDataset(scope);

    if (tasks.length === 0) {
      alert('No tasks match the selected export scope.');
      return;
    }

    const headers = [
      'Task ID',
      'Asset Name',
      'Category',
      'Assigned Store',
      'Location',
      'Serial Number',
      'Maintenance Cycle',
      'Scheduled Due Date',
      'Completed Date',
      'Status',
      'Asset Condition',
      'Performed By (Staff Name)',
      'Estimated Value/Cost ($)',
      'Completion Remarks',
      'Verified Photo Evidence URL',
      'Total Remarks Logged'
    ];

    const rows = tasks.map(t => {
      const isComplete = t.status === 'Completed' || Boolean(t.completedAt);
      const commentsCount = (t.comments && t.comments.length) || 0;
      const latestPhoto = t.proofImage || (t.comments && [...t.comments].reverse().find(c => c.proofImage)?.proofImage) || '';

      return [
        t.id,
        t.assetName,
        t.category,
        t.store,
        t.location,
        t.serialNumber || 'N/A',
        t.cycle,
        t.dueDate,
        t.completedAt || 'Pending',
        t.status,
        t.condition,
        t.completedBy || (isComplete ? 'Store Staff' : 'Not Completed'),
        t.estimatedCost != null ? `$${t.estimatedCost}` : '—',
        t.completionRemarks || '—',
        latestPhoto,
        commentsCount
      ].map(field => `"${String(field || '').replace(/"/g, '""')}"`);
    });

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    const storePrefix = !isAdmin() ? state.auth.store.replace(/\s+/g, '_') : 'AllStores';
    downloadLink.href = url;
    downloadLink.download = `AssetFlow_Audit_Report_${storePrefix}_${dateStamp}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    closeExportModal();
    showToast(`Downloaded CSV Audit Report (${tasks.length} items)`);
  }

  function generatePDFReport() {
    const scope = el.exportScopeSelect ? el.exportScopeSelect.value : 'filtered';
    const tasks = getExportDataset(scope);

    if (tasks.length === 0) {
      alert('No tasks match the selected export scope.');
      return;
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed' || t.completedAt).length;
    const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
    const complianceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const excellentCount = tasks.filter(t => t.condition === 'Excellent').length;
    const goodCount = tasks.filter(t => t.condition === 'Good').length;
    const needsRepairCount = tasks.filter(t => t.condition === 'Needs Repair' || t.condition === 'Critical').length;

    const targetStoreText = !isAdmin() ? state.auth.store : (state.filterStore === 'all' ? 'All Stores (Global)' : state.filterStore);
    const dateFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    let container = document.getElementById('audit-print-report-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'audit-print-report-container';
      document.body.appendChild(container);
    }

    const tableRowsHtml = tasks.map((t, idx) => {
      const isComplete = t.status === 'Completed' || Boolean(t.completedAt);
      const latestPhoto = t.proofImage || (t.comments && [...t.comments].reverse().find(c => c.proofImage)?.proofImage) || '';
      const performer = t.completedBy || (isComplete ? 'Store Staff' : '—');
      const remarks = t.completionRemarks || (t.comments && t.comments.length ? t.comments[t.comments.length - 1].text : '—');

      return `
        <tr>
          <td><strong>#${idx + 1}</strong></td>
          <td>
            <strong>${escapeHTML(t.assetName)}</strong>
            ${t.serialNumber ? `<br><small style="color: #64748B;">SN: ${escapeHTML(t.serialNumber)}</small>` : ''}
          </td>
          <td>${escapeHTML(t.category)}</td>
          <td>${escapeHTML(t.store)}<br><small style="color: #64748B;">${escapeHTML(t.location)}</small></td>
          <td>${escapeHTML(t.cycle)}</td>
          <td>${formatDateDisplay(t.dueDate)}</td>
          <td>${isComplete ? formatDateDisplay(t.completedAt) : '<span style="color: #DC2626;">Pending</span>'}</td>
          <td><strong style="color: #0F172A;">${escapeHTML(performer)}</strong></td>
          <td>
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10.5px; background: ${t.condition === 'Excellent' ? '#DCFCE7; color: #15803D' : (t.condition === 'Good' ? '#E0F2FE; color: #0369A1' : '#FEE2E2; color: #DC2626')};">
              ${escapeHTML(t.condition)}
            </span>
          </td>
          <td style="max-width: 180px; word-break: break-word;">${escapeHTML(remarks)}</td>
          <td style="text-align: center;">
            ${latestPhoto ? `<img src="${latestPhoto}" alt="Proof" class="audit-proof-thumb">` : '<span style="color: #94A3B8; font-size: 10px;">No photo</span>'}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="audit-report-wrapper">
        <div class="audit-report-header">
          <div class="audit-report-brand">
            <div class="audit-report-brand-icon">AF</div>
            <div>
              <h1 class="audit-report-title">AssetFlow &bull; Maintenance &amp; Compliance Audit Report</h1>
              <p class="audit-report-subtitle">Official Equipment Preventive Maintenance Inspection Log &amp; Safety Compliance Record</p>
            </div>
          </div>
          <div class="audit-report-meta">
            <div><strong>Generated Date:</strong> ${dateFormatted}</div>
            <div><strong>Audited Facility:</strong> ${escapeHTML(targetStoreText)}</div>
            <div><strong>Report Generated By:</strong> ${escapeHTML(getCurrentUserLabel())}</div>
          </div>
        </div>

        <div class="audit-kpi-summary-box">
          <div class="audit-kpi-card">
            <div class="audit-kpi-label">Total Assets Inspected</div>
            <div class="audit-kpi-val">${totalTasks}</div>
          </div>
          <div class="audit-kpi-card">
            <div class="audit-kpi-label">Compliance / Completion Rate</div>
            <div class="audit-kpi-val" style="color: #10B981;">${complianceRate}%</div>
          </div>
          <div class="audit-kpi-card">
            <div class="audit-kpi-label">Overdue Maintenance</div>
            <div class="audit-kpi-val" style="color: ${overdueTasks > 0 ? '#DC2626' : '#10B981'};">${overdueTasks}</div>
          </div>
          <div class="audit-kpi-card">
            <div class="audit-kpi-label">Equipment Condition Rating</div>
            <div class="audit-kpi-val" style="font-size: 14px; margin-top: 6px;">
              <span style="color: #16A34A;">${excellentCount} Exc</span> &bull; 
              <span style="color: #0284C7;">${goodCount} Good</span> &bull; 
              <span style="color: #DC2626;">${needsRepairCount} Rep</span>
            </div>
          </div>
        </div>

        <table class="audit-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Asset &amp; Serial ID</th>
              <th>Category</th>
              <th>Store Location</th>
              <th>Cycle</th>
              <th>Scheduled</th>
              <th>Completed</th>
              <th>Performed By</th>
              <th>Condition</th>
              <th>Remarks / Work Done</th>
              <th>Proof Photo</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="audit-signoff-section">
          <div class="audit-signoff-box">
            <div class="audit-signoff-title">STORE MANAGER VERIFICATION SIGN-OFF</div>
            <div class="audit-signature-line"></div>
            <div class="audit-signature-meta">
              <span>Signature: __________________________</span>
              <span>Date: ____ / ____ / ________</span>
            </div>
          </div>
          <div class="audit-signoff-box">
            <div class="audit-signoff-title">COMPLIANCE AUDITOR / INSPECTOR SIGN-OFF</div>
            <div class="audit-signature-line"></div>
            <div class="audit-signature-meta">
              <span>Signature: __________________________</span>
              <span>Date: ____ / ____ / ________</span>
            </div>
          </div>
        </div>
      </div>
    `;

    closeExportModal();
    setTimeout(() => {
      window.print();
    }, 150);
  }

  // Populate dynamic store dropdowns
  function syncStoreOptions() {
    const storeNames = state.storeAccounts.map(s => s.name);

    if (storeNames.length === 0) {
      el.loginStoreSelect.innerHTML = `<option value="" disabled selected>No store branches configured</option>`;
      el.adminStoreQuickSwitch.innerHTML = `<option value="all">All Stores (Global)</option>`;
      el.filterStore.innerHTML = `<option value="all">All Stores</option>`;
      el.formStore.innerHTML = `<option value="" disabled selected>No stores available (Add store first)</option>`;
      return;
    }

    el.loginStoreSelect.innerHTML = storeNames.map(name =>
      `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`
    ).join('');

    el.adminStoreQuickSwitch.innerHTML = `
      <option value="all">All Stores (Global)</option>
      ${storeNames.map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('')}
    `;
    el.adminStoreQuickSwitch.value = state.filterStore;

    el.filterStore.innerHTML = `
      <option value="all">All Stores</option>
      ${storeNames.map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('')}
    `;
    el.filterStore.value = state.filterStore;

    el.formStore.innerHTML = `
      <option value="" disabled selected>Select Store Location...</option>
      ${storeNames.map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('')}
    `;
  }

  // Populate dynamic category options
  function syncCategoryOptions() {
    const currentFilter = el.filterCategory.value || 'all';
    el.filterCategory.innerHTML = `
      <option value="all">All Categories</option>
      ${state.categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
    `;
    if (state.categories.includes(currentFilter) || currentFilter === 'all') {
      el.filterCategory.value = currentFilter;
    } else {
      el.filterCategory.value = 'all';
      state.filterCategory = 'all';
    }

    const currentFormVal = el.formCategory.value;
    el.formCategory.innerHTML = `
      <option value="" disabled selected>Select Category...</option>
      ${state.categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
      <option value="__NEW_CUSTOM__">+ Add Custom Category...</option>
    `;
    if (currentFormVal && state.categories.includes(currentFormVal)) {
      el.formCategory.value = currentFormVal;
    }
  }

  function addCustomCategory(newCategoryName) {
    const trimmed = (newCategoryName || '').trim();
    if (!trimmed) {
      alert('Please enter a valid category name.');
      return false;
    }

    const existing = state.categories.find(c => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      el.formCategory.value = existing;
      showToast(`Selected existing category: ${existing}`);
      hideCustomCategoryInput();
      return true;
    }

    state.categories.push(trimmed);
    saveState();
    syncMetadataToCloud();
    syncCategoryOptions();
    el.formCategory.value = trimmed;
    hideCustomCategoryInput();
    showToast(`Added custom category: ${trimmed}`);
    return true;
  }

  function showCustomCategoryInput() {
    el.formCustomCategoryContainer.classList.remove('hidden');
    el.formCustomCategoryInput.value = '';
    el.formCustomCategoryInput.focus();
  }

  function hideCustomCategoryInput() {
    el.formCustomCategoryContainer.classList.add('hidden');
    el.formCustomCategoryInput.value = '';
    if (el.formCategory.value === '__NEW_CUSTOM__') {
      el.formCategory.value = state.categories[0] || '';
    }
  }

  // Populate dynamic condition options
  function syncConditionOptions() {
    const currentFormCond = el.formCondition.value;
    el.formCondition.innerHTML = `
      <option value="" disabled selected>Select Condition...</option>
      ${state.conditions.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
      <option value="__NEW_CUSTOM_COND__">+ Add Custom Condition...</option>
    `;
    if (currentFormCond && state.conditions.includes(currentFormCond)) {
      el.formCondition.value = currentFormCond;
    } else {
      el.formCondition.value = state.conditions[0] || 'Good';
    }

    const currentCompCond = el.completionConditionSelect.value;
    el.completionConditionSelect.innerHTML = state.conditions.map(c =>
      `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
    ).join('');
    if (currentCompCond && state.conditions.includes(currentCompCond)) {
      el.completionConditionSelect.value = currentCompCond;
    } else {
      el.completionConditionSelect.value = state.conditions[0] || 'Excellent';
    }
  }

  function addCustomCondition(newConditionName) {
    const trimmed = (newConditionName || '').trim();
    if (!trimmed) {
      alert('Please enter a valid condition name.');
      return false;
    }

    const existing = state.conditions.find(c => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      el.formCondition.value = existing;
      showToast(`Selected existing condition: ${existing}`);
      hideCustomConditionInput();
      return true;
    }

    state.conditions.push(trimmed);
    saveState();
    syncMetadataToCloud();
    syncConditionOptions();
    el.formCondition.value = trimmed;
    hideCustomConditionInput();
    showToast(`Added custom condition: ${trimmed}`);
    return true;
  }

  function showCustomConditionInput() {
    el.formCustomConditionContainer.classList.remove('hidden');
    el.formCustomConditionInput.value = '';
    el.formCustomConditionInput.focus();
  }

  function hideCustomConditionInput() {
    el.formCustomConditionContainer.classList.add('hidden');
    el.formCustomConditionInput.value = '';
    if (el.formCondition.value === '__NEW_CUSTOM_COND__') {
      el.formCondition.value = state.conditions[0] || '';
    }
  }

  // Filter tasks based on role, search, status, and dropdowns
  function getFilteredTasks() {
    return state.tasks.filter(task => {
      if (!isAdmin()) {
        if (task.store !== state.auth.store) {
          return false;
        }
      }

      if (isAdmin() && state.filterStore !== 'all' && task.store !== state.filterStore) {
        return false;
      }

      const isComplete = (task.status === 'Completed' || Boolean(task.completedAt));
      const nextCycleDate = task.nextCycleDueDate || calculateNextCycleDate(task.dueDate || TODAY_STR, task.cycle);
      const hasNextCycle = Boolean(nextCycleDate && task.cycle && task.cycle !== 'One-Time Inspection');

      const activeStatus = (isComplete && hasNextCycle)
        ? calculateDateStatus(nextCycleDate)
        : (!isComplete ? calculateDateStatus(task.dueDate) : 'Completed');

      const activeStatusKey = activeStatus.toLowerCase().replace(/\s+/g, '-');

      if (state.filterStatus !== 'all') {
        if (state.filterStatus === 'completed') {
          if (!isComplete) return false;
        } else {
          if (activeStatusKey !== state.filterStatus) return false;
        }
      }

      if (state.filterCategory !== 'all' && task.category !== state.filterCategory) {
        return false;
      }

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchName = (task.assetName || '').toLowerCase().includes(q);
        const matchSerial = (task.serialNumber || '').toLowerCase().includes(q);
        const matchStore = (task.store || '').toLowerCase().includes(q);
        const matchLocation = (task.location || '').toLowerCase().includes(q);
        const matchCategory = (task.category || '').toLowerCase().includes(q);
        const matchCondition = (task.condition || '').toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        const matchRemarks = (task.completionRemarks || '').toLowerCase().includes(q);
        if (!matchName && !matchSerial && !matchStore && !matchLocation && !matchCategory && !matchCondition && !matchDesc && !matchRemarks) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (state.sortBy === 'custom') {
        return 0;
      } else if (state.sortBy === 'urgency') {
        const metaA = getStatusMeta(calculateTaskStatus(a));
        const metaB = getStatusMeta(calculateTaskStatus(b));
        if (metaA.rank !== metaB.rank) return metaA.rank - metaB.rank;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      } else if (state.sortBy === 'date-asc') {
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      } else if (state.sortBy === 'date-desc') {
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      } else if (state.sortBy === 'name-asc') {
        return (a.assetName || '').localeCompare(b.assetName || '');
      }
      return 0;
    });
  }

  // Update Header & KPI metrics & Sidebar
  function updateKPIsAndHeader() {
    const scopeTasks = state.tasks.filter(t => {
      if (!isAdmin() && t.store !== state.auth.store) return false;
      if (isAdmin() && state.filterStore !== 'all' && t.store !== state.filterStore) return false;
      return true;
    });

    let total = scopeTasks.length;
    let overdue = 0;
    let dueToday = 0;
    let dueSoon = 0;
    let upcoming = 0;
    let completed = 0;

    scopeTasks.forEach(t => {
      const isComplete = (t.status === 'Completed' || Boolean(t.completedAt));
      const nextCycleDate = t.nextCycleDueDate || calculateNextCycleDate(t.dueDate || TODAY_STR, t.cycle);
      const hasNextCycle = Boolean(nextCycleDate && t.cycle && t.cycle !== 'One-Time Inspection');

      if (isComplete) {
        completed++;
      }

      const activeStatus = (isComplete && hasNextCycle)
        ? calculateDateStatus(nextCycleDate)
        : (!isComplete ? calculateDateStatus(t.dueDate) : null);

      if (activeStatus === 'Overdue') overdue++;
      else if (activeStatus === 'Due Today') dueToday++;
      else if (activeStatus === 'Due Soon') dueSoon++;
      else if (activeStatus === 'Upcoming') upcoming++;
    });

    // KPI Header counters
    el.countAll.textContent = total;
    el.countOverdue.textContent = overdue;
    el.countDueToday.textContent = dueToday;
    el.countDueSoon.textContent = dueSoon;
    el.countUpcoming.textContent = upcoming;
    el.countCompleted.textContent = completed;

    // Sidebar Badge Counters
    if (el.sideCountAll) el.sideCountAll.textContent = total;
    if (el.sideCountOverdue) el.sideCountOverdue.textContent = overdue;
    if (el.sideCountDueToday) el.sideCountDueToday.textContent = dueToday;
    if (el.sideCountDueSoon) el.sideCountDueSoon.textContent = dueSoon;
    if (el.sideCountUpcoming) el.sideCountUpcoming.textContent = upcoming;
    if (el.sideCountCompleted) el.sideCountCompleted.textContent = completed;

    el.kpiCards.forEach(card => {
      if (card.dataset.filterStatus === state.filterStatus) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Sidebar link active state
    if (el.sidebarLinks) {
      el.sidebarLinks.forEach(link => {
        if (link.dataset.sidebarFilter === state.filterStatus) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    if (isAdmin()) {
      el.userDisplayName.textContent = 'Admin (Headquarters)';
      el.userRoleLabel.textContent = 'System Administrator';
      el.roleDot.style.backgroundColor = '#2563EB';
      if (el.mobileRoleDot) el.mobileRoleDot.style.backgroundColor = '#2563EB';
      el.adminStoreSwitcherWrapper.classList.remove('hidden');
      el.adminStoreQuickSwitch.value = state.filterStore;
      el.btnManageStores.classList.remove('hidden');
      el.btnCreateTask.classList.remove('hidden');
      el.filterStoreWrapper.classList.remove('hidden');
      el.viewTitle.textContent = state.filterStore === 'all'
        ? 'All Stores Task Overview'
        : `${state.filterStore} — Tasks`;
      el.viewCaption.textContent = 'Admin Mode: Create, assign, edit, override status, manage store credentials, and review verification proofs in real-time.';
    } else {
      const storeName = state.auth.store || 'Store Account';
      const storeAccount = state.storeAccounts.find(s => s.name === storeName || s.code === storeName);

      const managerContact = (storeAccount && storeAccount.manager && storeAccount.manager.trim())
        ? storeAccount.manager.trim()
        : 'Store Staff / Operator';

      const storeCode = (storeAccount && storeAccount.code && storeAccount.code.trim())
        ? storeAccount.code.trim()
        : storeName;

      el.userDisplayName.textContent = managerContact;
      el.userRoleLabel.textContent = storeCode;
      el.roleDot.style.backgroundColor = '#10B981';
      if (el.mobileRoleDot) el.mobileRoleDot.style.backgroundColor = '#10B981';
      el.adminStoreSwitcherWrapper.classList.add('hidden');
      el.btnManageStores.classList.add('hidden');
      el.btnCreateTask.classList.add('hidden');
      el.filterStoreWrapper.classList.add('hidden');
      el.viewTitle.textContent = `${storeName} Workspace`;
      el.viewCaption.textContent = 'Store Mode: View assigned tasks, mark them complete with date, required photo proof & remarks, and post activity notes.';
    }

    if (state.filterStatus !== 'all') {
      el.activeFiltersBar.classList.remove('hidden');
      const meta = getStatusMeta(state.filterStatus === 'due-today' ? 'Due Today' : (state.filterStatus === 'due-soon' ? 'Due Soon' : (state.filterStatus.charAt(0).toUpperCase() + state.filterStatus.slice(1))));
      el.activeStatusTag.textContent = `Status: ${meta.label}`;
      el.activeStatusTag.className = `filter-pill ${meta.className}`;
    } else {
      el.activeFiltersBar.classList.add('hidden');
    }
  }

  // Render Task Grid Cards
  function renderGrid(tasks) {
    if (tasks.length === 0) {
      el.taskGrid.innerHTML = '';
      return;
    }

    el.taskGrid.innerHTML = tasks.map(task => {
      const status = (task.status === 'Completed') ? 'Completed' : calculateTaskStatus(task);
      const meta = getStatusMeta(status);
      const isComplete = status === 'Completed';
      const commentCount = (task.comments && task.comments.length) || 0;
      const condClass = getConditionClass(task.condition);

      const hasProof = Boolean(task.proofImage || (task.comments && task.comments.some(c => c.proofImage)));
      const latestProof = task.proofImage || (task.comments && [...task.comments].reverse().find(c => c.proofImage)?.proofImage);

      // Compute Next Maintenance Cycle indicator from specific scheduled date or cycle calculation
      let nextCycleMarkup = '';
      const nextCycleDate = task.nextCycleDueDate || calculateNextCycleDate(task.dueDate || TODAY_STR, task.cycle);
      const hasNextCycle = Boolean(nextCycleDate && task.cycle !== 'One-Time Inspection');
      let nextMeta = null;

      if (hasNextCycle) {
        const nextStatus = calculateDateStatus(nextCycleDate);
        nextMeta = getStatusMeta(nextStatus);
        nextCycleMarkup = `
          <div class="next-cycle-strip" title="Next recurring maintenance scheduled: ${formatDateDisplay(nextCycleDate)}">
            <span class="next-cycle-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              Next ${escapeHTML(task.cycle)}: <strong>${formatDateDisplay(nextCycleDate)}</strong>
            </span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="status-chip ${nextMeta.className}" style="font-size: 10.5px; padding: 2px 7px;">
                <span class="status-dot ${nextMeta.dotClass}"></span>
                ${nextMeta.label}
              </span>
              ${isComplete && !isAdmin() ? `
                <button type="button" class="btn-start-early-pill" onclick="window.assetApp.startNextCycleEarly('${task.id}')" title="Start upcoming maintenance cycle early">
                  ⚡ Start Early
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }

      const displayMeta = (isComplete && hasNextCycle && nextMeta) ? nextMeta : meta;

      return `
        <article class="task-card" draggable="true" data-id="${task.id}" data-task-id="${task.id}">
          <div>
            <div class="task-card-header">
              <div class="task-title-group">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="task-category-tag">${escapeHTML(task.category)}</span>
                  <span class="drag-handle-badge" title="Drag to reorder tasks">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                    </svg>
                    <span>Drag</span>
                  </span>
                </div>
                <h3 class="task-asset-title">
                  ${escapeHTML(task.assetName)}
                  ${task.serialNumber ? `<span class="task-id-badge">#${escapeHTML(task.serialNumber)}</span>` : ''}
                </h3>
              </div>
              <span class="status-chip ${displayMeta.className}">
                <span class="status-dot ${displayMeta.dotClass}"></span>
                ${displayMeta.label}
              </span>
            </div>

            ${nextCycleMarkup}

            <div class="task-details-grid">
              <div class="meta-item">
                <span class="meta-label">Location</span>
                <span class="meta-value" title="${escapeHTML(task.location)}">${escapeHTML(task.location)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Assigned Store</span>
                <span class="meta-value" title="${escapeHTML(task.store)}">${escapeHTML(task.store)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">${isComplete ? 'Completed Date' : 'Due Date'}</span>
                <span class="meta-value">${isComplete ? formatDateDisplay(task.completedAt) : formatDateDisplay(task.dueDate)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Cycle / Condition</span>
                <span class="meta-value" style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                  ${escapeHTML(task.cycle)} • 
                  ${isAdmin() ? `
                    <select class="select-condition-inline ${condClass}" onchange="window.assetApp.updateTaskCondition('${task.id}', this.value)" title="Change condition (Admin)">
                      ${(state.conditions || []).map(cond => `
                        <option value="${escapeHTML(cond)}" ${cond === task.condition ? 'selected' : ''}>${escapeHTML(cond)}</option>
                      `).join('')}
                    </select>
                  ` : `
                    <span class="condition-tag ${condClass}">${escapeHTML(task.condition)}</span>
                  `}
                </span>
              </div>
            </div>

            ${hasProof ? `
              <div class="proof-thumbnail-badge" onclick="window.assetApp.openLightbox('${latestProof}', '${escapeHTML(task.assetName)} — Completion Proof')">
                <img src="${latestProof}" alt="Proof" class="proof-thumbnail-mini">
                <span>Verified Photo Proof Attached</span>
              </div>
            ` : ''}

            ${task.description ? `<div class="task-snippet" title="${escapeHTML(task.description)}">${escapeHTML(task.description)}</div>` : ''}
          </div>

          <div class="task-card-footer">
            <div class="task-footer-left">
              <button class="btn-comments-trigger" onclick="window.assetApp.openComments('${task.id}')" title="View & add remarks">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${commentCount} ${commentCount === 1 ? 'Remark' : 'Remarks'}</span>
              </button>
            </div>

            <div class="task-footer-right">
              ${isComplete ? `
                ${isAdmin() ? `
                  <button class="btn btn-ghost btn-sm" onclick="window.assetApp.triggerTaskCompletion('${task.id}')" title="Reopen task (Admin only)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="1 4 1 10 7 10"></polyline>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                    <span>Reopen</span>
                  </button>
                ` : ''}

                ${hasNextCycle && !isAdmin() ? `
                  <button class="btn btn-primary btn-sm btn-start-cycle" onclick="window.assetApp.startNextCycleEarly('${task.id}')" title="Start next maintenance cycle early">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Start Next Cycle</span>
                  </button>
                ` : !isAdmin() ? `
                  <span class="completed-lock-badge" title="Completed on ${formatDateDisplay(task.completedAt)}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Done (${formatDateDisplay(task.completedAt)})
                  </span>
                ` : ''}
              ` : !isAdmin() ? `
                <button class="btn btn-success btn-sm" onclick="window.assetApp.triggerTaskCompletion('${task.id}')" title="Specify completion date, photo proof & remarks">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Mark Done</span>
                </button>
              ` : ''}

              ${isAdmin() ? `
                <button class="btn btn-secondary btn-sm" onclick="window.assetApp.openEditModal('${task.id}')" title="Edit task details (Admin only)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>Edit</span>
                </button>
                <button class="btn btn-danger btn-sm" onclick="window.assetApp.deleteTask('${task.id}')" title="Delete this asset permanently (Admin only)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                  </svg>
                  <span>Delete</span>
                </button>
              ` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Render Task Table View
  function renderTable(tasks) {
    const thDate = document.getElementById('th-table-date');
    if (thDate) {
      thDate.textContent = isAdmin() ? 'Due Date' : 'Date Completed';
    }
    const thNextCycle = document.getElementById('th-table-next-cycle');
    if (thNextCycle) {
      thNextCycle.textContent = 'Next Cycle Date';
    }

    if (tasks.length === 0) {
      el.taskTableBody.innerHTML = '';
      return;
    }

    el.taskTableBody.innerHTML = tasks.map(task => {
      const status = (task.status === 'Completed') ? 'Completed' : calculateTaskStatus(task);
      const meta = getStatusMeta(status);
      const isComplete = status === 'Completed';
      const commentCount = (task.comments && task.comments.length) || 0;
      const condClass = getConditionClass(task.condition);

      const nextCycleDate = task.nextCycleDueDate || calculateNextCycleDate(task.dueDate || TODAY_STR, task.cycle);
      const hasNextCycle = Boolean(nextCycleDate && task.cycle !== 'One-Time Inspection');
      let nextMeta = null;
      let nextCycleCell = '—';
      if (hasNextCycle) {
        const nextStatus = calculateDateStatus(nextCycleDate);
        nextMeta = getStatusMeta(nextStatus);
        nextCycleCell = `
          <div><strong>${formatDateDisplay(nextCycleDate)}</strong></div>
          <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
            <span class="status-chip ${nextMeta.className}" style="font-size: 10px; padding: 1px 6px;">${nextMeta.label}</span>
            ${isComplete && !isAdmin() ? `
              <button type="button" class="btn-start-early-pill" onclick="window.assetApp.startNextCycleEarly('${task.id}')" style="font-size: 9.5px; padding: 1px 5px;" title="Start upcoming cycle early">⚡ Start</button>
            ` : ''}
          </div>
        `;
      } else {
        nextCycleCell = `<span style="color: var(--text-subtle);">One-Time</span>`;
      }

      const displayMeta = (isComplete && hasNextCycle && nextMeta) ? nextMeta : meta;

      let dateCellHtml = '';
      if (!isAdmin()) {
        if (isComplete || task.completedAt) {
          dateCellHtml = `
            <div><span style="color:#059669; font-weight:700;">Done: ${formatDateDisplay(task.completedAt || task.dueDate)}</span></div>
            <small style="color: var(--text-muted);">${escapeHTML(task.cycle)}</small>
          `;
        } else {
          dateCellHtml = `
            <div><span style="color:var(--text-main); font-weight:600;">${formatDateDisplay(task.dueDate)}</span></div>
            <small style="color: var(--text-muted);">${escapeHTML(task.cycle)}</small>
          `;
        }
      } else {
        dateCellHtml = `
          <div>${isComplete ? `<span style="color:#059669; font-weight:700;">Done: ${formatDateDisplay(task.completedAt)}</span>` : `<span style="font-weight:600;">${formatDateDisplay(task.dueDate)}</span>`}</div>
          <small style="color: var(--text-muted);">${escapeHTML(task.cycle)}</small>
        `;
      }

      let conditionCellHtml = '';
      if (isAdmin()) {
        conditionCellHtml = `
          <select class="select-condition-inline ${condClass}" onchange="window.assetApp.updateTaskCondition('${task.id}', this.value)" title="Change condition (Admin)">
            ${(state.conditions || []).map(cond => `
              <option value="${escapeHTML(cond)}" ${cond === task.condition ? 'selected' : ''}>${escapeHTML(cond)}</option>
            `).join('')}
          </select>
        `;
      } else {
        conditionCellHtml = `<span class="condition-tag ${condClass}">${escapeHTML(task.condition)}</span>`;
      }

      return `
        <tr draggable="true" data-task-id="${task.id}">
          <td>
            <span class="status-chip ${displayMeta.className}">
              <span class="status-dot ${displayMeta.dotClass}"></span>
              ${displayMeta.label}
            </span>
          </td>
          <td>
            <strong>${escapeHTML(task.assetName)}</strong>
            ${task.serialNumber ? `<br><small class="task-id-badge">ID: ${escapeHTML(task.serialNumber)}</small>` : ''}
          </td>
          <td>${escapeHTML(task.category)}</td>
          <td>
            <div>${escapeHTML(task.store)}</div>
            <small style="color: var(--text-muted);">${escapeHTML(task.location)}</small>
          </td>
          <td>${dateCellHtml}</td>
          <td>${conditionCellHtml}</td>
          <td>${nextCycleCell}</td>
          <td>
            <button class="btn-comments-trigger" onclick="window.assetApp.openComments('${task.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>${commentCount}</span>
            </button>
          </td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${isComplete ? `
                ${isAdmin() ? `
                  <button class="btn btn-ghost btn-sm" onclick="window.assetApp.triggerTaskCompletion('${task.id}')" title="Reopen task">Reopen</button>
                ` : ''}
                ${hasNextCycle && !isAdmin() ? `
                  <button class="btn btn-primary btn-sm btn-start-cycle" onclick="window.assetApp.startNextCycleEarly('${task.id}')" title="Start next maintenance cycle early">
                    ⚡ Start Next Cycle
                  </button>
                ` : `
                  <span style="color: #059669; font-size: 11.5px; font-weight: 700;">✓ ${formatDateDisplay(task.completedAt)}</span>
                `}
              ` : !isAdmin() ? `
                <button class="btn btn-success btn-sm" onclick="window.assetApp.triggerTaskCompletion('${task.id}')">
                  Done
                </button>
              ` : ''}
              ${isAdmin() ? `
                <button class="btn btn-secondary btn-sm" onclick="window.assetApp.openEditModal('${task.id}')" title="Edit task (Admin only)">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="window.assetApp.deleteTask('${task.id}')" title="Delete asset permanently (Admin only)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6"></path><path d="M14 11v6"></path>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                  </svg>
                  Delete
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // Interactive Calendar View Logic
  // =========================================================================
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function renderCalendar(tasks) {
    if (!el.calendarDaysGrid || !el.calendarMonthTitle) return;

    const year = state.calendarYear || 2026;
    const month = (state.calendarMonth !== undefined) ? state.calendarMonth : 7;

    el.calendarMonthTitle.textContent = `${MONTH_NAMES[month]} ${year}`;

    // First day of month (0 = Sun, 1 = Mon...) & total days count
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Map tasks by date YYYY-MM-DD
    const taskMap = {};
    tasks.forEach(t => {
      const dateStr = (t.status === 'Completed' && t.completedAt) ? t.completedAt : t.dueDate;
      if (dateStr) {
        const cleanDate = String(dateStr).split('T')[0];
        if (!taskMap[cleanDate]) taskMap[cleanDate] = [];
        taskMap[cleanDate].push(t);
      }
    });

    let gridHtml = '';

    // Previous month padding days
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, prevDay);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(prevDay).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayTasks = taskMap[dateStr] || [];

      gridHtml += renderCalendarDayCell(prevDay, dateStr, dayTasks, true, false);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const y = year;
      const m = String(month + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const isToday = (dateStr === TODAY_STR);
      const dayTasks = taskMap[dateStr] || [];

      gridHtml += renderCalendarDayCell(day, dateStr, dayTasks, false, isToday);
    }

    // Next month padding days to complete 35 or 42 grid cells
    const totalCellsSoFar = firstDay + daysInMonth;
    const totalCellsNeeded = totalCellsSoFar > 35 ? 42 : 35;
    const nextMonthPadding = totalCellsNeeded - totalCellsSoFar;

    for (let day = 1; day <= nextMonthPadding; day++) {
      const nextDate = new Date(year, month + 1, day);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayTasks = taskMap[dateStr] || [];

      gridHtml += renderCalendarDayCell(day, dateStr, dayTasks, true, false);
    }

    el.calendarDaysGrid.innerHTML = gridHtml;
    bindCalendarCellEvents();
  }

  function renderCalendarDayCell(dayNum, dateStr, dayTasks, isOtherMonth, isToday) {
    const cellClass = `calendar-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}`;

    const taskPillsHtml = dayTasks.map(t => {
      const status = (t.status === 'Completed') ? 'Completed' : calculateTaskStatus(t);
      let pillClass = 'pill-upcoming';
      if (status === 'Overdue') pillClass = 'pill-overdue';
      else if (status === 'Due Today') pillClass = 'pill-due-today';
      else if (status === 'Due Soon') pillClass = 'pill-due-soon';
      else if (status === 'Completed') pillClass = 'pill-completed';

      return `
        <div class="calendar-event-pill ${pillClass}" draggable="true" data-task-id="${t.id}" onclick="event.stopPropagation(); window.assetApp.openComments('${t.id}')" title="${escapeHTML(t.assetName)} (${escapeHTML(t.store)}) • Status: ${status}">
          <span style="font-weight:700;">•</span>
          <span>${escapeHTML(t.assetName)}</span>
        </div>
      `;
    }).join('');

    const addBtnHtml = isAdmin() ? `
      <button type="button" class="btn-add-day-task" onclick="event.stopPropagation(); window.assetApp.createTaskForDate('${dateStr}')" title="Schedule asset task on ${formatDateDisplay(dateStr)}">+</button>
    ` : '';

    return `
      <div class="${cellClass}" data-calendar-date="${dateStr}">
        <div class="calendar-day-header">
          <span class="calendar-day-number">${dayNum}</span>
          ${addBtnHtml}
        </div>
        <div class="calendar-events-container">
          ${taskPillsHtml}
        </div>
      </div>
    `;
  }

  function bindCalendarCellEvents() {
    if (!el.calendarDaysGrid) return;
    const dayCells = el.calendarDaysGrid.querySelectorAll('.calendar-day-cell');
    dayCells.forEach(cell => {
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.classList.add('drag-over');
      });
      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drag-over');
      });
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        const targetDate = cell.getAttribute('data-calendar-date');
        if (!targetDate || !draggedTaskId) return;

        const task = state.tasks.find(t => t.id === draggedTaskId);
        if (task) {
          task.dueDate = targetDate;
          if (task.status !== 'Completed') {
            task.status = calculateTaskStatus(task);
          }
          saveState();
          syncTaskToCloud(task);
          render();
          showToast(`Rescheduled "${task.assetName}" to ${formatDateDisplay(targetDate)}`);
        }
      });
    });
  }

  function createTaskForDate(dateStr) {
    if (!isAdmin()) return;
    openTaskModal();
    if (el.formDueDate) {
      el.formDueDate.value = dateStr;
      autoCalculateModalNextCycle();
    }
  }

  function prevCalendarMonth() {
    if (state.calendarMonth === 0) {
      state.calendarMonth = 11;
      state.calendarYear--;
    } else {
      state.calendarMonth--;
    }
    render();
  }

  function nextCalendarMonth() {
    if (state.calendarMonth === 11) {
      state.calendarMonth = 0;
      state.calendarYear++;
    } else {
      state.calendarMonth++;
    }
    render();
  }

  function goCalendarToday() {
    state.calendarYear = 2026;
    state.calendarMonth = 7;
    render();
  }

  // Render Main App
  function render() {
    if (!state.auth.isAuthenticated) {
      el.authView.classList.remove('hidden');
      el.appView.classList.add('hidden');
      return;
    }

    el.authView.classList.add('hidden');
    el.appView.classList.remove('hidden');

    updateKPIsAndHeader();
    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0 && state.viewMode !== 'calendar') {
      el.taskGrid.classList.add('hidden');
      el.taskTableWrapper.classList.add('hidden');
      if (el.taskCalendarWrapper) el.taskCalendarWrapper.classList.add('hidden');
      el.emptyState.classList.remove('hidden');
    } else {
      el.emptyState.classList.add('hidden');
      if (state.viewMode === 'grid') {
        el.taskGrid.classList.remove('hidden');
        el.taskTableWrapper.classList.add('hidden');
        if (el.taskCalendarWrapper) el.taskCalendarWrapper.classList.add('hidden');
        renderGrid(filteredTasks);
      } else if (state.viewMode === 'table') {
        el.taskGrid.classList.add('hidden');
        el.taskTableWrapper.classList.remove('hidden');
        if (el.taskCalendarWrapper) el.taskCalendarWrapper.classList.add('hidden');
        renderTable(filteredTasks);
      } else if (state.viewMode === 'calendar') {
        el.taskGrid.classList.add('hidden');
        el.taskTableWrapper.classList.add('hidden');
        if (el.taskCalendarWrapper) el.taskCalendarWrapper.classList.remove('hidden');
        renderCalendar(filteredTasks);
      }
    }

    renderNotifications();
  }

  // Login handler
  function login(role, storeName = null) {
    if (role === 'admin') {
      state.auth = {
        isAuthenticated: true,
        role: 'admin',
        store: null,
        username: 'admin',
        displayName: 'Admin (Headquarters)'
      };
      state.filterStore = 'all';
    } else {
      const selectedStore = storeName || el.loginStoreSelect.value;
      state.auth = {
        isAuthenticated: true,
        role: 'store',
        store: selectedStore,
        username: selectedStore,
        displayName: selectedStore
      };
      state.filterStore = 'all';
    }

    state.filterStatus = 'all';
    state.searchQuery = '';
    saveState();
    render();
    showToast(`Signed in as: ${state.auth.displayName}`);
  }

  // Logout handler
  function logout() {
    state.auth = {
      isAuthenticated: false,
      role: 'admin',
      store: null,
      username: '',
      displayName: ''
    };
    saveState();
    render();
    showToast('Signed out successfully');
  }

  // Sidebar toggle helpers
  function openSidebar() {
    if (el.sidebar) el.sidebar.classList.add('open');
    if (el.sidebarBackdrop) el.sidebarBackdrop.classList.add('open');
  }

  function closeSidebar() {
    if (el.sidebar) el.sidebar.classList.remove('open');
    if (el.sidebarBackdrop) el.sidebarBackdrop.classList.remove('open');
  }

  // =========================================================================
  // Store Credentials Management (Admin Only)
  // =========================================================================

  function openStoreManagementModal() {
    if (!isAdmin()) {
      alert('Only administrators can access Store Account credentials.');
      return;
    }
    renderStoreAccountsList();
    el.storeManagementModal.classList.add('open');
    el.storeManagementModal.setAttribute('aria-hidden', 'false');
    closeSidebar();
  }

  function closeStoreManagementModal() {
    el.storeManagementModal.classList.remove('open');
    el.storeManagementModal.setAttribute('aria-hidden', 'true');
  }

  function renderStoreAccountsList() {
    if (!state.storeAccounts) state.storeAccounts = [];

    // Ensure every store account has a unique ID
    state.storeAccounts.forEach((s, idx) => {
      if (!s.id) {
        s.id = 'store-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 7);
      }
    });

    if (state.storeAccounts.length === 0) {
      el.storeAccountsTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
            No store branches configured yet. Use the form below to add your first store.
          </td>
        </tr>
      `;
      return;
    }

    el.storeAccountsTbody.innerHTML = state.storeAccounts.map((s) => `
      <tr data-store-id="${escapeHTML(s.id)}">
        <td>
          <input type="text" class="input-text input-sm" id="store-name-input-${escapeHTML(s.id)}" value="${escapeHTML(s.name)}" placeholder="Store Name" required style="min-width: 140px; font-weight: 600;">
        </td>
        <td>
          <input type="text" class="input-text input-sm" id="store-code-input-${escapeHTML(s.id)}" value="${escapeHTML(s.code || '')}" placeholder="Code" style="min-width: 80px; text-transform: uppercase;">
        </td>
        <td>
          <input type="text" class="input-text input-sm" id="store-manager-input-${escapeHTML(s.id)}" value="${escapeHTML(s.manager || '')}" placeholder="Manager / Contact" style="min-width: 150px;">
        </td>
        <td>
          <input type="text" class="input-text input-sm input-pin-inline" id="store-pin-input-${escapeHTML(s.id)}" value="${escapeHTML(s.pin || '1234')}" placeholder="PIN" maxlength="12">
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.assetApp.updateStoreAccount('${escapeHTML(s.id)}')">
              Save
            </button>
            <button type="button" class="btn btn-danger-ghost btn-sm" onclick="window.assetApp.deleteStoreAccount('${escapeHTML(s.id)}')" title="Remove Store Branch">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function updateStoreAccount(storeIdOrIndex) {
    if (!isAdmin()) return;

    let store = state.storeAccounts.find(s => s.id === String(storeIdOrIndex));
    if (!store && typeof storeIdOrIndex === 'number' && state.storeAccounts[storeIdOrIndex]) {
      store = state.storeAccounts[storeIdOrIndex];
    }
    if (!store && typeof storeIdOrIndex === 'string' && !isNaN(Number(storeIdOrIndex))) {
      store = state.storeAccounts[Number(storeIdOrIndex)];
    }

    if (!store) {
      alert('Error: Store account not found.');
      return;
    }

    const sid = store.id;
    const nameInput = document.getElementById(`store-name-input-${sid}`);
    const codeInput = document.getElementById(`store-code-input-${sid}`);
    const managerInput = document.getElementById(`store-manager-input-${sid}`);
    const pinInput = document.getElementById(`store-pin-input-${sid}`);

    if (!nameInput || !pinInput) {
      alert('Error: Could not locate store input fields.');
      return;
    }

    const newName = nameInput.value.trim();
    const newCode = codeInput ? codeInput.value.trim() : (store.code || '');
    const newManager = managerInput ? managerInput.value.trim() : (store.manager || '');
    const newPin = pinInput.value.trim();

    if (!newName) {
      alert('Store Name cannot be empty.');
      nameInput.focus();
      return;
    }

    if (!newPin) {
      alert('Access PIN cannot be empty.');
      pinInput.focus();
      return;
    }

    const duplicate = state.storeAccounts.some(s => s.id !== sid && s.name.toLowerCase() === newName.toLowerCase());
    if (duplicate) {
      alert(`A store branch with the name "${newName}" already exists.`);
      nameInput.focus();
      return;
    }

    const oldName = store.name;
    store.name = newName;
    store.code = newCode;
    store.manager = newManager;
    store.pin = newPin;

    if (oldName !== newName) {
      let updatedTaskCount = 0;
      state.tasks.forEach(t => {
        if (t.store === oldName) {
          t.store = newName;
          syncTaskToCloud(t);
          updatedTaskCount++;
        }
      });
      if (updatedTaskCount > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
      }

      if (state.auth.store === oldName) {
        state.auth.store = newName;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.auth));
      }
    }

    saveState();
    syncStoreToCloud(store);
    syncStoreOptions();
    renderStoreAccountsList();
    render();
    showToast(`Saved updated details for "${newName}"`);
  }

  function updateStorePin(storeIdOrIndex) {
    updateStoreAccount(storeIdOrIndex);
  }

  function deleteStoreAccount(storeIdOrIndex) {
    if (!isAdmin()) return;

    let index = state.storeAccounts.findIndex(s => s.id === String(storeIdOrIndex));
    if (index === -1 && typeof storeIdOrIndex === 'number') {
      index = storeIdOrIndex;
    }
    if (index === -1 && typeof storeIdOrIndex === 'string' && !isNaN(Number(storeIdOrIndex))) {
      index = Number(storeIdOrIndex);
    }

    const targetStore = state.storeAccounts[index];
    if (!targetStore) return;

    showConfirmModal({
      title: 'Delete Store Account?',
      message: `Are you sure you want to delete store branch <strong>"${escapeHTML(targetStore.name)}"</strong>?<br><br><small style="color: #DC2626;">Staff will no longer be able to log in to this store branch.</small>`,
      iconType: 'danger',
      okText: 'Delete Store',
      okClass: 'btn-danger',
      onConfirm: () => {
        const removedId = targetStore.id;
        state.storeAccounts.splice(index, 1);
        saveState();
        removeStoreFromCloud(removedId);
        syncStoreOptions();
        renderStoreAccountsList();
        render();
        showToast(`Store ${targetStore.name} removed.`);
      }
    });
  }

  function deleteTask(taskId) {
    if (!isAdmin()) return;
    const idx = state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const task = state.tasks[idx];

    showConfirmModal({
      title: 'Delete Asset Task?',
      message: `Are you sure you want to permanently delete <strong>"${escapeHTML(task.assetName)}"</strong> (${escapeHTML(task.store)})?<br><br><small style="color: #DC2626;">This action cannot be undone and will remove all maintenance records and photo proofs for this asset.</small>`,
      iconType: 'danger',
      okText: 'Delete Asset',
      okClass: 'btn-danger',
      onConfirm: () => {
        state.tasks.splice(idx, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
        removeTaskFromCloud(taskId);
        render();
        showToast(`Asset "${task.assetName}" deleted.`);
      }
    });
  }

  function handleAddStoreSubmit(e) {
    e.preventDefault();
    if (!isAdmin()) return;

    const name = el.newStoreName.value.trim();
    const code = el.newStoreCode.value.trim();
    const manager = el.newStoreManager.value.trim();
    const pin = el.newStorePin.value.trim();

    if (!name || !code || !pin) {
      alert('Please fill in Store Name, Code, and Access PIN.');
      return;
    }

    // Check duplicate
    if (state.storeAccounts.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      alert('A store branch with this name already exists.');
      return;
    }

    const newStore = {
      id: 'store-' + Date.now(),
      name,
      code,
      manager,
      pin,
      createdAt: new Date().toISOString()
    };

    state.storeAccounts.push(newStore);
    saveState();
    syncStoreToCloud(newStore);
    syncStoreOptions();
    renderStoreAccountsList();
    render();
    el.addStoreForm.reset();
    showToast(`Store "${name}" successfully added and saved to Cloud!`);
  }

  // =========================================================================
  // Task Completion Verification Workflow (With Date of Completion)
  // =========================================================================

  function triggerTaskCompletion(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Strict Permission Check: Store account must NOT be able to reopen asset task
    if (task.status === 'Completed' || task.completedAt) {
      if (!isAdmin()) {
        alert('Permission Denied: Store accounts cannot reopen completed tasks. Only an Administrator can reopen a completed task.');
        return;
      }

      showConfirmModal({
        title: 'Reopen Task?',
        message: `Are you sure you want to reopen <strong>"${escapeHTML(task.assetName)}"</strong> (${escapeHTML(task.store)})?<br><br><small style="color: var(--text-muted);">This will reset its completed status so the store can perform new maintenance, upload fresh photo verification, and update remarks.</small>`,
        iconType: 'primary',
        okText: 'Yes, Reopen Task',
        okClass: 'btn-primary',
        onConfirm: () => {
          task.completedAt = null;
          task.status = calculateTaskStatus(task);

          task.comments = task.comments || [];
          task.comments.push({
            id: 'c-' + Date.now(),
            author: getCurrentUserLabel(),
            role: isAdmin() ? 'admin' : 'store',
            text: `Task reopened by ${getCurrentUserLabel()}.`,
            timestamp: new Date().toISOString()
          });
          showToast(`Task reopened: ${task.assetName}`);
          saveState();
          syncTaskToCloud(task);

          // Notify Store that task has been reopened
          sendAppNotification({
            target: task.store,
            type: 'task_reopened',
            title: 'Task Reopened by Admin',
            message: `Admin reopened "${task.assetName}" at ${task.store} for a new maintenance cycle.`,
            taskId: task.id,
            sender: 'Admin (Headquarters)'
          });

          render();
          if (state.activeDrawerTaskId === taskId) {
            openCommentsDrawer(taskId);
          }
        }
      });
      return;
    }

    openCompletionModal(task);
  }

  // Start Next Recurring Maintenance Cycle Early (Store & Admin)
  function startNextCycleEarly(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const nextCycleDate = task.nextCycleDueDate || calculateNextCycleDate(task.completedAt || task.dueDate || TODAY_STR, task.cycle);
    if (!nextCycleDate || task.cycle === 'One-Time Inspection') {
      alert('This task has no recurring maintenance cycle scheduled.');
      return;
    }

    const cycleName = task.cycle || 'Maintenance';
    const formattedDate = formatDateDisplay(nextCycleDate);

    const proceed = confirm(
      `Start the upcoming ${cycleName} cycle early for "${task.assetName}"?\n\n` +
      `• Scheduled Due Date: ${formattedDate}\n` +
      `• Assigned Store: ${task.store}\n\n` +
      `This will activate the new cycle so your store can perform maintenance and submit verification now.`
    );

    if (!proceed) return;

    const previousCompletedDate = task.completedAt || TODAY_STR;

    // 1. Advance task due date to the scheduled next cycle date
    task.dueDate = nextCycleDate;
    task.completedAt = null;
    task.completedTimestamp = null;
    task.completedBy = null;
    task.completionRemarks = null;

    // 2. Compute the subsequent next cycle due date after this one
    task.nextCycleDueDate = calculateNextCycleDate(nextCycleDate, task.cycle);

    // 3. Recalculate status for the new cycle
    task.status = calculateTaskStatus(task);

    // 4. Log activity remark
    task.comments = task.comments || [];
    task.comments.push({
      id: 'c-' + Date.now(),
      author: getCurrentUserLabel(),
      role: isAdmin() ? 'admin' : 'store',
      text: `🚀 Started next ${task.cycle} cycle early (Due: ${formattedDate}) by ${getCurrentUserLabel()}.\n(Previous cycle was completed on ${formatDateDisplay(previousCompletedDate)}).`,
      timestamp: new Date().toISOString()
    });

    saveState();
    syncTaskToCloud(task);
    render();

    showToast(`Started next ${cycleName} cycle (Due: ${formattedDate})! Submit verification when ready.`);

    // Open completion modal right away so the store can complete & verify immediately if they wish
    openCompletionModal(task);

    if (state.activeDrawerTaskId === taskId) {
      openCommentsDrawer(taskId);
    }
  }

  function openCompletionModal(task) {
    state.completingTaskId = task.id;
    state.completionAttachedImageData = null;

    el.completionForm.reset();
    syncConditionOptions();

    el.completionTaskId.value = task.id;
    el.completionAssetName.textContent = task.assetName;
    el.completionAssetCategory.textContent = task.category;
    el.completionAssetLocation.textContent = `${task.store} • ${task.location}`;

    // Pre-fill completion date with today
    el.completionDateInput.value = TODAY_STR;

    const meta = getStatusMeta(task.status);
    el.completionStatusPill.textContent = meta.label;
    el.completionStatusPill.className = `status-chip ${meta.className}`;

    el.imagePreviewContainer.classList.add('hidden');
    el.uploadZonePrompt.classList.remove('hidden');
    el.imagePreviewImg.src = '';
    if (el.completionStaffName) el.completionStaffName.value = '';
    el.completionRemarksInput.value = '';

    el.completionModal.classList.add('open');
    el.completionModal.setAttribute('aria-hidden', 'false');
    if (el.completionStaffName) {
      el.completionStaffName.focus();
    } else {
      el.completionRemarksInput.focus();
    }
  }

  function closeCompletionModal() {
    el.completionModal.classList.remove('open');
    el.completionModal.setAttribute('aria-hidden', 'true');
    state.completingTaskId = null;
    state.completionAttachedImageData = null;
  }

  function compressImage(file, maxDimension = 900, quality = 0.72) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async function handleImageFileUpload(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPEG, WebP).');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file);
      if (compressedDataUrl) {
        setAttachedCompletionImage(compressedDataUrl);
      }
    } catch (err) {
      console.warn('Compression note:', err);
      const reader = new FileReader();
      reader.onload = function (e) {
        setAttachedCompletionImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function setAttachedCompletionImage(dataUrl) {
    state.completionAttachedImageData = dataUrl;
    el.imagePreviewImg.src = dataUrl;
    el.uploadZonePrompt.classList.add('hidden');
    el.imagePreviewContainer.classList.remove('hidden');
  }

  function removeAttachedCompletionImage() {
    state.completionAttachedImageData = null;
    el.imagePreviewImg.src = '';
    el.imagePreviewContainer.classList.add('hidden');
    el.uploadZonePrompt.classList.remove('hidden');
    el.completionImageFile.value = '';
  }

  function useSamplePhoto(sampleKey) {
    if (SAMPLE_PHOTOS[sampleKey]) {
      setAttachedCompletionImage(SAMPLE_PHOTOS[sampleKey]);
      showToast('Attached verification sample image');
    }
  }

  function handleCompletionFormSubmit(e) {
    e.preventDefault();
    const taskId = el.completionTaskId.value;
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const completionDate = el.completionDateInput.value;
    if (!completionDate) {
      alert('Please select the Date of Completion.');
      el.completionDateInput.focus();
      return;
    }

    const staffName = el.completionStaffName ? el.completionStaffName.value.trim() : '';
    if (!staffName) {
      alert('Please enter your name (staff member or technician who performed this work).');
      if (el.completionStaffName) el.completionStaffName.focus();
      return;
    }

    const remarks = el.completionRemarksInput.value.trim();
    if (!remarks) {
      alert('Please enter completion remarks describing the maintenance done.');
      el.completionRemarksInput.focus();
      return;
    }

    if (!state.completionAttachedImageData) {
      alert('Proof image is required before completing this task. Please attach or drop an image.');
      return;
    }

    const condition = el.completionConditionSelect.value;
    const nowIso = new Date().toISOString();
    const proofUrl = state.completionAttachedImageData;

    // 1. Mark task completed with chosen completion date and staff performer name
    task.status = 'Completed';
    task.completedAt = completionDate;
    task.completedTimestamp = nowIso;
    task.completedBy = staffName;
    task.condition = condition;
    task.completionRemarks = remarks;
    task.proofImage = proofUrl;

    // 2. Compute Next Maintenance Cycle due date and its color status
    let nextDate = task.nextCycleDueDate;
    if (!nextDate || nextDate <= completionDate) {
      nextDate = calculateNextCycleDate(task.dueDate || completionDate, task.cycle);
    }
    let nextStatusText = '';
    if (nextDate && task.cycle !== 'One-Time Inspection') {
      task.nextCycleDueDate = nextDate;
      const nextCycleStatus = calculateDateStatus(nextDate);
      const nextMeta = getStatusMeta(nextCycleStatus);
      nextStatusText = `\nNext ${task.cycle} Maintenance Scheduled: ${formatDateDisplay(nextDate)} (${nextMeta.label})`;
    }

    // 3. Log comment into history with permanent proof image URL & Performed By name
    task.comments = task.comments || [];
    task.comments.push({
      id: 'c-' + Date.now(),
      author: `${staffName} (${task.store})`,
      role: isAdmin() ? 'admin' : 'store',
      text: `✅ Task Completed on ${formatDateDisplay(completionDate)} by ${staffName} & Verified\nRemarks: ${remarks}${nextStatusText}`,
      proofImage: proofUrl,
      completionDate: completionDate,
      timestamp: nowIso,
      isVerification: true
    });

    saveState();
    syncTaskToCloud(task);

    // Notify Admin that task has been completed with photo verification
    sendAppNotification({
      target: 'admin',
      type: 'task_completed',
      title: 'Task Completed & Verified',
      message: `${staffName} (${task.store}) completed maintenance on "${task.assetName}" with verified photo proof.`,
      taskId: task.id,
      sender: `${staffName} (${task.store})`
    });

    closeCompletionModal();
    render();

    if (nextDate && task.cycle !== 'One-Time Inspection') {
      const nextCycleStatus = calculateDateStatus(nextDate);
      const nextMeta = getStatusMeta(nextCycleStatus);
      showToast(`Task completed on ${formatDateDisplay(completionDate)}! Next ${task.cycle} cycle: ${formatDateDisplay(nextDate)} (${nextMeta.label})`);
    } else {
      showToast(`Task marked completed on ${formatDateDisplay(completionDate)} with verified photo!`);
    }

    if (state.activeDrawerTaskId === taskId) {
      openCommentsDrawer(taskId);
    }
  }

  // =========================================================================
  // Lightbox Image Viewer
  // =========================================================================

  function openLightbox(imageSrc, caption = 'Maintenance Photo Evidence') {
    if (!imageSrc) return;
    el.lightboxImage.src = imageSrc;
    el.lightboxCaption.textContent = caption;
    el.lightboxModal.classList.add('open');
    el.lightboxModal.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    el.lightboxModal.classList.remove('open');
    el.lightboxModal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      el.lightboxImage.src = '';
    }, 200);
  }

  // =========================================================================
  // Task Create / Edit Modal (Admin Only) with Specific Next Cycle Date & Custom Category & Custom Condition
  // =========================================================================

  function updateModalNextCyclePreview() {
    if (!el.formNextCycleDate || !el.formNextCycleStatusPreview) return;
    const dateVal = el.formNextCycleDate.value;
    if (!dateVal) {
      el.formNextCycleStatusPreview.textContent = 'Not Set';
      el.formNextCycleStatusPreview.className = 'status-chip chip-upcoming';
      return;
    }
    const status = calculateDateStatus(dateVal);
    const meta = getStatusMeta(status);
    el.formNextCycleStatusPreview.textContent = meta.label;
    el.formNextCycleStatusPreview.className = `status-chip ${meta.className}`;
  }

  function autoCalculateModalNextCycle() {
    const baseDate = el.formDueDate.value || TODAY_STR;
    const cycle = el.formCycle.value;
    const calculated = calculateNextCycleDate(baseDate, cycle);
    if (calculated) {
      el.formNextCycleDate.value = calculated;
    } else if (cycle === 'Custom Scheduled Date') {
      if (!el.formNextCycleDate.value) el.formNextCycleDate.value = baseDate;
    } else {
      el.formNextCycleDate.value = '';
    }
    updateModalNextCyclePreview();
  }

  function openTaskModal(taskId = null) {
    if (!isAdmin()) {
      alert('Store accounts cannot edit task details or schedule tasks. Only Admins can modify tasks.');
      return;
    }

    if (state.storeAccounts.length === 0) {
      if (confirm('No store branches exist yet. Would you like to create a store branch first in Store Credentials?')) {
        openStoreManagementModal();
      }
      return;
    }

    el.taskForm.reset();
    hideCustomCategoryInput();
    hideCustomConditionInput();
    syncCategoryOptions();
    syncConditionOptions();
    closeSidebar();

    if (taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;
      el.modalTitle.textContent = 'Edit Asset Task';
      el.formTaskId.value = task.id;
      el.formAssetName.value = task.assetName || '';

      // Ensure category exists in list
      if (task.category && !state.categories.includes(task.category)) {
        state.categories.push(task.category);
        syncCategoryOptions();
        syncMetadataToCloud();
      }
      el.formCategory.value = task.category || '';

      // Ensure condition exists in list
      if (task.condition && !state.conditions.includes(task.condition)) {
        state.conditions.push(task.condition);
        syncConditionOptions();
        syncMetadataToCloud();
      }
      el.formCondition.value = task.condition || 'Good';

      el.formStore.value = task.store || '';
      el.formLocation.value = task.location || '';
      el.formDueDate.value = task.dueDate || '';
      el.formCycle.value = task.cycle || 'Monthly';
      el.formSerial.value = task.serialNumber || '';
      el.formCost.value = task.estimatedCost || '';
      el.formPriority.value = task.priority || 'Medium';
      el.formDescription.value = task.description || '';

      // Specific next cycle date set by admin or auto-computed
      if (task.nextCycleDueDate) {
        el.formNextCycleDate.value = task.nextCycleDueDate;
      } else {
        const autoNext = calculateNextCycleDate(task.dueDate, task.cycle);
        el.formNextCycleDate.value = autoNext || '';
      }

      if (task.status === 'Completed') {
        el.formStatusOverride.value = 'Completed';
      } else {
        el.formStatusOverride.value = 'auto';
      }
    } else {
      el.modalTitle.textContent = 'Create Asset Task';
      el.formTaskId.value = '';
      el.formDueDate.value = TODAY_STR;
      el.formCycle.value = 'Monthly';
      el.formCondition.value = state.conditions[0] || 'Excellent';
      el.formPriority.value = 'Medium';
      el.formStatusOverride.value = 'auto';

      const autoNext = calculateNextCycleDate(TODAY_STR, 'Monthly');
      el.formNextCycleDate.value = autoNext || '';
    }

    updateModalNextCyclePreview();
    el.formStatusOverrideContainer.classList.remove('hidden');
    el.taskModal.classList.add('open');
    el.taskModal.setAttribute('aria-hidden', 'false');
    el.formAssetName.focus();
  }

  function closeTaskModal() {
    el.taskModal.classList.remove('open');
    el.taskModal.setAttribute('aria-hidden', 'true');
    hideCustomCategoryInput();
    hideCustomConditionInput();
  }

  // Helper: Detect if a comment is an automated system audit log
  function isTimelineSystemEvent(c) {
    if (!c || !c.text) return false;
    if (c.isSystemEvent || c.isSystemLog) return true;
    const text = c.text.trim();
    return (
      text.includes('Started next') && text.includes('cycle early') ||
      text.startsWith('Task created in category') ||
      text.startsWith('Auto-scheduled next cycle') ||
      text.startsWith('Task schedule modified by') ||
      text.startsWith('Task reassigned to')
    );
  }

  // Helper: Collect all unique verified proof photos from comments and task
  function getTimelinePhotos(task) {
    if (!task) return [];
    const allPhotos = [];
    if (task.comments && task.comments.length) {
      task.comments.forEach(c => {
        if (c.proofImage) {
          allPhotos.push({
            src: c.proofImage,
            date: c.completionDate || c.timestamp,
            author: c.author || 'Store Inspector',
            remarks: c.text && !c.text.startsWith('Task Completed on') ? c.text : '',
            timestamp: c.timestamp
          });
        }
      });
    }
    if (task.proofImage && !allPhotos.some(p => p.src === task.proofImage)) {
      allPhotos.unshift({
        src: task.proofImage,
        date: task.completedAt || task.completedTimestamp || 'Latest Cycle',
        author: task.completedBy || 'Store Inspector',
        remarks: task.completionRemarks || '',
        timestamp: task.completedAt || ''
      });
    }
    return allPhotos;
  }

  // Toggle Instructions Accordion in Drawer
  function toggleDrawerInstructions() {
    if (!el.drawerInstructionsBox || !el.drawerInstructionsContent) return;
    const isOpen = el.drawerInstructionsBox.classList.contains('open');
    if (isOpen) {
      el.drawerInstructionsBox.classList.remove('open');
      el.drawerInstructionsContent.classList.add('hidden');
      if (el.drawerInstructionsToggle) el.drawerInstructionsToggle.setAttribute('aria-expanded', 'false');
    } else {
      el.drawerInstructionsBox.classList.add('open');
      el.drawerInstructionsContent.classList.remove('hidden');
      if (el.drawerInstructionsToggle) el.drawerInstructionsToggle.setAttribute('aria-expanded', 'true');
    }
  }

  // Render Preset Action Chips
  function renderDrawerQuickChips() {
    if (!el.drawerQuickChips) return;
    const adminChips = [
      '📌 Approved & Logged',
      '⚠️ Re-inspection Needed',
      '🔍 Upload Clearer Photo',
      '🛠️ Contractor Contacted',
      '💬 General Note'
    ];
    const storeChips = [
      '✅ Routine Clean Done',
      '⚠️ Replacement Part Needed',
      '📞 Contacting Technician',
      '⏳ Pending Manager Check',
      '📸 Proof Photo Uploaded'
    ];

    const chips = isAdmin() ? adminChips : storeChips;
    el.drawerQuickChips.innerHTML = chips.map(chip => `
      <button type="button" class="quick-chip" onclick="window.assetApp.insertQuickChipText('${escapeHTML(chip)}')">
        ${escapeHTML(chip)}
      </button>
    `).join('');
  }

  // Insert Quick Chip text into Comment Box
  function insertQuickChipText(chipText) {
    if (!el.commentInput) return;
    const current = el.commentInput.value.trim();
    if (!current) {
      el.commentInput.value = chipText + ' — ';
    } else {
      el.commentInput.value = current + ' | ' + chipText;
    }
    el.commentInput.focus();
  }

  // Switch Drawer Segmented Tabs
  function switchDrawerTab(tabName) {
    state.drawerActiveTab = tabName;
    const tabBtns = document.querySelectorAll('.drawer-tab-btn');
    tabBtns.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    const task = state.tasks.find(t => t.id === state.activeDrawerTaskId);
    if (!task) return;

    if (tabName === 'photos') {
      if (el.drawerViewTimeline) el.drawerViewTimeline.classList.add('hidden');
      if (el.drawerViewPhotos) el.drawerViewPhotos.classList.remove('hidden');
      renderPhotosGallery(task, getTimelinePhotos(task));
    } else {
      if (el.drawerViewPhotos) el.drawerViewPhotos.classList.add('hidden');
      if (el.drawerViewTimeline) el.drawerViewTimeline.classList.remove('hidden');
      renderTimelineStream(task, tabName);
    }
  }

  // Render Connected Activity Timeline Stream
  function renderTimelineStream(task, mode = 'all') {
    if (!el.commentsList) return;
    const allComments = task.comments || [];
    let displayComments = allComments;

    if (mode === 'remarks') {
      displayComments = allComments.filter(c => !isTimelineSystemEvent(c));
    }

    if (displayComments.length === 0) {
      const msg = mode === 'remarks'
        ? 'No remarks or discussions posted yet. Use the note box below to start a conversation.'
        : 'No activity logged yet for this asset task.';
      el.commentsList.innerHTML = `
        <div class="empty-timeline-state">
          <div class="empty-timeline-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="empty-timeline-text">${escapeHTML(msg)}</div>
        </div>
      `;
      return;
    }

    el.commentsList.innerHTML = displayComments.map(c => {
      const isSys = isTimelineSystemEvent(c);

      // 1. Compact System Event Pill
      if (isSys) {
        let sysIcon = '🔄';
        if (c.text.includes('Task created')) sysIcon = '✨';
        else if (c.text.includes('early')) sysIcon = '🚀';

        return `
          <div class="timeline-system-pill">
            <div class="system-pill-content">
              <span class="system-pill-icon">${sysIcon}</span>
              <span class="system-pill-text">${escapeHTML(c.text)}</span>
              <span class="system-pill-time">• ${formatTimeDisplay(c.timestamp)}</span>
            </div>
          </div>
        `;
      }

      // 2. User Comment or Verified Proof Milestone
      const isRoleAdmin = c.role === 'admin';
      const isVerified = Boolean(c.isVerification || c.proofImage);
      const authorName = c.author || (isRoleAdmin ? 'Admin' : 'Store');
      const initials = authorName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase() || 'U';

      let roleTagHtml = '';
      if (isVerified) {
        roleTagHtml = `<span class="timeline-role-tag tag-verified">Proof Verified ✓</span>`;
      } else if (isRoleAdmin) {
        roleTagHtml = `<span class="timeline-role-tag tag-admin">Admin HQ</span>`;
      } else {
        roleTagHtml = `<span class="timeline-role-tag tag-store">Store</span>`;
      }

      let avatarClass = isVerified ? 'avatar-verified' : (isRoleAdmin ? 'avatar-admin' : 'avatar-store');

      return `
        <div class="timeline-item">
          <div class="timeline-avatar ${avatarClass}">
            ${isVerified ? '✓' : escapeHTML(initials)}
          </div>
          <div class="timeline-card ${isVerified ? 'card-verified' : ''}">
            <div class="timeline-card-header">
              <div class="timeline-author-info">
                <span class="timeline-author-name">${escapeHTML(authorName)}</span>
                ${roleTagHtml}
              </div>
              <span class="timeline-time">${formatTimeDisplay(c.timestamp)}</span>
            </div>
            <p class="timeline-message">${escapeHTML(c.text)}</p>
            ${c.proofImage ? `
              <div class="timeline-proof-preview" onclick="window.assetApp.openLightbox('${c.proofImage}', '${escapeHTML(task.assetName)} — Verified Photo Proof (${formatDateDisplay(c.completionDate || c.timestamp)})')">
                <img src="${c.proofImage}" alt="Verified Proof Thumbnail" class="timeline-proof-thumb">
                <div class="timeline-proof-details">
                  <span class="timeline-proof-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    Verified Maintenance Photo
                  </span>
                  <span class="timeline-proof-sub">Completed: ${formatDateDisplay(c.completionDate || c.timestamp)}</span>
                  <span class="timeline-proof-cta">Click to view full image &rarr;</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const drawerBody = document.querySelector('.drawer-body');
    if (drawerBody) {
      drawerBody.scrollTop = drawerBody.scrollHeight;
    }
  }

  // Render Visual Photos & Proofs Gallery
  function renderPhotosGallery(task, allPhotos) {
    if (!el.photosGalleryGrid) return;

    if (!allPhotos || allPhotos.length === 0) {
      el.photosGalleryGrid.innerHTML = `
        <div class="empty-timeline-state">
          <div class="empty-timeline-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div class="empty-timeline-text">No verified maintenance photos logged yet.</div>
          <div class="empty-timeline-sub">When store managers complete cycles with photo proof, they will appear here.</div>
        </div>
      `;
      return;
    }

    el.photosGalleryGrid.innerHTML = allPhotos.map((p, idx) => `
      <div class="photo-proof-card">
        <div class="photo-proof-img-wrap" onclick="window.assetApp.openLightbox('${p.src}', '${escapeHTML(task.assetName)} — Photo Proof (${formatDateDisplay(p.date)})')">
          <img src="${p.src}" alt="Maintenance Proof ${idx + 1}" class="photo-proof-card-img">
          <span class="photo-proof-cycle-badge">📸 Cycle Proof #${idx + 1}</span>
          <span class="photo-proof-zoom-hint">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            Click to Enlarge
          </span>
        </div>
        <div class="photo-proof-body">
          <div class="photo-proof-meta-row">
            <span class="photo-proof-inspector">👤 ${escapeHTML(p.author || 'Store Inspector')}</span>
            <span>📅 ${formatDateDisplay(p.date)}</span>
          </div>
          ${p.remarks ? `<div class="photo-proof-remarks">"${escapeHTML(p.remarks)}"</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  // Open Comments & Timeline Drawer
  function openCommentsDrawer(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    state.activeDrawerTaskId = taskId;
    const isComplete = task.status === 'Completed' || Boolean(task.completedAt);
    const nextCycleDate = task.nextCycleDueDate || calculateNextCycleDate(task.dueDate || TODAY_STR, task.cycle);
    const hasNextCycle = Boolean(nextCycleDate && task.cycle !== 'One-Time Inspection');
    const nextStatus = hasNextCycle ? calculateDateStatus(nextCycleDate) : null;
    const nextMeta = nextStatus ? getStatusMeta(nextStatus) : null;

    const status = (task.status === 'Completed') ? 'Completed' : calculateTaskStatus(task);
    const meta = getStatusMeta(status);
    const displayMeta = (isComplete && hasNextCycle && nextMeta) ? nextMeta : meta;

    if (el.drawerAssetName) el.drawerAssetName.textContent = task.assetName;
    if (el.drawerAssetMeta) el.drawerAssetMeta.textContent = `${task.store} • ${task.serialNumber ? '#' + task.serialNumber : task.category}`;
    if (el.drawerStatusBadge) {
      el.drawerStatusBadge.textContent = displayMeta.label;
      el.drawerStatusBadge.className = `status-chip ${displayMeta.className}`;
    }
    if (el.drawerDueBadge) {
      el.drawerDueBadge.textContent = (task.status === 'Completed' && task.completedAt)
        ? `Completed: ${formatDateDisplay(task.completedAt)}`
        : `Due: ${formatDateDisplay(task.dueDate)}`;
    }
    if (el.drawerConditionBadge) el.drawerConditionBadge.textContent = `Condition: ${task.condition}`;
    if (el.drawerCycleBadge) el.drawerCycleBadge.textContent = `Cycle: ${task.cycle || 'Monthly'}`;

    // Setup Instructions Accordion
    if (el.drawerInstructionsBox && el.drawerInstructionsText) {
      if (task.description) {
        el.drawerInstructionsText.textContent = task.description;
        el.drawerInstructionsBox.classList.remove('hidden');
        el.drawerInstructionsBox.classList.remove('open');
        if (el.drawerInstructionsContent) el.drawerInstructionsContent.classList.add('hidden');
        if (el.drawerInstructionsToggle) el.drawerInstructionsToggle.setAttribute('aria-expanded', 'false');
      } else {
        el.drawerInstructionsBox.classList.add('hidden');
      }
    }

    // Collect Photos & Comments for tab badges
    const allPhotos = getTimelinePhotos(task);
    const allComments = task.comments || [];
    const remarksOnly = allComments.filter(c => !isTimelineSystemEvent(c));

    if (el.tabAllCount) el.tabAllCount.textContent = allComments.length;
    if (el.tabPhotosCount) el.tabPhotosCount.textContent = allPhotos.length;
    if (el.tabRemarksCount) el.tabRemarksCount.textContent = remarksOnly.length;

    // Render Quick Action Chips & Posting Author
    renderDrawerQuickChips();
    if (el.commentAuthorLabel) el.commentAuthorLabel.textContent = getCurrentUserLabel();

    // Reset and switch to active tab
    const initialTab = state.drawerActiveTab || 'all';
    switchDrawerTab(initialTab);

    if (el.commentsDrawer) {
      el.commentsDrawer.classList.remove('hidden');
      setTimeout(() => {
        el.commentsDrawer.classList.add('open');
        el.commentsDrawer.setAttribute('aria-hidden', 'false');
      }, 10);
    }
    if (el.commentInput) el.commentInput.value = '';
  }

  function closeCommentsDrawer() {
    if (!el.commentsDrawer) return;
    el.commentsDrawer.classList.remove('open');
    el.commentsDrawer.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      el.commentsDrawer.classList.add('hidden');
      state.activeDrawerTaskId = null;
    }, 280);
  }

  // Form Submit (Create / Edit) - Admin Only
  function handleFormSubmit(e) {
    e.preventDefault();
    if (!isAdmin()) {
      alert('Permission denied. Only Admins can modify task configurations.');
      return;
    }

    const taskId = el.formTaskId.value.trim();
    const isEdit = Boolean(taskId);

    const assetName = el.formAssetName.value.trim();
    let category = el.formCategory.value;

    if (category === '__NEW_CUSTOM__') {
      const customInputVal = el.formCustomCategoryInput.value.trim();
      if (!customInputVal) {
        alert('Please enter a name for the custom category or select an existing one.');
        el.formCustomCategoryInput.focus();
        return;
      }
      addCustomCategory(customInputVal);
      category = customInputVal;
    }

    let condition = el.formCondition.value;
    if (condition === '__NEW_CUSTOM_COND__') {
      const customCondVal = el.formCustomConditionInput.value.trim();
      if (!customCondVal) {
        alert('Please enter a name for the custom asset condition or select an existing one.');
        el.formCustomConditionInput.focus();
        return;
      }
      addCustomCondition(customCondVal);
      condition = customCondVal;
    }

    const store = el.formStore.value;
    const location = el.formLocation.value.trim();
    const dueDate = el.formDueDate.value;
    const cycle = el.formCycle.value;
    const nextCycleDueDate = el.formNextCycleDate.value || null;
    const serialNumber = el.formSerial.value.trim();
    const estimatedCost = el.formCost.value ? parseFloat(el.formCost.value) : null;
    const priority = el.formPriority.value;
    const statusOverride = el.formStatusOverride.value;
    const description = el.formDescription.value.trim();

    if (!assetName || !category || !store || !location || !dueDate || !condition) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    if (isEdit) {
      const taskIndex = state.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const existing = state.tasks[taskIndex];
      let newStatus = existing.status;

      if (statusOverride === 'Completed') {
        newStatus = 'Completed';
        existing.completedAt = existing.completedAt || TODAY_STR;
      } else if (statusOverride === 'auto') {
        existing.completedAt = null;
        newStatus = calculateTaskStatus({ dueDate });
      } else {
        newStatus = statusOverride;
      }

      const updatedTask = {
        ...existing,
        assetName,
        category,
        store,
        location,
        dueDate,
        cycle,
        nextCycleDueDate,
        condition,
        serialNumber,
        estimatedCost,
        priority,
        status: newStatus,
        description
      };

      state.tasks[taskIndex] = updatedTask;
      saveState();
      syncTaskToCloud(updatedTask);

      // Notify Store of Task Updates
      sendAppNotification({
        target: updatedTask.store,
        type: 'task_updated',
        title: 'Task Details Updated',
        message: `Admin updated maintenance specifications/schedule for "${updatedTask.assetName}".`,
        taskId: updatedTask.id,
        sender: 'Admin (Headquarters)'
      });

      showToast(`Updated task: ${assetName} (Synced to Cloud)`);
    } else {
      const newTask = {
        id: 'task-' + Date.now(),
        assetName,
        category,
        store,
        location,
        dueDate,
        cycle,
        nextCycleDueDate,
        condition,
        serialNumber,
        estimatedCost,
        priority,
        status: statusOverride === 'Completed' ? 'Completed' : calculateTaskStatus({ dueDate }),
        completedAt: statusOverride === 'Completed' ? TODAY_STR : null,
        description,
        comments: [
          {
            id: 'c-' + Date.now(),
            author: getCurrentUserLabel(),
            role: 'admin',
            text: `Task created in category "${category}" (${cycle} cycle${nextCycleDueDate ? ` • Next: ${formatDateDisplay(nextCycleDueDate)}` : ''}). Assigned to ${store}.`,
            timestamp: new Date().toISOString()
          }
        ]
      };

      state.tasks.unshift(newTask);
      saveState();
      syncTaskToCloud(newTask);

      // Notify Assigned Store of New Task
      sendAppNotification({
        target: newTask.store,
        type: 'task_created',
        title: 'New Maintenance Task Assigned',
        message: `Admin assigned new ${newTask.cycle} maintenance for "${newTask.assetName}" at ${newTask.store} (Due: ${formatDateDisplay(newTask.dueDate)}).`,
        taskId: newTask.id,
        sender: 'Admin (Headquarters)'
      });

      showToast(`New task created for ${store} (Synced to Cloud)`);
    }

    closeTaskModal();
    render();
  }

  // Handle Comment Submit
  function handleCommentSubmit(e) {
    e.preventDefault();
    if (!state.activeDrawerTaskId) return;

    const text = el.commentInput.value.trim();
    if (!text) return;

    const task = state.tasks.find(t => t.id === state.activeDrawerTaskId);
    if (!task) return;

    task.comments = task.comments || [];
    task.comments.push({
      id: 'c-' + Date.now(),
      author: getCurrentUserLabel(),
      role: isAdmin() ? 'admin' : 'store',
      text: text,
      timestamp: new Date().toISOString()
    });

    saveState();
    syncTaskToCloud(task);

    // Cross-notify (Store -> Admin or Admin -> Store)
    const targetRecipient = isAdmin() ? task.store : 'admin';
    sendAppNotification({
      target: targetRecipient,
      type: 'comment_added',
      title: `New Remark on "${task.assetName}"`,
      message: `${getCurrentUserLabel()}: "${text.length > 70 ? text.substring(0, 67) + '...' : text}"`,
      taskId: task.id,
      sender: getCurrentUserLabel()
    });

    // Update tab badges & refresh active view
    const allPhotos = getTimelinePhotos(task);
    const remarksOnly = (task.comments || []).filter(c => !isTimelineSystemEvent(c));
    if (el.tabAllCount) el.tabAllCount.textContent = task.comments.length;
    if (el.tabPhotosCount) el.tabPhotosCount.textContent = allPhotos.length;
    if (el.tabRemarksCount) el.tabRemarksCount.textContent = remarksOnly.length;

    switchDrawerTab(state.drawerActiveTab || 'all');
    render();
    el.commentInput.value = '';
    showToast('Remark posted and synced to Cloud');
  }

  // Update Asset Condition (Admin Only)
  function updateTaskCondition(taskId, newCondition) {
    if (!isAdmin()) {
      alert('Permission denied. Only Admins can modify asset conditions.');
      return;
    }
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldCondition = task.condition;
    if (oldCondition === newCondition) return;

    task.condition = newCondition;
    task.comments = task.comments || [];
    task.comments.push({
      id: 'c-' + Date.now(),
      author: 'Admin (HQ Operations)',
      role: 'admin',
      isSystemEvent: true,
      text: `Admin updated condition from "${oldCondition}" to "${newCondition}".`,
      timestamp: new Date().toISOString()
    });

    saveState();
    syncTaskToCloud(task);
    render();
    showToast(`Asset condition updated to "${newCondition}"`);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Event Listeners
  function bindEvents() {
    el.tabStoreLogin.addEventListener('click', () => {
      state.authTab = 'store';
      el.tabStoreLogin.classList.add('active');
      el.tabAdminLogin.classList.remove('active');
      el.storeLoginFields.classList.remove('hidden');
      el.adminLoginFields.classList.add('hidden');
      el.loginErrorMsg.classList.add('hidden');
      setTimeout(() => {
        if (el.loginStorePin) el.loginStorePin.focus();
      }, 50);
    });

    el.tabAdminLogin.addEventListener('click', () => {
      state.authTab = 'admin';
      el.tabAdminLogin.classList.add('active');
      el.tabStoreLogin.classList.remove('active');
      el.adminLoginFields.classList.remove('hidden');
      el.storeLoginFields.classList.add('hidden');
      el.loginErrorMsg.classList.add('hidden');
      setTimeout(() => {
        if (el.loginAdminPassword) el.loginAdminPassword.focus();
      }, 50);
    });

    el.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      el.loginErrorMsg.classList.add('hidden');

      if (state.authTab === 'admin') {
        const user = (el.loginAdminUser.value || '').trim();
        const pass = (el.loginAdminPassword.value || '').trim();

        if (!user) {
          el.loginErrorMsg.textContent = 'Please enter admin username.';
          el.loginErrorMsg.classList.remove('hidden');
          el.loginAdminUser.focus();
          return;
        }

        if (!pass) {
          el.loginErrorMsg.textContent = 'Please enter admin password.';
          el.loginErrorMsg.classList.remove('hidden');
          el.loginAdminPassword.focus();
          return;
        }

        const validUser = (user.toLowerCase() === 'admin' || user.toLowerCase() === 'admin@assetflow.com');
        const validPass = (pass === 'admin123' || pass === 'admin010211' || pass === 'admin');

        if (!validUser || !validPass) {
          el.loginErrorMsg.textContent = 'Incorrect admin username or password. (Password: admin123)';
          el.loginErrorMsg.classList.remove('hidden');
          return;
        }

        login('admin');
      } else {
        if (state.storeAccounts.length === 0) {
          el.loginErrorMsg.textContent = 'No store branches configured yet. Please switch to the "Admin Login" tab and log in as Admin to add store branches.';
          el.loginErrorMsg.classList.remove('hidden');
          return;
        }

        const storeName = el.loginStoreSelect.value;
        const pin = (el.loginStorePin.value || '').trim();
        const storeAccount = state.storeAccounts.find(s => s.name === storeName);

        if (!storeAccount) {
          el.loginErrorMsg.textContent = 'Store branch not found.';
          el.loginErrorMsg.classList.remove('hidden');
          return;
        }

        if (!pin) {
          el.loginErrorMsg.textContent = 'Please enter the store access PIN.';
          el.loginErrorMsg.classList.remove('hidden');
          el.loginStorePin.focus();
          return;
        }

        if (storeAccount.pin && pin !== storeAccount.pin) {
          el.loginErrorMsg.textContent = `Incorrect PIN for ${storeName}. Contact your Admin if forgotten.`;
          el.loginErrorMsg.classList.remove('hidden');
          return;
        }

        login('store', storeName);
      }
    });

    el.btnLogout.addEventListener('click', logout);

    // Sidebar Mobile Toggle
    if (el.btnToggleSidebar) {
      el.btnToggleSidebar.addEventListener('click', openSidebar);
    }
    if (el.btnCloseSidebar) {
      el.btnCloseSidebar.addEventListener('click', closeSidebar);
    }
    if (el.sidebarBackdrop) {
      el.sidebarBackdrop.addEventListener('click', closeSidebar);
    }

    // Sidebar Filter Links
    if (el.sidebarLinks) {
      el.sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
          const filter = link.dataset.sidebarFilter;
          state.filterStatus = filter;
          render();
          closeSidebar();
        });
      });
    }

    el.btnManageStores.addEventListener('click', openStoreManagementModal);
    el.btnStoreMgmtClose.addEventListener('click', closeStoreManagementModal);
    el.btnStoreMgmtDone.addEventListener('click', closeStoreManagementModal);
    el.storeManagementModal.addEventListener('click', (e) => {
      if (e.target === el.storeManagementModal) closeStoreManagementModal();
    });
    el.addStoreForm.addEventListener('submit', handleAddStoreSubmit);

    el.adminStoreQuickSwitch.addEventListener('change', (e) => {
      state.filterStore = e.target.value;
      if (el.filterStore) el.filterStore.value = e.target.value;
      render();
    });

    el.kpiCards.forEach(card => {
      card.addEventListener('click', () => {
        const filter = card.dataset.filterStatus;
        if (state.filterStatus === filter) {
          state.filterStatus = 'all';
        } else {
          state.filterStatus = filter;
        }
        render();
      });
    });

    el.btnClearAllFilters.addEventListener('click', () => {
      state.filterStatus = 'all';
      render();
    });

    el.btnEmptyReset.addEventListener('click', () => {
      state.filterStatus = 'all';
      state.filterCategory = 'all';
      state.filterStore = 'all';
      state.searchQuery = '';
      el.filterCategory.value = 'all';
      el.filterStore.value = 'all';
      el.adminStoreQuickSwitch.value = 'all';
      el.searchInput.value = '';
      el.btnClearSearch.classList.add('hidden');
      render();
    });

    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      if (state.searchQuery) {
        el.btnClearSearch.classList.remove('hidden');
      } else {
        el.btnClearSearch.classList.add('hidden');
      }
      render();
    });

    el.btnClearSearch.addEventListener('click', () => {
      el.searchInput.value = '';
      state.searchQuery = '';
      el.btnClearSearch.classList.add('hidden');
      render();
    });

    el.filterStore.addEventListener('change', (e) => {
      state.filterStore = e.target.value;
      el.adminStoreQuickSwitch.value = e.target.value;
      render();
    });

    el.filterCategory.addEventListener('change', (e) => {
      state.filterCategory = e.target.value;
      render();
    });

    el.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      render();
    });

    el.viewToggleGrid.addEventListener('click', () => {
      state.viewMode = 'grid';
      el.viewToggleGrid.classList.add('active');
      el.viewToggleTable.classList.remove('active');
      if (el.viewToggleCalendar) el.viewToggleCalendar.classList.remove('active');
      render();
    });

    el.viewToggleTable.addEventListener('click', () => {
      state.viewMode = 'table';
      el.viewToggleTable.classList.add('active');
      el.viewToggleGrid.classList.remove('active');
      if (el.viewToggleCalendar) el.viewToggleCalendar.classList.remove('active');
      render();
    });

    if (el.viewToggleCalendar) {
      el.viewToggleCalendar.addEventListener('click', () => {
        state.viewMode = 'calendar';
        el.viewToggleCalendar.classList.add('active');
        el.viewToggleGrid.classList.remove('active');
        el.viewToggleTable.classList.remove('active');
        render();
      });
    }

    if (el.btnCalendarPrev) el.btnCalendarPrev.addEventListener('click', prevCalendarMonth);
    if (el.btnCalendarNext) el.btnCalendarNext.addEventListener('click', nextCalendarMonth);
    if (el.btnCalendarToday) el.btnCalendarToday.addEventListener('click', goCalendarToday);

    el.btnCreateTask.addEventListener('click', () => {
      openTaskModal(null);
    });

    el.btnModalClose.addEventListener('click', closeTaskModal);
    el.btnModalCancel.addEventListener('click', closeTaskModal);
    el.taskModal.addEventListener('click', (e) => {
      if (e.target === el.taskModal) closeTaskModal();
    });
    el.taskForm.addEventListener('submit', handleFormSubmit);

    // Custom Category Event Listeners
    el.btnToggleCustomCategory.addEventListener('click', () => {
      showCustomCategoryInput();
    });

    el.formCategory.addEventListener('change', (e) => {
      if (e.target.value === '__NEW_CUSTOM__') {
        showCustomCategoryInput();
      } else {
        hideCustomCategoryInput();
      }
    });

    el.btnSaveCustomCategory.addEventListener('click', () => {
      addCustomCategory(el.formCustomCategoryInput.value);
    });

    el.btnCancelCustomCategory.addEventListener('click', () => {
      hideCustomCategoryInput();
    });

    el.formCustomCategoryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomCategory(el.formCustomCategoryInput.value);
      } else if (e.key === 'Escape') {
        hideCustomCategoryInput();
      }
    });

    // Custom Condition Event Listeners
    el.btnToggleCustomCondition.addEventListener('click', () => {
      showCustomConditionInput();
    });

    el.formCondition.addEventListener('change', (e) => {
      if (e.target.value === '__NEW_CUSTOM_COND__') {
        showCustomConditionInput();
      } else {
        hideCustomConditionInput();
      }
    });

    el.btnSaveCustomCondition.addEventListener('click', () => {
      addCustomCondition(el.formCustomConditionInput.value);
    });

    el.btnCancelCustomCondition.addEventListener('click', () => {
      hideCustomConditionInput();
    });

    el.formCustomConditionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomCondition(el.formCustomConditionInput.value);
      } else if (e.key === 'Escape') {
        hideCustomConditionInput();
      }
    });

    // Live calculations and change handlers in task modal
    el.formDueDate.addEventListener('change', () => {
      if (!el.formNextCycleDate.value || el.formCycle.value !== 'Custom Scheduled Date') {
        autoCalculateModalNextCycle();
      }
    });

    el.formCycle.addEventListener('change', () => {
      autoCalculateModalNextCycle();
    });

    el.formNextCycleDate.addEventListener('input', () => {
      updateModalNextCyclePreview();
    });

    el.btnAutoCalcCycle.addEventListener('click', () => {
      autoCalculateModalNextCycle();
      showToast('Recalculated next cycle date.');
    });

    // Completion Modal controls
    el.btnCompletionModalClose.addEventListener('click', closeCompletionModal);
    el.btnCompletionModalCancel.addEventListener('click', closeCompletionModal);
    el.completionModal.addEventListener('click', (e) => {
      if (e.target === el.completionModal) closeCompletionModal();
    });
    el.completionForm.addEventListener('submit', handleCompletionFormSubmit);

    // Image Upload Zone click & drop
    el.imageUploadZone.addEventListener('click', (e) => {
      if (e.target.closest('#btn-remove-image')) return;
      el.completionImageFile.click();
    });

    el.completionImageFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFileUpload(e.target.files[0]);
      }
    });

    el.imageUploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.imageUploadZone.style.borderColor = '#2563EB';
    });

    el.imageUploadZone.addEventListener('dragleave', () => {
      el.imageUploadZone.style.borderColor = '';
    });

    el.imageUploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.imageUploadZone.style.borderColor = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFileUpload(e.dataTransfer.files[0]);
      }
    });

    el.btnRemoveImage.addEventListener('click', (e) => {
      e.stopPropagation();
      removeAttachedCompletionImage();
    });

    // Lightbox Modal
    el.btnLightboxClose.addEventListener('click', closeLightbox);
    el.lightboxModal.addEventListener('click', (e) => {
      if (e.target === el.lightboxModal) closeLightbox();
    });

    // Drawer controls
    if (el.btnDrawerClose) el.btnDrawerClose.addEventListener('click', closeCommentsDrawer);
    if (el.commentsDrawer) {
      el.commentsDrawer.addEventListener('click', (e) => {
        if (e.target === el.commentsDrawer) closeCommentsDrawer();
      });
    }
    if (el.commentForm) el.commentForm.addEventListener('submit', handleCommentSubmit);

    // Drawer Tabs Event Listeners
    const drawerTabBtns = document.querySelectorAll('.drawer-tab-btn');
    drawerTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchDrawerTab(btn.dataset.tab);
      });
    });

    // Drawer Instructions Accordion
    if (el.drawerInstructionsToggle) {
      el.drawerInstructionsToggle.addEventListener('click', toggleDrawerInstructions);
    }

    // Ctrl+Enter or Cmd+Enter to post comment quickly
    if (el.commentInput) {
      el.commentInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          if (el.commentForm) {
            el.commentForm.requestSubmit ? el.commentForm.requestSubmit() : handleCommentSubmit(e);
          }
        }
      });
    }

    // Confirmation Modal
    if (el.confirmModal) {
      el.confirmModal.addEventListener('click', (e) => {
        if (e.target === el.confirmModal) closeConfirmModal();
      });
    }

    // Notification Center Event Listeners
    if (el.btnNotificationBell) {
      el.btnNotificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNotificationDropdown();
      });
    }

    if (el.btnMarkAllRead) {
      el.btnMarkAllRead.addEventListener('click', (e) => {
        e.stopPropagation();
        markAllNotificationsRead();
      });
    }

    if (el.btnClearNotifications) {
      el.btnClearNotifications.addEventListener('click', (e) => {
        e.stopPropagation();
        clearNotifications();
      });
    }

    if (el.notificationDropdown) {
      el.notificationDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    document.addEventListener('click', () => {
      closeNotificationDropdown();
    });

    // Export Reports Event Listeners
    if (el.btnOpenExport) {
      el.btnOpenExport.addEventListener('click', openExportModal);
    }
    if (el.btnExportClose) {
      el.btnExportClose.addEventListener('click', closeExportModal);
    }
    if (el.btnExportCancel) {
      el.btnExportCancel.addEventListener('click', closeExportModal);
    }
    if (el.exportScopeSelect) {
      el.exportScopeSelect.addEventListener('change', updateExportPreview);
    }
    if (el.btnExportCsv) {
      el.btnExportCsv.addEventListener('click', exportToCSV);
    }
    if (el.btnExportPdf) {
      el.btnExportPdf.addEventListener('click', generatePDFReport);
    }
    if (el.exportModal) {
      el.exportModal.addEventListener('click', (e) => {
        if (e.target === el.exportModal) closeExportModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
        closeNotificationDropdown();
        if (el.exportModal && el.exportModal.classList.contains('open')) closeExportModal();
        if (el.confirmModal && el.confirmModal.classList.contains('open')) closeConfirmModal();
        if (el.storeManagementModal.classList.contains('open')) closeStoreManagementModal();
        if (el.lightboxModal.classList.contains('open')) closeLightbox();
        if (el.completionModal.classList.contains('open')) closeCompletionModal();
        if (el.taskModal.classList.contains('open')) closeTaskModal();
        if (el.commentsDrawer.classList.contains('open')) closeCommentsDrawer();
      }
    });
  }

  let draggedTaskId = null;

  function setupTaskDragAndDrop() {
    const grid = el.taskGrid;
    const tableBody = el.taskTableBody;

    function handleDragStart(e) {
      const item = e.target.closest('[data-task-id]');
      if (!item) return;
      draggedTaskId = item.getAttribute('data-task-id');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedTaskId);
      setTimeout(() => item.classList.add('is-dragging'), 0);
    }

    function handleDragEnd(e) {
      const item = e.target.closest('[data-task-id]');
      if (item) item.classList.remove('is-dragging');
      document.querySelectorAll('.is-dragging').forEach(elem => elem.classList.remove('is-dragging'));
      draggedTaskId = null;
    }

    function handleDragOver(e) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }

    function handleDrop(e) {
      e.preventDefault();
      const dropTarget = e.target.closest('[data-task-id]');
      if (!dropTarget || !draggedTaskId) return;

      const targetTaskId = dropTarget.getAttribute('data-task-id');
      if (!targetTaskId || targetTaskId === draggedTaskId) return;

      const draggedIdx = state.tasks.findIndex(t => t.id === draggedTaskId);
      const targetIdx = state.tasks.findIndex(t => t.id === targetTaskId);

      if (draggedIdx !== -1 && targetIdx !== -1) {
        const [movedTask] = state.tasks.splice(draggedIdx, 1);
        state.tasks.splice(targetIdx, 0, movedTask);

        state.sortBy = 'custom';
        if (el.sortSelect) el.sortSelect.value = 'custom';

        saveState();
        state.tasks.forEach(t => syncTaskToCloud(t));
        render();
        showToast('Task reordered & saved to Cloud!');
      }
    }

    [grid, tableBody].forEach(container => {
      if (!container) return;
      container.addEventListener('dragstart', handleDragStart);
      container.addEventListener('dragend', handleDragEnd);
      container.addEventListener('dragover', handleDragOver);
      container.addEventListener('drop', handleDrop);
    });
  }

  function init() {
    loadState();
    syncStoreOptions();
    syncCategoryOptions();
    syncConditionOptions();
    bindEvents();
    setupTaskDragAndDrop();
    render();
    setupCloudRealtimeListeners();
  }

  // Global interface for onclick actions
  window.assetApp = {
    openEditModal: openTaskModal,
    openComments: openCommentsDrawer,
    switchDrawerTab: switchDrawerTab,
    insertQuickChipText: insertQuickChipText,
    toggleDrawerInstructions: toggleDrawerInstructions,
    triggerTaskCompletion: triggerTaskCompletion,
    startNextCycleEarly: startNextCycleEarly,
    useSamplePhoto: useSamplePhoto,
    openLightbox: openLightbox,
    updateStoreAccount: updateStoreAccount,
    updateStorePin: updateStorePin,
    deleteStoreAccount: deleteStoreAccount,
    deleteTask: deleteTask,
    updateTaskCondition: updateTaskCondition,
    addCustomCategory: addCustomCategory,
    addCustomCondition: addCustomCondition,
    createTaskForDate: createTaskForDate,
    handleNotificationClick: handleNotificationClick,
    markNotificationRead: markNotificationRead,
    markAllNotificationsRead: markAllNotificationsRead,
    clearNotifications: clearNotifications,
    openExportModal: openExportModal,
    closeExportModal: closeExportModal,
    exportToCSV: exportToCSV,
    generatePDFReport: generatePDFReport
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
