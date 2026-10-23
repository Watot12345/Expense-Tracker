// ============================================
// PENNYFLOW - Smart Expense Tracker & Financial Coach
// ============================================

// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://islpjlryvtakwjmcaecd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbHBqbHJ5dnRha3dqbWNhZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjExODEsImV4cCI6MjA5NzQzNzE4MX0.jfdzy6qxZDX6CYjx2_jFk7CvsmqSDrMqGBPTms4Lqr0';

let sb = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase initialization warning:', e);
}

// ============================================
// AUDIO SYNTHESIS ENGINE (Zero dependencies)
// ============================================
class PennyAudio {
  constructor() {
    this.enabled = localStorage.getItem('pennyAudioEnabled') !== 'false';
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('pennyAudioEnabled', this.enabled);
    return this.enabled;
  }
  coin() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }
  cash() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.16);
      osc.frequency.setValueAtTime(1046.50, this.ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (e) {}
  }
  fanfare() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + (i * 0.09));
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + (i * 0.09));
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (i * 0.09) + 0.3);
        osc.start(this.ctx.currentTime + (i * 0.09));
        osc.stop(this.ctx.currentTime + (i * 0.09) + 0.3);
      });
    } catch (e) {}
  }
}
const pennyAudio = new PennyAudio();

function triggerConfetti() {
  if (window.confetti) {
    try {
      window.confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }
}

// ============================================
// APP STATE & DEMO DATA
// ============================================
let isDemoMode = true;
let currentUser = null;
let selectedCategoryId = null;
let selectedCategoryName = 'Food';
let categories = [];
let expenses = [];
let incomeTotal = 5630.00;
let monthlyBudget = 2500.00;
let expenseToDelete = null;
let expenseToEdit = null;
let userCurrency = 'USD';
let currencySymbol = '$';
let categoryChart = null;
let weeklyChart = null;
let currentCoachPersonality = 'pragmatic';
let scannedOcrData = null;

// Initial Default Demo Categories
const DEMO_CATEGORIES = [
  { id: 'cat-food', name: 'Food', icon: 'fa-utensils', color: '#f97316' },
  { id: 'cat-coffee', name: 'Coffee', icon: 'fa-mug-hot', color: '#eab308' },
  { id: 'cat-transport', name: 'Transport', icon: 'fa-bus', color: '#06b6d4' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'fa-bag-shopping', color: '#ec4899' },
  { id: 'cat-bills', name: 'Bills', icon: 'fa-file-invoice', color: '#6366f1' },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'fa-gamepad', color: '#a855f7' },
  { id: 'cat-health', name: 'Health', icon: 'fa-heart', color: '#10b981' },
  { id: 'cat-books', name: 'Books', icon: 'fa-book', color: '#3b82f6' }
];

// Initial Default Demo Expenses
const DEMO_EXPENSES = [
  { id: 'exp-1', category_id: 'cat-bills', amount: 1200.00, description: 'Monthly Apartment Rent', expense_date: '2026-10-01', categories: { name: 'Bills', icon: 'fa-file-invoice' } },
  { id: 'exp-2', category_id: 'cat-food', amount: 165.40, description: 'Trader Joe\'s Groceries', expense_date: '2026-10-04', categories: { name: 'Food', icon: 'fa-utensils' } },
  { id: 'exp-3', category_id: 'cat-bills', amount: 112.00, description: 'Electric & Wi-Fi Fiber', expense_date: '2026-10-06', categories: { name: 'Bills', icon: 'fa-file-invoice' } },
  { id: 'exp-4', category_id: 'cat-food', amount: 78.50, description: 'Dinner with friends at Osteria', expense_date: '2026-10-10', categories: { name: 'Food', icon: 'fa-utensils' } },
  { id: 'exp-5', category_id: 'cat-transport', amount: 52.00, description: 'Gas refill & toll fee', expense_date: '2026-10-12', categories: { name: 'Transport', icon: 'fa-bus' } },
  { id: 'exp-6', category_id: 'cat-health', amount: 45.00, description: 'Gym & Fitness Membership', expense_date: '2026-10-14', categories: { name: 'Health', icon: 'fa-heart' } },
  { id: 'exp-7', category_id: 'cat-transport', amount: 24.80, description: 'Uber ride from Downtown', expense_date: '2026-10-16', categories: { name: 'Transport', icon: 'fa-bus' } },
  { id: 'exp-8', category_id: 'cat-entertainment', amount: 15.99, description: 'Netflix Premium 4K', expense_date: '2026-10-18', categories: { name: 'Entertainment', icon: 'fa-gamepad' } },
  { id: 'exp-9', category_id: 'cat-coffee', amount: 14.20, description: 'Cold Brew & Croissant', expense_date: '2026-10-21', categories: { name: 'Coffee', icon: 'fa-mug-hot' } },
  { id: 'exp-10', category_id: 'cat-coffee', amount: 45.00, description: 'Artisanal Single-Origin Beans', expense_date: '2026-10-23', categories: { name: 'Coffee', icon: 'fa-mug-hot' } }
];

