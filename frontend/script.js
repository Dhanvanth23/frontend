// ═══════════════════════════════════════════════════
//  CONFIGURATION & STATE
// ═══════════════════════════════════════════════════

const CONFIG = {
    API_BASE_URL: window.location.origin + '/api',
    NOTIFICATIONS_DURATION: 4000,
    LOADING_MIN_DURATION: 300,
};

const APP_STATE = {
    currentView: 'dashboard',   // 'dashboard' or 'track-detail'
    tracks: [],
    currentTrackId: null,
    currentTrack: null,
    expenses: [],
    income: [],
    editingItem: null,
};

let currentLanguage = localStorage.getItem('language') || 'en';
let translations = {};

const CATEGORIES = {
    food: { name: 'Food & Dining', icon: '🍔', color: '#ef4444' },
    transportation: { name: 'Transportation', icon: '🚗', color: '#f59e0b' },
    shopping: { name: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
    entertainment: { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
    utilities: { name: 'Utilities', icon: '⚡', color: '#06b6d4' },
    healthcare: { name: 'Healthcare', icon: '🏥', color: '#10b981' },
    education: { name: 'Education', icon: '📚', color: '#3b82f6' },
    travel: { name: 'Travel', icon: '✈️', color: '#6366f1' },
    lend: { name: 'Lend', icon: '💸', color: '#f59e0b' },
    other: { name: 'Other', icon: '📦', color: '#64748b' }
};

let DOM = {};

// ═══════════════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    checkAuthentication();
});

function checkAuthentication() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'flex';

    fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error('Not authenticated'); } return r.json(); })
        .then(userData => {
            if (loadingScreen) loadingScreen.style.display = 'none';

            const usernameEl = document.getElementById('usernameDisplay');
            const menuUsernameEl = document.getElementById('menuUsername');
            if (usernameEl && userData.username) {
                usernameEl.textContent = userData.username;
                if (menuUsernameEl) menuUsernameEl.textContent = userData.username;
                
                const avatar = document.getElementById('userAvatar');
                const menuAvatar = document.getElementById('menuUserAvatar');
                const initial = userData.username.charAt(0).toUpperCase();
                if (avatar) avatar.textContent = initial;
                if (menuAvatar) menuAvatar.textContent = initial;
            }

            initializeDOM();
            setupEventListeners();
            initializeApp();
        })
        .catch(err => console.error('Auth check failed:', err));
}

function initializeDOM() {
    DOM = {
        views: document.querySelectorAll('.view'),
        tracksGrid: document.getElementById('tracksGrid'),
        incomeList: document.getElementById('incomeList'),
        expenseList: document.getElementById('expenseList'),
        loadingOverlay: document.getElementById('loading'),
        modal: document.getElementById('editModal'),
        trackModal: document.getElementById('editTrackModal'),
        successNotification: document.getElementById('successMessage'),
        errorNotification: document.getElementById('errorMessage'),
        mobileMenu: document.getElementById('mobileMenu'),
        menuOverlay: document.getElementById('menuOverlay'),
    };
}

