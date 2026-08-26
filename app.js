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

  // Clean Initial State: No hardcoded demo store branches or sample tasks
  const DEFAULT_STORES = [];
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
    filterStatus: 'all',
    filterStore: 'all',
    filterCategory: 'all',
    searchQuery: '',
    sortBy: 'urgency',
    viewMode: 'grid',
    activeDrawerTaskId: null,
    
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

  // Calculate task status based on scheduled due date and completed state
  function calculateTaskStatus(task) {
    if (task.status === 'Completed' || task.completedAt) {
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
        base.setMonth(base.getMonth() + 3);
        break;
      case 'Semi-Annual':
        base.setMonth(base.getMonth() + 6);
        break;
      case 'Annual':
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
      snapshot.forEach(doc => cloudStores.push(doc.data()));
      if (snapshot.empty && state.storeAccounts && state.storeAccounts.length > 0) {
        state.storeAccounts.forEach(s => syncStoreToCloud(s));
      } else if (!snapshot.empty) {
        state.storeAccounts = cloudStores;
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
  }

  // Save to localStorage & Cloud
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.auth));
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(state.storeAccounts));
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(state.categories));
      localStorage.setItem(CONDITIONS_STORAGE_KEY, JSON.stringify(state.conditions));
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
      } else {
        state.storeAccounts = [];
      }

      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        state.auth = JSON.parse(savedAuth);
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

    // View toggles
    viewToggleGrid: document.getElementById('view-toggle-grid'),
    viewToggleTable: document.getElementById('view-toggle-table'),
    taskGrid: document.getElementById('task-grid'),
    taskTableWrapper: document.getElementById('task-table-wrapper'),
    taskTableBody: document.getElementById('task-table-body'),
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

    // Comments Drawer
    commentsDrawer: document.getElementById('comments-drawer'),
    btnDrawerClose: document.getElementById('btn-drawer-close'),
    drawerAssetName: document.getElementById('drawer-asset-name'),
    drawerAssetMeta: document.getElementById('drawer-asset-meta'),
    drawerStatusBadge: document.getElementById('drawer-status-badge'),
    drawerDueBadge: document.getElementById('drawer-due-badge'),
    drawerConditionBadge: document.getElementById('drawer-condition-badge'),
    drawerInstructionsBox: document.getElementById('drawer-instructions-box'),
    drawerInstructionsText: document.getElementById('drawer-instructions-text'),
    drawerProofBox: document.getElementById('drawer-proof-box'),
    drawerProofTitle: document.getElementById('drawer-proof-title'),
    drawerProofImg: document.getElementById('drawer-proof-img'),
    drawerGalleryContainer: document.getElementById('drawer-gallery-container'),
    drawerGalleryStrip: document.getElementById('drawer-gallery-strip'),
    commentsCount: document.getElementById('comments-count'),
    commentsList: document.getElementById('comments-list'),
    commentForm: document.getElementById('comment-form'),
    commentAuthorLabel: document.getElementById('comment-author-label'),
    commentInput: document.getElementById('comment-input'),

    // Lightbox Modal
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxImage: document.getElementById('lightbox-image'),
    lightboxCaption: document.getElementById('lightbox-caption'),
    btnLightboxClose: document.getElementById('btn-lightbox-close'),

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

      const currentStatus = (task.status === 'Completed') ? 'completed' : task.status.toLowerCase().replace(/\s+/g, '-');
      if (state.filterStatus !== 'all') {
        if (state.filterStatus === 'overdue' && currentStatus !== 'overdue') return false;
        if (state.filterStatus === 'due-today' && currentStatus !== 'due-today') return false;
        if (state.filterStatus === 'due-soon' && currentStatus !== 'due-soon') return false;
        if (state.filterStatus === 'upcoming' && currentStatus !== 'upcoming') return false;
        if (state.filterStatus === 'completed' && currentStatus !== 'completed') return false;
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
      if (state.sortBy === 'urgency') {
        const metaA = getStatusMeta(a.status);
        const metaB = getStatusMeta(b.status);
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
      const s = (t.status === 'Completed') ? 'Completed' : calculateTaskStatus(t);
      if (s === 'Overdue') overdue++;
      else if (s === 'Due Today') dueToday++;
      else if (s === 'Due Soon') dueSoon++;
      else if (s === 'Upcoming') upcoming++;
      else if (s === 'Completed') completed++;
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
      const storeAccount = state.storeAccounts.find(s => s.name === storeName);
      const managerContact = (storeAccount && storeAccount.manager && storeAccount.manager.trim()) 
        ? storeAccount.manager.trim() 
        : 'Store Staff / Operator';

      el.userDisplayName.textContent = storeName;
      el.userRoleLabel.textContent = managerContact;
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

      if (hasNextCycle) {
        const nextStatus = calculateDateStatus(nextCycleDate);
        const nextMeta = getStatusMeta(nextStatus);
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

      return `
        <article class="task-card" data-id="${task.id}">
          <div>
            <div class="task-card-header">
              <div class="task-title-group">
                <span class="task-category-tag">${escapeHTML(task.category)}</span>
                <h3 class="task-asset-title">
                  ${escapeHTML(task.assetName)}
                  ${task.serialNumber ? `<span class="task-id-badge">#${escapeHTML(task.serialNumber)}</span>` : ''}
                </h3>
              </div>
              <span class="status-chip ${meta.className}">
                <span class="status-dot ${meta.dotClass}"></span>
                ${meta.label}
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
                <span class="meta-value">
                  ${escapeHTML(task.cycle)} • <span class="condition-tag ${condClass}">${escapeHTML(task.condition)}</span>
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
                    Reopen
                  </button>
                ` : ''}

                ${hasNextCycle && !isAdmin() ? `
                  <button class="btn btn-primary btn-sm btn-start-cycle" onclick="window.assetApp.startNextCycleEarly('${task.id}')" title="Start next maintenance cycle early">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Start Next Cycle</span>
                  </button>
                ` : isAdmin() ? `
                  <span class="completed-lock-badge" title="Completed on ${formatDateDisplay(task.completedAt)}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    ✓ Completed
                  </span>
                ` : `
                  <span class="completed-lock-badge" title="Completed on ${formatDateDisplay(task.completedAt)}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Done (${formatDateDisplay(task.completedAt)})
                  </span>
                `}
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
      const hasProof = Boolean(task.proofImage || (task.comments && task.comments.some(c => c.proofImage)));
      const latestProof = task.proofImage || (task.comments && [...task.comments].reverse().find(c => c.proofImage)?.proofImage);

      const nextCycleDate = task.nextCycleDueDate || calculateNextCycleDate(task.dueDate || TODAY_STR, task.cycle);
      const hasNextCycle = Boolean(nextCycleDate && task.cycle !== 'One-Time Inspection');
      let nextCycleCell = '—';
      if (hasNextCycle) {
        const nextStatus = calculateDateStatus(nextCycleDate);
        const nextMeta = getStatusMeta(nextStatus);
        nextCycleCell = `
          <div><small>${formatDateDisplay(nextCycleDate)}</small></div>
          <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
            <span class="status-chip ${nextMeta.className}" style="font-size: 10px; padding: 1px 6px;">${nextMeta.label}</span>
            ${isComplete && !isAdmin() ? `
              <button type="button" class="btn-start-early-pill" onclick="window.assetApp.startNextCycleEarly('${task.id}')" style="font-size: 9.5px; padding: 1px 5px;" title="Start upcoming cycle early">⚡ Start</button>
            ` : ''}
          </div>
        `;
      }

      return `
        <tr>
          <td>
            <span class="status-chip ${meta.className}">
              <span class="status-dot ${meta.dotClass}"></span>
              ${meta.label}
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
          <td>
            <div>${isComplete ? `<span style="color:#059669; font-weight:600;">Done: ${formatDateDisplay(task.completedAt)}</span>` : formatDateDisplay(task.dueDate)}</div>
            <small style="color: var(--text-muted);">${escapeHTML(task.cycle)}</small>
          </td>
          <td>
            <span class="condition-tag ${condClass}">${escapeHTML(task.condition)}</span>
          </td>
          <td>
            ${hasProof ? `
              <button class="btn btn-secondary btn-sm" onclick="window.assetApp.openLightbox('${latestProof}', '${escapeHTML(task.assetName)} — Proof')" title="View photo proof">
                📷 View
              </button>
            ` : `<span style="color: var(--text-subtle);">—</span>`}
          </td>
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

    if (filteredTasks.length === 0) {
      el.taskGrid.classList.add('hidden');
      el.taskTableWrapper.classList.add('hidden');
      el.emptyState.classList.remove('hidden');
    } else {
      el.emptyState.classList.add('hidden');
      if (state.viewMode === 'grid') {
        el.taskGrid.classList.remove('hidden');
        el.taskTableWrapper.classList.add('hidden');
        renderGrid(filteredTasks);
      } else {
        el.taskGrid.classList.add('hidden');
        el.taskTableWrapper.classList.remove('hidden');
        renderTable(filteredTasks);
      }
    }
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

    el.storeAccountsTbody.innerHTML = state.storeAccounts.map((s, idx) => `
      <tr>
        <td>
          <input type="text" class="input-text input-sm" id="store-name-input-${idx}" value="${escapeHTML(s.name)}" placeholder="Store Name" required style="min-width: 140px; font-weight: 600;">
        </td>
        <td>
          <input type="text" class="input-text input-sm" id="store-code-input-${idx}" value="${escapeHTML(s.code || '')}" placeholder="Code" style="min-width: 80px; text-transform: uppercase;">
        </td>
        <td>
          <input type="text" class="input-text input-sm" id="store-manager-input-${idx}" value="${escapeHTML(s.manager || '')}" placeholder="Manager / Contact" style="min-width: 150px;">
        </td>
        <td>
          <input type="text" class="input-text input-sm input-pin-inline" id="store-pin-input-${idx}" value="${escapeHTML(s.pin || '1234')}" placeholder="PIN" maxlength="12">
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-secondary btn-sm" onclick="window.assetApp.updateStoreAccount(${idx})">
              Save
            </button>
            <button class="btn btn-danger-ghost btn-sm" onclick="window.assetApp.deleteStoreAccount(${idx})" title="Remove Store Branch">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function updateStoreAccount(index) {
    if (!isAdmin()) return;
    const store = state.storeAccounts[index];
    if (!store) return;

    const nameInput = document.getElementById(`store-name-input-${index}`);
    const codeInput = document.getElementById(`store-code-input-${index}`);
    const managerInput = document.getElementById(`store-manager-input-${index}`);
    const pinInput = document.getElementById(`store-pin-input-${index}`);

    if (!nameInput || !pinInput) return;

    const newName = nameInput.value.trim();
    const newCode = codeInput ? codeInput.value.trim() : store.code;
    const newManager = managerInput ? managerInput.value.trim() : store.manager;
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

    // Check duplicate store name if name was changed
    const duplicate = state.storeAccounts.some((s, idx) => idx !== index && s.name.toLowerCase() === newName.toLowerCase());
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

    // If store name changed, update any existing tasks assigned to oldName
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
    }

    saveState();
    syncStoreToCloud(store);
    syncStoreOptions();
    renderStoreAccountsList();
    render();
    showToast(`Updated store details for "${newName}"`);
  }

  function updateStorePin(index) {
    updateStoreAccount(index);
  }

  function deleteStoreAccount(index) {
    if (!isAdmin()) return;
    const targetStore = state.storeAccounts[index];
    if (!targetStore) return;

    if (confirm(`Are you sure you want to delete "${targetStore.name}"?`)) {
      const removedId = targetStore.id;
      state.storeAccounts.splice(index, 1);
      saveState();
      removeStoreFromCloud(removedId);
      syncStoreOptions();
      renderStoreAccountsList();
      render();
      showToast(`Store ${targetStore.name} removed.`);
    }
  }

  function deleteTask(taskId) {
    if (!isAdmin()) return;
    const idx = state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const task = state.tasks[idx];

    if (confirm(`Permanently delete asset "${task.assetName}" from store "${task.store}"?\n\nThis action cannot be undone and will remove all maintenance history for this asset.`)) {
      state.tasks.splice(idx, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
      removeTaskFromCloud(taskId);
      render();
      showToast(`Asset "${task.assetName}" deleted.`);
    }
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

      if (confirm(`Reopen task "${task.assetName}"?`)) {
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
        render();
        if (state.activeDrawerTaskId === taskId) {
          openCommentsDrawer(taskId);
        }
      }
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
    el.completionRemarksInput.value = '';

    el.completionModal.classList.add('open');
    el.completionModal.setAttribute('aria-hidden', 'false');
    el.completionRemarksInput.focus();
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
    el.completionImageFile.value = '';
    el.imagePreviewImg.src = '';
    el.imagePreviewContainer.classList.add('hidden');
    el.uploadZonePrompt.classList.remove('hidden');
  }

  function useSamplePhoto(type) {
    if (SAMPLE_PHOTOS[type]) {
      setAttachedCompletionImage(SAMPLE_PHOTOS[type]);
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

    // 1. Mark task completed with chosen completion date
    task.status = 'Completed';
    task.completedAt = completionDate;
    task.completedTimestamp = nowIso;
    task.completedBy = getCurrentUserLabel();
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

    // 3. Log comment into history with permanent proof image URL
    task.comments = task.comments || [];
    task.comments.push({
      id: 'c-' + Date.now(),
      author: getCurrentUserLabel(),
      role: isAdmin() ? 'admin' : 'store',
      text: `✅ Task Completed on ${formatDateDisplay(completionDate)} & Verified\nRemarks: ${remarks}${nextStatusText}`,
      proofImage: proofUrl,
      completionDate: completionDate,
      timestamp: nowIso,
      isVerification: true
    });

    saveState();
    syncTaskToCloud(task);
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

  // Open Comments Drawer with Photo History Gallery
  function openCommentsDrawer(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    state.activeDrawerTaskId = taskId;
    const status = (task.status === 'Completed') ? 'Completed' : calculateTaskStatus(task);
    const meta = getStatusMeta(status);

    el.drawerAssetName.textContent = task.assetName;
    el.drawerAssetMeta.textContent = `${task.store} • ${task.serialNumber ? '#' + task.serialNumber : task.category}`;
    el.drawerStatusBadge.textContent = meta.label;
    el.drawerStatusBadge.className = `status-chip ${meta.className}`;
    el.drawerDueBadge.textContent = (task.status === 'Completed' && task.completedAt) 
      ? `Completed: ${formatDateDisplay(task.completedAt)}` 
      : `Due: ${formatDateDisplay(task.dueDate)}`;
    el.drawerConditionBadge.textContent = `Condition: ${task.condition}`;

    if (task.description) {
      el.drawerInstructionsText.textContent = task.description;
      el.drawerInstructionsBox.classList.remove('hidden');
    } else {
      el.drawerInstructionsBox.classList.add('hidden');
    }

    // Collect all historical verified photos from comments and task.proofImage
    const allPhotos = [];
    if (task.comments && task.comments.length) {
      task.comments.forEach(c => {
        if (c.proofImage) {
          allPhotos.push({
            src: c.proofImage,
            date: c.completionDate || c.timestamp,
            author: c.author
          });
        }
      });
    }
    if (task.proofImage && !allPhotos.some(p => p.src === task.proofImage)) {
      allPhotos.unshift({
        src: task.proofImage,
        date: task.completedAt || task.completedTimestamp || 'Latest',
        author: task.completedBy || 'Store'
      });
    }

    if (allPhotos.length > 0) {
      const latestPhoto = allPhotos[allPhotos.length - 1];
      el.drawerProofImg.src = latestPhoto.src;
      el.drawerProofImg.onclick = () => window.assetApp.openLightbox(latestPhoto.src, `${task.assetName} — Maintenance Photo (${formatDateDisplay(latestPhoto.date)})`);
      if (el.drawerProofTitle) {
        el.drawerProofTitle.textContent = `Verified Maintenance Photo (${formatDateDisplay(latestPhoto.date)})`;
      }
      el.drawerProofBox.classList.remove('hidden');

      // If multiple cycles have photos, show the historical thumbnail gallery
      if (allPhotos.length > 1 && el.drawerGalleryContainer && el.drawerGalleryStrip) {
        el.drawerGalleryStrip.innerHTML = allPhotos.map((p, idx) => `
          <div class="gallery-thumb-item ${idx === allPhotos.length - 1 ? 'active' : ''}" title="Cycle photo: ${formatDateDisplay(p.date)}" onclick="window.assetApp.selectDrawerPhoto('${task.id}', ${idx})">
            <img src="${p.src}" alt="Proof ${idx + 1}" class="gallery-thumb-img">
          </div>
        `).join('');
        el.drawerGalleryContainer.classList.remove('hidden');
      } else if (el.drawerGalleryContainer) {
        el.drawerGalleryContainer.classList.add('hidden');
      }
    } else {
      el.drawerProofBox.classList.add('hidden');
    }

    el.commentAuthorLabel.textContent = getCurrentUserLabel();
    renderCommentsList(task);

    el.commentsDrawer.classList.remove('hidden');
    setTimeout(() => {
      el.commentsDrawer.classList.add('open');
      el.commentsDrawer.setAttribute('aria-hidden', 'false');
    }, 10);
    el.commentInput.value = '';
  }

  function selectDrawerPhoto(taskId, photoIndex) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const allPhotos = [];
    if (task.comments && task.comments.length) {
      task.comments.forEach(c => {
        if (c.proofImage) {
          allPhotos.push({
            src: c.proofImage,
            date: c.completionDate || c.timestamp,
            author: c.author
          });
        }
      });
    }
    if (task.proofImage && !allPhotos.some(p => p.src === task.proofImage)) {
      allPhotos.unshift({
        src: task.proofImage,
        date: task.completedAt || task.completedTimestamp || 'Latest',
        author: task.completedBy || 'Store'
      });
    }

    if (allPhotos[photoIndex]) {
      const selected = allPhotos[photoIndex];
      el.drawerProofImg.src = selected.src;
      el.drawerProofImg.onclick = () => window.assetApp.openLightbox(selected.src, `${task.assetName} — Maintenance Photo (${formatDateDisplay(selected.date)})`);
      if (el.drawerProofTitle) {
        el.drawerProofTitle.textContent = `Verified Maintenance Photo (${formatDateDisplay(selected.date)})`;
      }
      
      if (el.drawerGalleryStrip) {
        const thumbItems = el.drawerGalleryStrip.querySelectorAll('.gallery-thumb-item');
        thumbItems.forEach((t, i) => {
          if (i === photoIndex) t.classList.add('active');
          else t.classList.remove('active');
        });
      }
    }
  }

  function closeCommentsDrawer() {
    el.commentsDrawer.classList.remove('open');
    el.commentsDrawer.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      el.commentsDrawer.classList.add('hidden');
      state.activeDrawerTaskId = null;
    }, 280);
  }

  function renderCommentsList(task) {
    const comments = task.comments || [];
    el.commentsCount.textContent = comments.length;

    if (comments.length === 0) {
      el.commentsList.innerHTML = `<p class="no-comments-msg">No remarks or updates posted yet. Add a note below.</p>`;
      return;
    }

    el.commentsList.innerHTML = comments.map(c => {
      const isRoleAdmin = c.role === 'admin';
      return `
        <div class="comment-card ${c.isVerification ? 'verified-entry' : ''}">
          <div class="comment-header">
            <span class="comment-author">
              ${escapeHTML(c.author)}
              <span class="comment-role-badge ${c.isVerification ? 'badge-verified' : (isRoleAdmin ? 'role-admin' : 'role-store')}">
                ${c.isVerification ? 'Proof Verified' : (isRoleAdmin ? 'Admin' : 'Store')}
              </span>
            </span>
            <span class="comment-time">${formatTimeDisplay(c.timestamp)}</span>
          </div>
          <p class="comment-message">${escapeHTML(c.text)}</p>
          ${c.proofImage ? `
            <div class="comment-proof-attachment" onclick="window.assetApp.openLightbox('${c.proofImage}', '${escapeHTML(task.assetName)} — Verified Photo Proof (${formatDateDisplay(c.completionDate || c.timestamp)})')">
              <img src="${c.proofImage}" alt="Verified Photo Proof" class="comment-proof-thumb">
              <div class="comment-proof-info">
                <span class="comment-proof-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  Verified Maintenance Photo
                </span>
                <span class="comment-proof-date">Completed: ${formatDateDisplay(c.completionDate || c.timestamp)} &bull; Click to enlarge</span>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    const drawerBody = document.querySelector('.drawer-body');
    if (drawerBody) {
      drawerBody.scrollTop = drawerBody.scrollHeight;
    }
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
    renderCommentsList(task);
    render();
    el.commentInput.value = '';
    showToast('Remark posted and synced to Cloud');
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
        const validPass = (pass === 'admin010211');

        if (!validUser || !validPass) {
          el.loginErrorMsg.textContent = 'Incorrect admin username or password.';
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
      render();
    });

    el.viewToggleTable.addEventListener('click', () => {
      state.viewMode = 'table';
      el.viewToggleTable.classList.add('active');
      el.viewToggleGrid.classList.remove('active');
      render();
    });

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
    el.btnDrawerClose.addEventListener('click', closeCommentsDrawer);
    el.commentsDrawer.addEventListener('click', (e) => {
      if (e.target === el.commentsDrawer) closeCommentsDrawer();
    });
    el.commentForm.addEventListener('submit', handleCommentSubmit);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
        if (el.storeManagementModal.classList.contains('open')) closeStoreManagementModal();
        if (el.lightboxModal.classList.contains('open')) closeLightbox();
        if (el.completionModal.classList.contains('open')) closeCompletionModal();
        if (el.taskModal.classList.contains('open')) closeTaskModal();
        if (el.commentsDrawer.classList.contains('open')) closeCommentsDrawer();
      }
    });
  }

  function init() {
    loadState();
    syncStoreOptions();
    syncCategoryOptions();
    syncConditionOptions();
    bindEvents();
    render();
    setupCloudRealtimeListeners();
  }

  // Global interface for onclick actions
  window.assetApp = {
    openEditModal: openTaskModal,
    openComments: openCommentsDrawer,
    selectDrawerPhoto: selectDrawerPhoto,
    triggerTaskCompletion: triggerTaskCompletion,
    startNextCycleEarly: startNextCycleEarly,
    useSamplePhoto: useSamplePhoto,
    openLightbox: openLightbox,
    updateStorePin: updateStorePin,
    deleteStoreAccount: deleteStoreAccount,
    deleteTask: deleteTask,
    addCustomCategory: addCustomCategory,
    addCustomCondition: addCustomCondition
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