// Initial Default Demo Goals
const DEMO_GOALS = [
  { id: 'goal-1', name: 'Summer Japan Trip', target_amount: 5000, current_amount: 3200, icon: '✈️' },
  { id: 'goal-2', name: 'New iPhone Pro', target_amount: 1200, current_amount: 950, icon: '📱' },
  { id: 'goal-3', name: 'Emergency Buffer', target_amount: 10000, current_amount: 7500, icon: '🛡️' }
];

// ============================================
// HELPERS
// ============================================
function getFirstName(fullName) {
  if (!fullName) return 'Explorer';
  return fullName.split(' ')[0];
}

function setCurrencySymbol() {
  const symbols = { 'USD': '$', 'PHP': '₱', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥', 'CAD': 'C$', 'AUD': 'A$' };
  currencySymbol = symbols[userCurrency] || '$';
}

function formatMoney(amount) {
  return currencySymbol + parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
}

function destroyCharts() {
  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }
  if (weeklyChart) {
    weeklyChart.destroy();
    weeklyChart = null;
  }
}

// ============================================
// LOCAL STORAGE PERSISTENCE (Demo Mode)
// ============================================
function saveDemoState() {
  if (isDemoMode) {
    localStorage.setItem('pennyflow_demo_expenses', JSON.stringify(expenses));
    localStorage.setItem('pennyflow_demo_income', JSON.stringify(incomeTotal));
    localStorage.setItem('pennyflow_demo_budget', JSON.stringify(monthlyBudget));
    localStorage.setItem('pennyflow_demo_currency', userCurrency);
  }
}

function loadDemoState() {
  try {
    const savedExp = localStorage.getItem('pennyflow_demo_expenses');
    expenses = savedExp ? JSON.parse(savedExp) : [...DEMO_EXPENSES];

    const savedInc = localStorage.getItem('pennyflow_demo_income');
    incomeTotal = savedInc ? parseFloat(JSON.parse(savedInc)) : 5630.00;

    const savedBudget = localStorage.getItem('pennyflow_demo_budget');
    monthlyBudget = savedBudget ? parseFloat(JSON.parse(savedBudget)) : 2500.00;

    const savedCurrency = localStorage.getItem('pennyflow_demo_currency');
    if (savedCurrency) userCurrency = savedCurrency;
  } catch (e) {
    expenses = [...DEMO_EXPENSES];
    incomeTotal = 5630.00;
    monthlyBudget = 2500.00;
  }
}

// ============================================
// DATA FETCHING & SYNC
// ============================================
async function fetchCategories() {
  if (!isDemoMode && sb && currentUser) {
    try {
      const { data, error } = await sb.from('categories').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        categories = data;
        renderCategoryTags();
        renderModalCategories();
        return;
      }
    } catch (e) {}
  }
  categories = [...DEMO_CATEGORIES];
  renderCategoryTags();
  renderModalCategories();
  if (categories.length > 0 && !selectedCategoryId) {
    selectedCategoryId = categories[0].id;
    selectedCategoryName = categories[0].name;
    highlightSelectedTag();
  }
}

async function fetchExpenses() {
  if (!isDemoMode && sb && currentUser) {
    try {
      const { data, error } = await sb.from('expenses').select('*, categories(name, icon, color)').order('created_at', { ascending: false }).limit(50);
      if (!error && data) {
        expenses = data;
        updateUI();
        return;
      }
    } catch (e) {}
  }
  loadDemoState();
  updateUI();
}

async function fetchIncome() {
  if (!isDemoMode && sb && currentUser) {
    try {
      const { data, error } = await sb.from('income').select('*');
      if (!error && data && data.length > 0) {
        incomeTotal = data.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
        updateUI();
        return;
      }
    } catch (e) {}
  }
  updateUI();
}