function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

    // Mobile menu
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    if (menuToggle) menuToggle.addEventListener('click', toggleMobileMenu);
    if (menuClose) menuClose.addEventListener('click', closeMobileMenu);
    if (DOM.menuOverlay) DOM.menuOverlay.addEventListener('click', closeMobileMenu);

    // Menu tabs
    document.querySelectorAll('.menu-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchView(tab.dataset.tab);
            closeMobileMenu();
        });
    });

    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.tab));
    });

    // Create track form
    const createForm = document.getElementById('createTrackForm');
    if (createForm) createForm.addEventListener('submit', handleCreateTrack);

    // Income / Expense forms
    const incomeForm = document.getElementById('incomeForm');
    const expenseForm = document.getElementById('expenseForm');
    if (incomeForm) incomeForm.addEventListener('submit', handleIncomeSubmit);
    if (expenseForm) expenseForm.addEventListener('submit', handleExpenseSubmit);

    // Toggle form buttons
    const toggleIncome = document.getElementById('toggleIncomeForm');
    const toggleExpense = document.getElementById('toggleExpenseForm');
    if (toggleIncome) toggleIncome.addEventListener('click', () => {
        const w = document.getElementById('incomeFormWrapper');
        w.style.display = w.style.display === 'none' ? 'block' : 'none';
    });
    if (toggleExpense) toggleExpense.addEventListener('click', () => {
        const w = document.getElementById('expenseFormWrapper');
        w.style.display = w.style.display === 'none' ? 'block' : 'none';
    });

    // Back to tracks
    const backBtn = document.getElementById('backToTracks');
    if (backBtn) backBtn.addEventListener('click', () => switchView('dashboard'));

    // Edit / Delete track buttons
    const editTrackBtn = document.getElementById('editTrackBtn');
    const deleteTrackBtn = document.getElementById('deleteTrackBtn');
    if (editTrackBtn) editTrackBtn.addEventListener('click', openEditTrackModal);
    if (deleteTrackBtn) deleteTrackBtn.addEventListener('click', handleDeleteTrack);

    // Edit track modal
    const editTrackForm = document.getElementById('editTrackForm');
    if (editTrackForm) editTrackForm.addEventListener('submit', handleEditTrackSubmit);
    const closeTrackModal = document.getElementById('closeTrackModal');
    const cancelTrackEdit = document.getElementById('cancelTrackEdit');
    if (closeTrackModal) closeTrackModal.addEventListener('click', () => { if (DOM.trackModal) DOM.trackModal.style.display = 'none'; });
    if (cancelTrackEdit) cancelTrackEdit.addEventListener('click', () => { if (DOM.trackModal) DOM.trackModal.style.display = 'none'; });

    // Edit item modal
    const editForm = document.getElementById('editForm');
    if (editForm) editForm.addEventListener('submit', handleEditSubmit);
    const closeModal = document.getElementById('closeModal');
    const cancelEdit = document.getElementById('cancelEdit');
    if (closeModal) closeModal.addEventListener('click', closeItemModal);
    if (cancelEdit) cancelEdit.addEventListener('click', closeItemModal);

    // Notification close buttons
    document.querySelectorAll('.notification-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const n = e.target.closest('.notification');
            if (n) n.style.display = 'none';
        });
    });
}

// ═══════════════════════════════════════════════════
//  TRANSLATIONS
// ═══════════════════════════════════════════════════

async function loadTranslations(lang) {
    try {
        const response = await fetch(`/api/translations/${lang}`);
        translations = await response.json();
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        updateUILanguage();
    } catch (error) {
        console.error('Failed to load translations:', error);
    }
}

function t(key) { return translations[key] || key; }

function updateUILanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.hasAttribute('placeholder')) el.placeholder = t(key);
        } else {
            el.textContent = t(key);
        }
    });
}

// ═══════════════════════════════════════════════════
//  APP INIT
// ═══════════════════════════════════════════════════

function initializeApp() {
    loadTranslations(currentLanguage).then(() => {
        loadTracks();
    });

    const switches = ['languageSwitch', 'languageSwitchHeader'];
    switches.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = currentLanguage;
            el.addEventListener('change', (e) => {
                loadTranslations(e.target.value);
                // Sync other switches
                switches.forEach(sid => {
                    const sel = document.getElementById(sid);
                    if (sel) sel.value = e.target.value;
                });
            });
        }
    });

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const incomeDate = document.getElementById('incomeDate');
    const expenseDate = document.getElementById('expenseDate');
    if (incomeDate) incomeDate.value = today;
    if (expenseDate) expenseDate.value = today;
}

// ═══════════════════════════════════════════════════
//  VIEW SWITCHING
// ═══════════════════════════════════════════════════

function switchView(viewId) {
    if (!viewId) return;
    APP_STATE.currentView = viewId;

    DOM.views.forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    // Scroll to top
    window.scrollTo(0, 0);

    if (viewId === 'dashboard') {
        APP_STATE.currentTrackId = null;
        APP_STATE.currentTrack = null;
        loadTracks();
    }
}

function toggleMobileMenu() {
    DOM.mobileMenu?.classList.toggle('active');
    DOM.menuOverlay?.classList.toggle('active');
}
function closeMobileMenu() {
    DOM.mobileMenu?.classList.remove('active');
    DOM.menuOverlay?.classList.remove('active');
}

// ═══════════════════════════════════════════════════
//  API HELPER
// ═══════════════════════════════════════════════════

async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options
    };
    showLoading();
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                throw new Error('Authentication required');
            }
            let errorData;
            try { errorData = await response.json(); } catch (e) { errorData = { error: `HTTP ${response.status}` }; }
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }
        return response.status === 204 ? null : await response.json();
    } catch (error) {
        if (error.message !== 'Authentication required') showNotification(error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

// ═══════════════════════════════════════════════════
//  TRACK FUNCTIONS
// ═══════════════════════════════════════════════════

async function loadTracks() {
    try {
        const tracks = await apiRequest('/tracks/');
        APP_STATE.tracks = tracks || [];
        renderTracksGrid();
        refreshTrackChecklists(); // Populate bulk-add options
    } catch (error) {
        console.error('Failed to load tracks:', error);
        APP_STATE.tracks = [];
        renderTracksGrid();
    }
}

function refreshTrackChecklists() {
    const expenseContainer = document.getElementById('expenseMultiTracks');
    const incomeContainer = document.getElementById('incomeMultiTracks');
    
    if (!expenseContainer || !incomeContainer) return;
    
    const tracks = APP_STATE.tracks;
    
    const generateHTML = (prefix) => {
        return tracks.map(track => `
            <label class="checklist-item">
                <input type="checkbox" name="multi_track" value="${track.id}" ${track.id === APP_STATE.currentTrackId ? 'disabled checked' : ''}>
                <span>${escapeHtml(track.name)}</span>
            </label>
        `).join('');
    };

    expenseContainer.innerHTML = generateHTML('expense');
    incomeContainer.innerHTML = generateHTML('income');
}

function renderTracksGrid() {
    const grid = DOM.tracksGrid;
    if (!grid) return;
    grid.innerHTML = '';

    if (APP_STATE.tracks.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h4>No tracks yet</h4>
                <p>Create your first budget track above to get started!</p>
            </div>
        `;
        return;
    }

    APP_STATE.tracks.forEach(track => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.dataset.trackId = track.id;

        const pct = track.used_percentage || 0;
        let statusClass = 'safe';
        if (pct >= 90) statusClass = 'over';
        else if (pct >= 75) statusClass = 'warn';

        card.innerHTML = `
            <div class="track-card-header">
                <div class="track-card-title-group">
                    <h3 class="track-card-name">${escapeHtml(track.name)}</h3>
                </div>
                <span class="track-card-pct ${statusClass}">${pct.toFixed(0)}%</span>
            </div>
            <div class="track-card-progress">
                <div class="track-card-bar ${statusClass}" style="width:${Math.min(pct, 100)}%"></div>
            </div>
            <div class="track-card-stats">
                <div class="track-stat">
                    <span class="stat-label">Available</span>
                    <span class="stat-value green">₹${formatNumber(track.total_available)}</span>
                </div>
                <div class="track-stat">
                    <span class="stat-label">Spent</span>
                    <span class="stat-value red">₹${formatNumber(track.total_expenses)}</span>
                </div>
                <div class="track-stat">
                    <span class="stat-label">Remaining</span>
                    <span class="stat-value ${track.remaining >= 0 ? 'green' : 'red'}">₹${formatNumber(track.remaining)}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            openTrack(track.id);
        });
        grid.appendChild(card);
    });
}

async function handleCreateTrack(e) {
    e.preventDefault();
    const nameEl = document.getElementById('newTrackName');
    const budgetEl = document.getElementById('newTrackBudget');
    const name = nameEl.value.trim();
    const budget_limit = parseFloat(budgetEl.value) || 0;

    if (!name) {
        showNotification('Track name is required', 'error');
        return;
    }

    try {
        await apiRequest('/tracks/', {
            method: 'POST',
            body: JSON.stringify({ name, budget_limit })
        });
        showNotification(`Track "${name}" created!`, 'success');
        nameEl.value = '';
        budgetEl.value = '';
        await loadTracks();
    } catch (error) {
        console.error('Failed to create track:', error);
    }
}