// ============================================
// UI RENDERING
// ============================================
function updateUI() {
  setCurrencySymbol();
  const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const netBalance = incomeTotal - totalExpense;

  // Header and Balance
  const balanceEl = document.getElementById('balanceDisplay');
  const incomeEl = document.getElementById('incomeDisplay');
  const expenseEl = document.getElementById('expenseDisplay');

  if (balanceEl) balanceEl.textContent = formatMoney(netBalance);
  if (incomeEl) incomeEl.textContent = formatMoney(incomeTotal);
  if (expenseEl) expenseEl.textContent = formatMoney(totalExpense);

  // Safe to Spend Daily Calculation
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate());
  const remainingBudget = Math.max(0, monthlyBudget - totalExpense);
  const dailySafeSpend = remainingBudget / daysLeft;

  const safeDailyEl = document.getElementById('safeDailyAmount');
  if (safeDailyEl) {
    safeDailyEl.textContent = `${formatMoney(dailySafeSpend)}/day`;
  }

  // Render Transaction List
  renderExpenseList();
  renderGoals();
}

function renderCategoryTags() {
  const container = document.getElementById('categoryTags');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <button class="category-tag flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all border border-transparent"
            data-id="${cat.id}" data-name="${escapeHTML(cat.name)}">
      <i class="fas ${cat.icon || 'fa-tag'} text-xs"></i>
      <span>${escapeHTML(cat.name)}</span>
    </button>
  `).join('');

  container.querySelectorAll('.category-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      selectedCategoryId = tag.getAttribute('data-id');
      selectedCategoryName = tag.getAttribute('data-name');
      highlightSelectedTag();
      pennyAudio.coin();
    });
  });
}

function highlightSelectedTag() {
  document.querySelectorAll('.category-tag').forEach(tag => {
    const isSelected = tag.getAttribute('data-id') === selectedCategoryId;
    if (isSelected) {
      tag.classList.add('bg-slate-900', 'text-white', 'shadow-sm');
      tag.classList.remove('bg-slate-100', 'text-slate-700');
    } else {
      tag.classList.remove('bg-slate-900', 'text-white', 'shadow-sm');
      tag.classList.add('bg-slate-100', 'text-slate-700');
    }
  });
  const clearSelection = document.getElementById('clearSelection');
  if (clearSelection) {
    clearSelection.textContent = selectedCategoryName ? `Filter: ${selectedCategoryName}` : '';
  }
}

function renderModalCategories() {
  const modalCategory = document.getElementById('modalCategory');
  const editCategory = document.getElementById('editCategory');
  const optionsHtml = categories.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  if (modalCategory) modalCategory.innerHTML = optionsHtml;
  if (editCategory) editCategory.innerHTML = optionsHtml;
}

function renderExpenseList() {
  const container = document.getElementById('expenseListContainer');
  if (!container) return;

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-400 text-xs">
        <i class="fas fa-receipt text-3xl mb-2 block opacity-40"></i>
        No expenses yet. Tap "+ Add Expense" or scan a receipt!
      </div>`;
    return;
  }

  const iconMap = {
    'Food': 'fa-utensils', 'Transport': 'fa-bus', 'Books': 'fa-book',
    'Coffee': 'fa-mug-hot', 'Entertainment': 'fa-gamepad', 'Shopping': 'fa-shopping-bag',
    'Bills': 'fa-file-invoice', 'Health': 'fa-heart'
  };

  container.innerHTML = expenses.map(exp => {
    const name = exp.categories?.name || 'Other';
    const icon = iconMap[name] || 'fa-receipt';
    const date = new Date(exp.expense_date || exp.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div class="flex items-center justify-between py-2.5 px-3 border-b border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-sm shadow-xs">
            <i class="fas ${icon}"></i>
          </div>
          <div>
            <h4 class="font-bold text-xs text-slate-800">${escapeHTML(exp.description || name)}</h4>
            <p class="text-[10px] text-slate-400">${date} · <span class="text-indigo-600 font-semibold">${escapeHTML(name)}</span></p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="font-extrabold text-xs text-rose-600">-${formatMoney(exp.amount)}</span>
          <button class="delete-btn opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 p-1 transition-all" data-id="${exp.id}" title="Delete">
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      expenseToDelete = btn.getAttribute('data-id');
      openDeleteModal();
    });
  });

  buildFilterChips();
}