async function openTrack(trackId) {
    APP_STATE.currentTrackId = trackId;
    switchView('track-detail');

    try {
        const track = await apiRequest(`/tracks/${trackId}/`);
        APP_STATE.currentTrack = track;
        renderTrackDetail(track);

        // Load income and expenses for this track
        await Promise.all([
            loadTrackExpenses(trackId),
            loadTrackIncome(trackId)
        ]);
    } catch (error) {
        console.error('Failed to open track:', error);
        switchView('dashboard');
    }
}

function renderTrackDetail(track) {
    document.getElementById('trackDetailName').textContent = track.name;
    document.getElementById('trackAvailable').textContent = `₹${formatNumber(track.total_available)}`;
    document.getElementById('trackSpent').textContent = `₹${formatNumber(track.total_expenses)}`;
    document.getElementById('trackRemaining').textContent = `₹${formatNumber(track.remaining)}`;
    document.getElementById('trackRemaining').style.color = track.remaining >= 0 ? '#10b981' : '#ef4444';

    const pct = Math.min(Math.round(track.used_percentage || 0), 100);
    const progressEl = document.getElementById('trackProgress');
    const progressTextEl = document.getElementById('trackProgressText');
    const progressAmountEl = document.getElementById('trackProgressAmount');

    if (progressEl) {
        progressEl.style.width = `${pct}%`;
        if (pct >= 90) progressEl.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        else if (pct >= 75) progressEl.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        else progressEl.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    }
    if (progressTextEl) progressTextEl.textContent = `${pct}%`;
    if (progressAmountEl) progressAmountEl.textContent = `₹${formatNumber(track.total_expenses)} spent of ₹${formatNumber(track.total_available)}`;
}

// ═══════════════════════════════════════════════════
//  TRACK EDIT / DELETE
// ═══════════════════════════════════════════════════

function openEditTrackModal() {
    if (!APP_STATE.currentTrack) return;
    document.getElementById('editTrackName').value = APP_STATE.currentTrack.name;
    document.getElementById('editTrackBudget').value = APP_STATE.currentTrack.budget_limit || 0;
    DOM.trackModal.style.display = 'flex';
}

async function handleEditTrackSubmit(e) {
    e.preventDefault();
    if (!APP_STATE.currentTrackId) return;

    const name = document.getElementById('editTrackName').value.trim();
    const budget_limit = parseFloat(document.getElementById('editTrackBudget').value) || 0;

    try {
        await apiRequest(`/tracks/${APP_STATE.currentTrackId}/`, {
            method: 'PUT',
            body: JSON.stringify({ name, budget_limit })
        });
        showNotification('Track updated!', 'success');
        DOM.trackModal.style.display = 'none';
        await openTrack(APP_STATE.currentTrackId);
    } catch (error) {
        console.error('Failed to update track:', error);
    }
}

async function handleDeleteTrack() {
    if (!APP_STATE.currentTrackId) return;
    if (!confirm('Delete this track and ALL its income/expenses? This cannot be undone.')) return;

    try {
        await apiRequest(`/tracks/${APP_STATE.currentTrackId}/`, { method: 'DELETE' });
        showNotification('Track deleted', 'success');
        switchView('dashboard');
    } catch (error) {
        console.error('Failed to delete track:', error);
    }
}

// ═══════════════════════════════════════════════════
//  INCOME / EXPENSE LOADING
// ═══════════════════════════════════════════════════

async function loadTrackExpenses(trackId) {
    try {
        const expenses = await apiRequest(`/expenses/?track_id=${trackId}`);
        APP_STATE.expenses = expenses || [];
        renderItems(DOM.expenseList, APP_STATE.expenses, 'expense');
    } catch (error) {
        APP_STATE.expenses = [];
        renderItems(DOM.expenseList, [], 'expense');
    }
}

async function loadTrackIncome(trackId) {
    try {
        const income = await apiRequest(`/income/?track_id=${trackId}`);
        APP_STATE.income = income || [];
        renderItems(DOM.incomeList, APP_STATE.income, 'income');
    } catch (error) {
        APP_STATE.income = [];
        renderItems(DOM.incomeList, [], 'income');
    }
}

// ═══════════════════════════════════════════════════
//  FORM HANDLERS
// ═══════════════════════════════════════════════════

async function handleIncomeSubmit(e) {
    e.preventDefault();
    if (!APP_STATE.currentTrackId) return;

    const form = e.target;
    const formData = new FormData(form);
    const baseData = Object.fromEntries(formData.entries());
    
    // Get all selected tracks (including current)
    const extraTracks = formData.getAll('multi_track');
    const allTrackIds = [...new Set([APP_STATE.currentTrackId, ...extraTracks])];

    if (!baseData.amount || !baseData.source || !baseData.date) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const promises = allTrackIds.map(trackId => {
            const data = { ...baseData, track_id: trackId };
            delete data.multi_track;
            return apiRequest('/income/', { method: 'POST', body: JSON.stringify(data) });
        });

        await Promise.all(promises);
        
        const count = allTrackIds.length;
        showNotification(`Income added to ${count} track${count > 1 ? 's' : ''}!`, 'success');
        
        form.reset();
        document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('incomeFormWrapper').style.display = 'none';
        await refreshTrackDetail();
    } catch (error) {
        console.error('Failed to add income:', error);
    }
}

async function handleExpenseSubmit(e) {
    e.preventDefault();
    if (!APP_STATE.currentTrackId) return;

    const form = e.target;
    const formData = new FormData(form);
    const baseData = Object.fromEntries(formData.entries());
    
    // Get all selected tracks
    const extraTracks = formData.getAll('multi_track');
    const allTrackIds = [...new Set([APP_STATE.currentTrackId, ...extraTracks])];

    if (!baseData.amount || !baseData.category || !baseData.date || !baseData.description) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const promises = allTrackIds.map(trackId => {
            const data = { ...baseData, track_id: trackId };
            delete data.multi_track;
            return apiRequest('/expenses/', { method: 'POST', body: JSON.stringify(data) });
        });

        await Promise.all(promises);
        
        const count = allTrackIds.length;
        showNotification(`Expense added to ${count} track${count > 1 ? 's' : ''}!`, 'success');
        
        form.reset();
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('expenseFormWrapper').style.display = 'none';
        await refreshTrackDetail();
    } catch (error) {
        console.error('Failed to add expense:', error);
    }
}

async function refreshTrackDetail() {
    if (!APP_STATE.currentTrackId) return;
    const track = await apiRequest(`/tracks/${APP_STATE.currentTrackId}/`);
    APP_STATE.currentTrack = track;
    renderTrackDetail(track);
    await Promise.all([
        loadTrackExpenses(APP_STATE.currentTrackId),
        loadTrackIncome(APP_STATE.currentTrackId)
    ]);
}

// ═══════════════════════════════════════════════════
//  EDIT / DELETE ITEMS
// ═══════════════════════════════════════════════════

function openEditModal(item, type) {
    if (!DOM.modal) return;
    APP_STATE.editingItem = { id: item.id, type };
    DOM.modal.style.display = 'flex';

    const expenseFields = document.getElementById('editExpenseFields');
    const incomeFields = document.getElementById('editIncomeFields');
    if (expenseFields) expenseFields.style.display = 'none';
    if (incomeFields) incomeFields.style.display = 'none';

    const modalTitle = document.getElementById('modalTitle');

    if (type === 'expense') {
        if (modalTitle) modalTitle.textContent = 'Edit Expense';
        if (expenseFields) expenseFields.style.display = 'block';
        const a = document.getElementById('editExpenseAmount');
        const c = document.getElementById('editExpenseCategory');
        const d = document.getElementById('editExpenseDate');
        const desc = document.getElementById('editExpenseDescription');
        if (a) a.value = item.amount || '';
        if (c) c.value = item.category || '';
        if (d) d.value = item.date || '';
        if (desc) desc.value = item.description || '';
    } else {
        if (modalTitle) modalTitle.textContent = 'Edit Income';
        if (incomeFields) incomeFields.style.display = 'block';
        const a = document.getElementById('editIncomeAmount');
        const s = document.getElementById('editIncomeSource');
        const d = document.getElementById('editIncomeDate');
        const desc = document.getElementById('editIncomeDescription');
        if (a) a.value = item.amount || '';
        if (s) s.value = item.source || '';
        if (d) d.value = item.date || '';
        if (desc) desc.value = item.description || '';
    }
}