function buildFilterChips() {
  const container = document.getElementById('filterChips');
  if (!container) return;

  const usedCategoryNames = ['all', ...new Set(expenses.map(e => e.categories?.name || 'Other'))];
  container.innerHTML = usedCategoryNames.map(name => `
    <button class="filter-chip ${name === 'all' ? 'active' : ''} whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all" data-filter="${name}">
      ${name === 'all' ? 'All Transactions' : name}
    </button>
  `).join('');

  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active', 'bg-slate-900', 'text-white'));
      chip.classList.add('active', 'bg-slate-900', 'text-white');
      const filter = chip.getAttribute('data-filter');
      filterExpenses(filter);
    });
  });
}

function filterExpenses(categoryName) {
  if (categoryName === 'all') {
    renderExpenseList();
    return;
  }
  const filtered = expenses.filter(e => (e.categories?.name || 'Other') === categoryName);
  const original = expenses;
  expenses = filtered;
  renderExpenseList();
  expenses = original;
}

// ============================================
// STATS & CHARTS
// ============================================
function loadStats() {
  destroyCharts();

  const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const remaining = Math.max(0, monthlyBudget - totalExpense);
  const burnPercent = monthlyBudget > 0 ? Math.min(100, (totalExpense / monthlyBudget) * 100) : 0;

  const monthTotalEl = document.getElementById('thisMonthTotal');
  const budgetLeftEl = document.getElementById('budgetLeftAmount');
  const statsBudgetBar = document.getElementById('statsBudgetBar');
  const statsBudgetText = document.getElementById('statsBudgetText');
  const statsBudgetLabel = document.getElementById('statsBudgetLabel');

  if (monthTotalEl) monthTotalEl.textContent = formatMoney(totalExpense);
  if (budgetLeftEl) budgetLeftEl.textContent = formatMoney(remaining);
  if (statsBudgetText) statsBudgetText.textContent = formatMoney(totalExpense);
  if (statsBudgetLabel) statsBudgetLabel.textContent = `${burnPercent.toFixed(0)}% BURNED`;
  if (statsBudgetBar) statsBudgetBar.style.width = `${burnPercent}%`;

  // Donut Chart - Category breakdown
  const categoryTotals = {};
  expenses.forEach(e => {
    const cat = e.categories?.name || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(e.amount || 0);
  });

  const catLabels = Object.keys(categoryTotals);
  const catData = Object.values(categoryTotals);
  const palette = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'];

  const catCanvas = document.getElementById('categoryChart');
  if (catCanvas && window.Chart && catLabels.length > 0) {
    categoryChart = new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: palette.slice(0, catLabels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
        },
        cutout: '68%'
      }
    });
  }

  // Weekly Trend Chart
  const weeklyCanvas = document.getElementById('weeklyChart');
  if (weeklyCanvas && window.Chart) {
    weeklyChart = new Chart(weeklyCanvas, {
      type: 'bar',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Spending',
          data: [totalExpense * 0.28, totalExpense * 0.22, totalExpense * 0.35, totalExpense * 0.15],
          backgroundColor: '#4f46e5',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, grid: { display: false } },
          x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  // Render Insights
  renderInsights();
}

function renderInsights() {
  const listEl = document.getElementById('insightsList');
  if (!listEl) return;

  const insights = pennyAI.generateInsights(expenses, monthlyBudget);
  if (insights.length === 0) {
    listEl.innerHTML = '<li class="text-xs text-slate-400">Add a few expenses to generate automated financial insights.</li>';
    return;
  }

  listEl.innerHTML = insights.map(i => `
    <li class="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-indigo-50 shadow-xs">
      <span class="text-base">${i.icon}</span>
      <div>
        <strong class="font-bold text-slate-800 text-xs block">${escapeHTML(i.title)}</strong>
        <p class="text-[11px] text-slate-600 mt-0.5">${escapeHTML(i.message)}</p>
      </div>
    </li>
  `).join('');
}

// ============================================
// SAVINGS GOALS
// ============================================
let goals = [...DEMO_GOALS];

function renderGoals() {
  const container = document.getElementById('goalsList');
  if (!container) return;

  if (goals.length === 0) {
    container.innerHTML = '<p class="text-center text-xs text-slate-400 py-6">No goals set yet.</p>';
    return;
  }

  container.innerHTML = goals.map(g => {
    const percent = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
    return `
      <div class="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">${g.icon || '🎯'}</span>
            <div>
              <h4 class="font-bold text-xs text-slate-800">${escapeHTML(g.name)}</h4>
              <p class="text-[10px] text-slate-400">${formatMoney(g.current_amount)} of ${formatMoney(g.target_amount)}</p>
            </div>
          </div>
          <span class="font-extrabold text-xs text-indigo-600">${percent}%</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div class="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-700" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// RECEIPT SCANNER & OCR SIMULATION
// ============================================
function handleSampleReceipt(presetKey) {
  const data = pennyAI.simulateReceiptScan(presetKey);
  scannedOcrData = data;

  const statusText = document.getElementById('scannerStatusText');
  const resultCard = document.getElementById('ocrResultCard');
  const acceptBtn = document.getElementById('acceptOcrExpenseBtn');

  if (statusText) statusText.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Running Multimodal Neural OCR...';

  setTimeout(() => {
    if (statusText) statusText.textContent = '✨ Extraction Complete!';
    if (resultCard) {
      resultCard.classList.remove('hidden');
      document.getElementById('ocrVendor').textContent = data.vendor;
      document.getElementById('ocrTotal').textContent = formatMoney(data.total);
      document.getElementById('ocrCategory').textContent = data.category;
      document.getElementById('ocrDate').textContent = data.date;

      const subBadge = document.getElementById('ocrSubscriptionBadge');
      if (subBadge) {
        if (data.is_subscription) subBadge.classList.remove('hidden');
        else subBadge.classList.add('hidden');
      }
    }

    if (acceptBtn) {
      acceptBtn.disabled = false;
      acceptBtn.classList.remove('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
      acceptBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'text-white', 'shadow-md');
      acceptBtn.textContent = `Confirm & Add ${formatMoney(data.total)} to Expenses`;
    }

    pennyAudio.cash();
  }, 600);
}

function handleAcceptOcrExpense() {
  if (!scannedOcrData) return;

  const matchingCat = categories.find(c => c.name.toLowerCase() === scannedOcrData.category.toLowerCase()) || categories[0];
  const newExp = {
    id: 'exp-' + Date.now(),
    category_id: matchingCat ? matchingCat.id : 'cat-food',
    amount: scannedOcrData.total,
    description: scannedOcrData.vendor,
    expense_date: scannedOcrData.date,
    categories: { name: matchingCat ? matchingCat.name : 'Food', icon: matchingCat?.icon || 'fa-receipt' }
  };

  expenses.unshift(newExp);
  saveDemoState();
  updateUI();

  pennyAudio.fanfare();
  triggerConfetti();

  const modal = document.getElementById('receiptScannerModal');
  if (modal) modal.classList.add('invisible', 'opacity-0');

  if (window.alert && window.alert.success) {
    alert.success(`Added ${formatMoney(scannedOcrData.total)} from ${scannedOcrData.vendor}!`);
  }
}

// ============================================
// AI COACH MULTI-PERSONALITY CONTROLLER
// ============================================
function updateCoachModal(personality) {
  currentCoachPersonality = personality;
  document.querySelectorAll('.coach-tab').forEach(tab => {
    if (tab.getAttribute('data-personality') === personality) {
      tab.classList.add('active', 'bg-white', 'text-indigo-700', 'shadow-sm');
      tab.classList.remove('text-slate-600');
    } else {
      tab.classList.remove('active', 'bg-white', 'text-indigo-700', 'shadow-sm');
      tab.classList.add('text-slate-600');
    }
  });

  const advice = pennyAI.generateAdvice(personality, expenses, monthlyBudget, incomeTotal);
  const titleEl = document.getElementById('coachTitle');
  const badgeEl = document.getElementById('coachBadge');
  const quotesList = document.getElementById('coachQuotesList');

  if (titleEl) titleEl.textContent = advice.title;
  if (badgeEl) badgeEl.textContent = advice.badge;
  if (quotesList) {
    quotesList.innerHTML = advice.quotes.map(q => `
      <div class="p-2.5 rounded-xl bg-white/80 border border-indigo-100 text-xs text-slate-800 font-medium">
        ${escapeHTML(q)}
      </div>
    `).join('');
  }

  if (personality === 'hype') {
    pennyAudio.fanfare();
    triggerConfetti();
  } else {
    pennyAudio.coin();
  }
}

// ============================================
// REAL-WORLD EXPORT & BACKUP TOOLS
// ============================================
function exportToCSV() {
  if (!expenses || expenses.length === 0) {
    if (window.alert) alert.warning('No expenses available to export!');
    return;
  }
  let csv = 'Date,Category,Amount,Description\n';
  expenses.forEach(e => {
    const d = e.expense_date || (e.created_at ? e.created_at.split('T')[0] : '2026-10-24');
    const cat = (e.categories?.name || 'Other').replace(/"/g, '""');
    const amt = parseFloat(e.amount || 0).toFixed(2);
    const desc = (e.description || '').replace(/"/g, '""');
    csv += `"${d}","${cat}",${amt},"${desc}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pennyflow_expenses_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  pennyAudio.cash();
  if (window.alert) alert.success('Exported transactions to CSV spreadsheet!');
}

function exportToJSON() {
  const payload = {
    app: 'PennyFlow',
    version: '1.0.0',
    export_date: new Date().toISOString(),
    currency: userCurrency,
    monthly_budget: monthlyBudget,
    income_total: incomeTotal,
    expenses: expenses,
    goals: goals
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pennyflow_financial_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  pennyAudio.cash();
  if (window.alert) alert.success('Financial backup saved as JSON!');
}

function resetDemoData() {
  localStorage.removeItem('pennyflow_demo_expenses');
  localStorage.removeItem('pennyflow_demo_income');
  localStorage.removeItem('pennyflow_demo_budget');
  if (window.alert) alert.info('Demo finances reset to defaults. Reloading...');
  setTimeout(() => location.reload(), 500);
}

// ============================================
// MODAL CONTROLS
// ============================================
function openModal() {
  document.getElementById('modalCategory').value = selectedCategoryId || (categories[0]?.id || '');
  document.getElementById('modalAmount').value = '';
  document.getElementById('modalDescription').value = '';
  const errorEl = document.getElementById('amountError');
  if (errorEl) errorEl.classList.add('hidden');
  const modal = document.getElementById('expenseModal');
  modal.classList.remove('invisible', 'opacity-0');
  setTimeout(() => document.getElementById('modalAmount')?.focus(), 100);
}

function closeModal() {
  const modal = document.getElementById('expenseModal');
  modal.classList.add('invisible', 'opacity-0');
}

function openDeleteModal() {
  document.getElementById('deleteModal').classList.remove('invisible', 'opacity-0');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('invisible', 'opacity-0');
  expenseToDelete = null;
}

// ============================================
// ADD / DELETE EXPENSE
// ============================================
function handleAddExpense() {
  const amountStr = document.getElementById('modalAmount').value.trim();
  const description = document.getElementById('modalDescription').value.trim();
  const errorEl = document.getElementById('amountError');
  if (errorEl) errorEl.classList.add('hidden');

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    if (errorEl) {
      errorEl.textContent = 'Please enter a valid positive amount';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  const categoryId = document.getElementById('modalCategory').value || selectedCategoryId;
  const category = categories.find(c => c.id === categoryId) || categories[0];

  const newExpense = {
    id: 'exp-' + Date.now(),
    category_id: category.id,
    amount: amount,
    description: description || `${category.name} expense`,
    expense_date: new Date().toISOString().split('T')[0],
    categories: { name: category.name, icon: category.icon }
  };

  expenses.unshift(newExpense);
  saveDemoState();
  updateUI();
  closeModal();

  pennyAudio.coin();
  triggerConfetti();

  if (window.alert) alert.success(`Added ${formatMoney(amount)} for ${newExpense.description}!`);
}

function handleConfirmDelete() {
  if (!expenseToDelete) return;
  expenses = expenses.filter(e => e.id !== expenseToDelete);
  saveDemoState();
  updateUI();
  closeDeleteModal();
  if (window.alert) alert.info('Expense deleted.');
}

// ============================================
// NAVIGATION TABS
// ============================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = {
    home: document.getElementById('expenseListContainer'),
    stats: document.getElementById('statsPanel'),
    goals: document.getElementById('goalsPanel'),
    subs: document.getElementById('subscriptionsPanel'),
    profile: document.getElementById('profilePanel')
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');

      navItems.forEach(n => {
        n.classList.remove('text-indigo-600', 'font-bold');
        n.classList.add('text-slate-400');
      });
      item.classList.add('text-indigo-600', 'font-bold');
      item.classList.remove('text-slate-400');

      // Hide all panels
      Object.values(panels).forEach(p => {
        if (p) p.classList.add('hidden');
      });

      // Show selected panel
      if (panels[tab]) {
        panels[tab].classList.remove('hidden');
      }

      // If stats panel opened, redraw charts
      if (tab === 'stats') {
        loadStats();
      }

      pennyAudio.coin();
    });
  });
}