function closeItemModal() {
    if (DOM.modal) DOM.modal.style.display = 'none';
    APP_STATE.editingItem = null;
}

async function handleEditSubmit(e) {
    e.preventDefault();
    if (!APP_STATE.editingItem) return;

    const { id, type } = APP_STATE.editingItem;
    const endpoint = type === 'expense' ? `/expenses/${id}/` : `/income/${id}/`;
    let data;

    if (type === 'expense') {
        data = {
            amount: document.getElementById('editExpenseAmount')?.value,
            category: document.getElementById('editExpenseCategory')?.value,
            date: document.getElementById('editExpenseDate')?.value,
            description: document.getElementById('editExpenseDescription')?.value,
        };
    } else {
        data = {
            amount: document.getElementById('editIncomeAmount')?.value,
            source: document.getElementById('editIncomeSource')?.value,
            date: document.getElementById('editIncomeDate')?.value,
            description: document.getElementById('editIncomeDescription')?.value || '',
        };
    }

    if (!data.amount || !data.date) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        await apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(data) });
        showNotification('Item updated!', 'success');
        closeItemModal();
        await refreshTrackDetail();
    } catch (error) {
        console.error('Failed to update item:', error);
    }
}

async function handleDelete(id, type) {
    if (!confirm(`Delete this ${type}?`)) return;
    const endpoint = type === 'expense' ? `/expenses/${id}/` : `/income/${id}/`;
    try {
        await apiRequest(endpoint, { method: 'DELETE' });
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted!`, 'success');
        await refreshTrackDetail();
    } catch (error) {
        console.error(`Failed to delete ${type}:`, error);
    }
}

// ═══════════════════════════════════════════════════
//  RENDERING
// ═══════════════════════════════════════════════════

function renderItems(container, items, type) {
    if (!container) return;
    container.innerHTML = '';

    if (items.length === 0) {
        const icon = type === 'expense' ? '💸' : '💰';
        const msg = type === 'expense' ? 'No expenses yet' : 'No income yet';
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <h4>${msg}</h4>
                <p>Tap the button above to add one</p>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const el = createListItem(item, type);
        container.appendChild(el);
    });
}

function createListItem(item, type) {
    const isExpense = type === 'expense';
    const li = document.createElement('div');
    li.className = 'list-item';

    const category = isExpense ? CATEGORIES[item.category] : null;
    const icon = isExpense ? (category?.icon || '💸') : '💰';
    const title = isExpense ? item.description : item.source;
    const categoryName = isExpense ? (category?.name || 'Other') : 'Income';
    const amountPrefix = isExpense ? '-' : '+';

    li.innerHTML = `
        <div class="cell-top">
            <div class="item-icon">${icon}</div>
            <div class="item-amount ${!isExpense ? 'income' : ''}">${amountPrefix} ₹${formatNumber(item.amount)}</div>
        </div>
        <div class="item-title">${escapeHtml(title || 'No description')}</div>
        <div class="cell-bottom">
            <div class="item-meta">
                <span>${formatDate(item.date)}</span>
                <span class="dot"></span>
                <span class="item-category-tag">${categoryName}</span>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" title="Edit">✏️</button>
                <button class="action-btn delete-btn" title="Delete">🗑️</button>
            </div>
        </div>
    `;

    li.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openEditModal(item, type); });
    li.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); handleDelete(item.id, type); });

    return li;
}

// ═══════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════

async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore */ }
    window.location.href = '/login';
}

// ═══════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function showNotification(message, type = 'success') {
    const elId = type === 'success' ? 'successMessage' : 'errorMessage';
    const textId = type === 'success' ? 'successText' : 'errorText';
    
    const container = document.getElementById(elId);
    const textContainer = document.getElementById(textId);
    
    if (container && textContainer) {
        textContainer.textContent = message;
        container.style.display = 'block';
        
        setTimeout(() => {
            container.style.display = 'none';
        }, CONFIG.NOTIFICATIONS_DURATION);
    }
}

function showLoading() {
    if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
fetch("https://your-app.up.railway.app/api")
  .then(res => res.json())
  .then(data => console.log(data));