// ============================================
// EVENT LISTENERS INITIALIZATION
// ============================================
function initEventListeners() {
  // Add Expense Modal Triggers
  document.getElementById('openModalBtn')?.addEventListener('click', openModal);
  document.getElementById('openModalTrigger')?.addEventListener('click', openModal);
  document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('saveExpenseBtn')?.addEventListener('click', handleAddExpense);

  // Delete Modal Triggers
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleConfirmDelete);

  // Download APK Modal Triggers
  const downloadModal = document.getElementById('downloadApkModal');
  document.getElementById('openDownloadModalBtn')?.addEventListener('click', () => {
    downloadModal.classList.remove('invisible', 'opacity-0');
    pennyAudio.cash();
  });
  document.getElementById('closeDownloadModalBtn')?.addEventListener('click', () => {
    downloadModal.classList.add('invisible', 'opacity-0');
  });

  // SHA256 Copy Button
  document.getElementById('copyShaBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText('7d8f4e2b9c1a0f8e5d3c8b7a6f4e2d0c1b3a5f7e9d8c6b4a2f0e1d3c5b7a9f1b');
    if (window.alert) alert.success('SHA256 checksum copied to clipboard!');
  });

  // Receipt Scanner Modal Triggers
  const scannerModal = document.getElementById('receiptScannerModal');
  const openScanner = () => {
    scannerModal.classList.remove('invisible', 'opacity-0');
    pennyAudio.coin();
  };
  document.getElementById('topScanReceiptBtn')?.addEventListener('click', openScanner);
  document.getElementById('headerScanBtn')?.addEventListener('click', openScanner);
  document.getElementById('closeScannerModalBtn')?.addEventListener('click', () => {
    scannerModal.classList.add('invisible', 'opacity-0');
  });

  document.querySelectorAll('.sample-receipt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      handleSampleReceipt(preset);
    });
  });

  document.getElementById('acceptOcrExpenseBtn')?.addEventListener('click', handleAcceptOcrExpense);

  // AI Coach Modal Triggers
  const coachModal = document.getElementById('aiCoachModal');
  const openCoach = () => {
    coachModal.classList.remove('invisible', 'opacity-0');
    updateCoachModal(currentCoachPersonality);
  };
  document.getElementById('topAiCoachBtn')?.addEventListener('click', openCoach);
  document.getElementById('openCoachFromStatsBtn')?.addEventListener('click', openCoach);
  document.getElementById('closeAiCoachModalBtn')?.addEventListener('click', () => {
    coachModal.classList.add('invisible', 'opacity-0');
  });
  document.getElementById('dismissCoachBtn')?.addEventListener('click', () => {
    coachModal.classList.add('invisible', 'opacity-0');
  });

  document.querySelectorAll('.coach-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const p = tab.getAttribute('data-personality');
      updateCoachModal(p);
    });
  });

  // Phone Mockup Frame Switcher
  const container = document.getElementById('appContainer');
  const notch = document.getElementById('phoneNotch');
  const frameBtn = document.getElementById('toggleDeviceFrameBtn');
  const frameLabel = document.getElementById('frameToggleLabel');

  frameBtn?.addEventListener('click', () => {
    const isPhone = container.classList.toggle('phone-mockup-frame');
    if (isPhone) {
      notch?.classList.remove('hidden');
      if (frameLabel) frameLabel.textContent = 'Wide View';
    } else {
      notch?.classList.add('hidden');
      if (frameLabel) frameLabel.textContent = 'Phone View';
    }
    pennyAudio.coin();
  });

  // Sound FX Toggle
  const audioBtn = document.getElementById('toggleAudioBtn');
  const audioIcon = document.getElementById('audioIcon');
  audioBtn?.addEventListener('click', () => {
    const enabled = pennyAudio.toggle();
    if (audioIcon) {
      audioIcon.className = enabled ? 'fas fa-volume-up text-indigo-400' : 'fas fa-volume-mute text-slate-500';
    }
    if (enabled) pennyAudio.coin();
  });

  // Search Input
  const searchInput = document.getElementById('searchExpenses');
  const clearSearch = document.getElementById('clearSearch');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (clearSearch) {
      if (q) clearSearch.classList.remove('hidden');
      else clearSearch.classList.add('hidden');
    }
    if (!q) {
      renderExpenseList();
      return;
    }
    const filtered = expenses.filter(exp => {
      const desc = (exp.description || '').toLowerCase();
      const cat = (exp.categories?.name || '').toLowerCase();
      return desc.includes(q) || cat.includes(q);
    });
    const orig = expenses;
    expenses = filtered;
    renderExpenseList();
    expenses = orig;
  });

  clearSearch?.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch.classList.add('hidden');
    renderExpenseList();
  });

  // Real-world Export & Reset Triggers
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportToCSV);
  document.getElementById('exportJsonBtn')?.addEventListener('click', exportToJSON);
  document.getElementById('resetDemoBtn')?.addEventListener('click', resetDemoData);

  // Subscriptions Cancellation Email Helper
  document.querySelectorAll('.cancel-sub-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      const emailTemplate = `Subject: Formal Cancellation of Subscription - ${name}\n\nDear Customer Support Team,\n\nPlease accept this email as formal notice that I am requesting the immediate cancellation of my recurring subscription for ${name}. Please stop all future billing charges to my account.\n\nThank you,\nAccount Holder`;
      navigator.clipboard.writeText(emailTemplate);
      pennyAudio.coin();
      if (window.alert) alert.success(`Copied 1-click cancellation email for ${name}!`);
    });
  });

  // Add Goal Trigger
  document.getElementById('addGoalBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('goalModal');
    if (modal) modal.classList.remove('invisible', 'opacity-0');
  });
  document.getElementById('cancelGoalBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('goalModal');
    if (modal) modal.classList.add('invisible', 'opacity-0');
  });
  document.getElementById('saveGoalBtn')?.addEventListener('click', () => {
    const name = document.getElementById('goalName')?.value.trim();
    const amount = parseFloat(document.getElementById('goalAmount')?.value) || 500;
    const current = parseFloat(document.getElementById('goalCurrent')?.value) || 0;
    if (name) {
      goals.push({ id: 'goal-' + Date.now(), name, target_amount: amount, current_amount: current, icon: '🎯' });
      renderGoals();
      pennyAudio.fanfare();
      triggerConfetti();
      document.getElementById('goalModal')?.classList.add('invisible', 'opacity-0');
      if (window.alert) alert.success(`Goal "${name}" created!`);
    }
  });

  // Natural Language Input Helper on search or input
  document.getElementById('modalDescription')?.addEventListener('blur', (e) => {
    const text = e.target.value;
    const parsed = pennyAI.parseExpense(text);
    if (parsed) {
      if (parsed.amount && !document.getElementById('modalAmount').value) {
        document.getElementById('modalAmount').value = parsed.amount;
      }
      if (parsed.category) {
        const matchingCat = categories.find(c => c.name.toLowerCase() === parsed.category.toLowerCase());
        if (matchingCat) {
          document.getElementById('modalCategory').value = matchingCat.id;
        }
      }
    }
  });
}

// ============================================
// APP INITIALIZATION
// ============================================
async function init() {
  if (window.loader && typeof window.loader.loadingDashboard === 'function') {
    loader.loadingDashboard();
  }

  // Check Supabase session
  if (sb) {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        currentUser = user;
        isDemoMode = false;
        const modeBadge = document.getElementById('modeStatusText');
        if (modeBadge) modeBadge.textContent = 'Cloud Sync';
        const demoPill = document.getElementById('demoModePill');
        if (demoPill) {
          demoPill.textContent = 'CLOUD';
          demoPill.className = 'text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200';
        }
      }
    } catch (e) {
      console.warn('Supabase auth check:', e);
    }
  }

  await Promise.all([fetchCategories(), fetchIncome(), fetchExpenses()]);

  setupNavigation();
  initEventListeners();

  if (window.loader && typeof window.loader.hideAll === 'function') {
    loader.hideAll();
  }
}

// Launch PennyFlow
document.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  init();
}