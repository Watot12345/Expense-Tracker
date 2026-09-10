// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://islpjlryvtakwjmcaecd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzbHBqbHJ5dnRha3dqbWNhZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjExODEsImV4cCI6MjA5NzQzNzE4MX0.jfdzy6qxZDX6CYjx2_jFk7CvsmqSDrMqGBPTms4Lqr0';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// APP STATE
// ============================================
let selectedCategoryId = null;
let selectedCategoryName = 'Food';
let categories = [];
let expenses = [];
let incomeTotal = 0;
let expenseToDelete = null;
let expenseToEdit = null;
let currentUser = null;
let userCurrency = 'USD';
let currencySymbol = '$';
let categoryChart = null;
let weeklyChart = null;

// ============================================
// HELPERS
// ============================================
function getFirstName(fullName) {
  if (!fullName) return 'there';
  return fullName.split(' ')[0];
}

function getInitial(fullName) {
  if (!fullName) return '?';
  return fullName.charAt(0).toUpperCase();
}

function updateInitials(name) {
  const initial = getInitial(name);
  const profileEl = document.getElementById('profileInitial');
  if (profileEl) profileEl.textContent = initial;
}

function updateGreeting(name) {
  document.getElementById('greetingText').textContent = `Hey, ${getFirstName(name)} 👋`;
}

function setCurrencySymbol() {
  const symbols = { 'USD': '$', 'PHP': '₱', 'EUR': '€', 'GBP': '£', 'INR': '₹' };
  currencySymbol = symbols[userCurrency] || '$';
}

function formatMoney(amount) {
  return currencySymbol + parseFloat(amount).toFixed(2);
}

function updateCurrencyLabels() {
  document.getElementById('amountLabel').textContent = 'Amount (' + currencySymbol + ')';
}

// ============================================
// ✅ CHART DESTRUCTION HELPER
// ============================================
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
// PROFILE FUNCTIONS
// ============================================
async function loadProfile() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  
  currentUser = user;
  document.getElementById('profileEmail').textContent = user.email;
  
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profile) {
    const name = profile.full_name || user.email?.split('@')[0] || 'User';
    document.getElementById('editName').value = profile.full_name || '';
    document.getElementById('editCurrency').value = profile.currency || 'USD';
    document.getElementById('editBudget').value = profile.monthly_budget || '';
    document.getElementById('profileName').textContent = name;
    
    userCurrency = profile.currency || 'USD';
    setCurrencySymbol();
    updateCurrencyLabels();
    updateUI();
    updateGreeting(name);
    updateInitials(name);
  }
}

async function saveProfile() {
  const btn = document.getElementById('saveProfileBtn');
  const name = document.getElementById('editName').value.trim();
  const currency = document.getElementById('editCurrency').value;
  const budget = parseFloat(document.getElementById('editBudget').value) || null;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  
  const { error } = await sb.from('profiles').upsert({
    id: currentUser.id,
    full_name: name,
    currency: currency,
    monthly_budget: budget,
    updated_at: new Date()
  });
  
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
  
  if (error) {
    alert.error('Failed to save profile');
  } else {
    userCurrency = currency;
    setCurrencySymbol();
    updateCurrencyLabels();
    updateUI();
    
    document.getElementById('profileName').textContent = name || 'User';
    updateGreeting(name);
    updateInitials(name);
    alert.profileSaved();
  }
}

async function handleLogout() {
  loader.loggingOut();
  setTimeout(async () => {
    await sb.auth.signOut();
    window.location.href = 'auth.html';
  }, 800);
}

// ✅ REPLACED: Delete Account with modal instead of confirm()
function openDeleteAccountModal() {
  const modal = document.getElementById('deleteAccountModal');
  const input = document.getElementById('deleteConfirmInput');
  const confirmBtn = document.getElementById('confirmDeleteAccountBtn');
  
  // Reset state
  if (input) input.value = '';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.className = 'flex-1 py-3 rounded-[16px] font-semibold text-sm bg-gray-300 text-gray-500 cursor-not-allowed transition-all';
  }
  
  if (modal) {
    modal.classList.remove('invisible', 'opacity-0');
    setTimeout(() => input?.focus(), 100);
  }
}

function closeDeleteAccountModal() {
  const modal = document.getElementById('deleteAccountModal');
  if (modal) modal.classList.add('invisible', 'opacity-0');
}

async function handleDeleteAccount() {
  const btn = document.getElementById('confirmDeleteAccountBtn');
  if (!btn || btn.disabled) return;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
  
  loader.deleting();
  
  try {
    await sb.from('expenses').delete().eq('user_id', currentUser.id);
    await sb.from('income').delete().eq('user_id', currentUser.id);
    await sb.from('categories').delete().eq('user_id', currentUser.id);
    await sb.from('profiles').delete().eq('id', currentUser.id);
    
    await sb.auth.signOut();
    
    loader.hide();
    closeDeleteAccountModal();
    alert.success('Account deleted successfully');
    
    setTimeout(() => {
      window.location.href = 'auth.html';
    }, 1000);
    
  } catch (error) {
    console.error('Delete account error:', error);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-trash-alt mr-1"></i> Delete';
    loader.hide();
    alert.error('Failed to delete account. Please try again.');
  }
}

// ============================================
// GOALS SYSTEM
// ============================================

let goals = [];
let editingGoalId = null;
let selectedGoalIcon = '🎯';

// Load goals from localStorage
function loadGoals() {
  try {
    goals = JSON.parse(localStorage.getItem('pennyGoals')) || [];
  } catch (e) {
    goals = [];
  }
}

// Save goals to localStorage
function saveGoals() {
  try {
    localStorage.setItem('pennyGoals', JSON.stringify(goals));
  } catch (e) {
    console.error('Failed to save goals:', e);
  }
}

// Render goals list
function renderGoals() {
  const container = document.getElementById('goalsList');
  const emptyState = document.getElementById('goalsEmpty');
  
  if (!container) return;
  
  if (goals.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  
  if (emptyState) emptyState.classList.add('hidden');
  
  container.innerHTML = goals.map((goal, index) => {
    const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
    const remaining = goal.target - goal.current;
    const daysLeft = goal.date ? Math.ceil((new Date(goal.date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const dailyNeeded = daysLeft && daysLeft > 0 ? remaining / daysLeft : 0;
    
    return `
      <div class="goal-card bg-white rounded-[20px] p-4 border border-gray-100 shadow-sm transition-all cursor-pointer" data-index="${index}">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${goal.icon || '🎯'}</span>
            <div>
              <h4 class="font-semibold text-sm text-[#1e1e2f]">${escapeHTML(goal.name)}</h4>
              ${daysLeft && daysLeft > 0 ? 
                `<p class="text-[10px] text-[#64748b]">${daysLeft} days left</p>` : 
                '<p class="text-[10px] text-[#64748b]">No deadline</p>'
              }
            </div>
          </div>
          <div class="flex gap-1">
            <button class="edit-goal-btn text-[#94a3b8] hover:text-blue-500 p-1" data-index="${index}">
              <i class="fas fa-edit text-xs"></i>
            </button>
            <button class="delete-goal-btn text-[#94a3b8] hover:text-red-500 p-1" data-index="${index}">
              <i class="fas fa-trash-alt text-xs"></i>
            </button>
          </div>
        </div>
        
        <div class="w-full bg-gray-100 rounded-full h-4 mb-2 overflow-hidden">
          <div class="goal-progress h-4 rounded-full ${
            progress >= 100 ? 'bg-green-500' : 
            progress >= 50 ? 'bg-blue-500' : 
            'bg-purple-500'
          }" style="width: ${progress}%"></div>
        </div>
        
        <div class="flex justify-between text-[10px] text-[#64748b]">
          <span>${formatMoney(goal.current)} / ${formatMoney(goal.target)}</span>
          <span>${progress.toFixed(0)}%</span>
        </div>
        
        ${remaining > 0 ? `
          <button class="add-to-goal-btn w-full mt-3 py-2 rounded-[12px] text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors" data-index="${index}">
            <i class="fas fa-plus-circle mr-1"></i> Add Money
          </button>
        ` : `
          <div class="mt-2 text-center">
            <span class="text-xs text-green-600 font-semibold">🎉 Goal Achieved!</span>
          </div>
        `}
      </div>
    `;
  }).join('');
  
  // Add event listeners
  document.querySelectorAll('.edit-goal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editGoal(parseInt(btn.dataset.index));
    });
  });
  
  document.querySelectorAll('.delete-goal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGoal(parseInt(btn.dataset.index));
    });
  });
  
  document.querySelectorAll('.add-to-goal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addMoneyToGoal(parseInt(btn.dataset.index));
    });
  });
}

function openGoalModal(editIndex = null) {
  const modal = document.getElementById('goalModal');
  if (!modal) return;
  
  const title = document.getElementById('goalModalTitle');
  editingGoalId = editIndex;
  
  if (editIndex !== null && goals[editIndex]) {
    title.textContent = 'Edit Goal';
    const goal = goals[editIndex];
    document.getElementById('goalName').value = goal.name || '';
    document.getElementById('goalAmount').value = goal.target || '';
    document.getElementById('goalCurrent').value = goal.current || '';
    document.getElementById('goalDate').value = goal.date || '';
    selectedGoalIcon = goal.icon || '🎯';
  } else {
    title.textContent = 'New Goal';
    document.getElementById('goalName').value = '';
    document.getElementById('goalAmount').value = '';
    document.getElementById('goalCurrent').value = '';
    document.getElementById('goalDate').value = '';
    selectedGoalIcon = '🎯';
  }
  
  document.querySelectorAll('.goal-icon').forEach(el => {
    el.classList.toggle('selected', el.dataset.icon === selectedGoalIcon);
  });
  
  modal.classList.remove('invisible', 'opacity-0');
  modal.querySelector('.modal-form').classList.remove('translate-y-5');
  setTimeout(() => document.getElementById('goalName')?.focus(), 100);
}

function closeGoalModal() {
  const modal = document.getElementById('goalModal');
  if (modal) {
    modal.classList.add('invisible', 'opacity-0');
    modal.querySelector('.modal-form').classList.add('translate-y-5');
  }
  editingGoalId = null;
}

function saveGoal() {
  const name = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalAmount').value) || 0;
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
  const date = document.getElementById('goalDate').value;
  
  if (!name) {
    alert.error('Please enter a goal name');
    return;
  }
  if (target <= 0) {
    alert.error('Please enter a target amount');
    return;
  }
  
  const goalData = { name, target, current, date, icon: selectedGoalIcon, createdAt: new Date().toISOString() };
  
  if (editingGoalId !== null) {
    goals[editingGoalId] = { ...goals[editingGoalId], ...goalData };
    alert.success('Goal updated! 🎯');
  } else {
    goals.push(goalData);
    alert.success('Goal created! 🎯');
  }
  
  saveGoals();
  closeGoalModal();
  renderGoals();
}

function editGoal(index) {
  openGoalModal(index);
}

function deleteGoal(index) {
  if (confirm('Delete this goal?')) {
    goals.splice(index, 1);
    saveGoals();
    renderGoals();
    alert.success('Goal deleted');
  }
}

function addMoneyToGoal(index) {
  const amount = prompt('How much to add?');
  if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
    goals[index].current += parseFloat(amount);
    saveGoals();
    renderGoals();
    alert.success(`Added ${formatMoney(amount)} to goal!`);
    
    if (goals[index].current >= goals[index].target) {
      setTimeout(() => {
        alert.success(`🎉 Goal reached: "${goals[index].name}"!`);
      }, 500);
    }
  }
}

// Goal event listeners
document.getElementById('addGoalBtn')?.addEventListener('click', () => openGoalModal());
document.getElementById('cancelGoalBtn')?.addEventListener('click', closeGoalModal);
document.getElementById('saveGoalBtn')?.addEventListener('click', saveGoal);
document.getElementById('goalModal')?.addEventListener('click', function(e) { 
  if (e.target === this) closeGoalModal(); 
});

// Goal icon selection
document.querySelectorAll('.goal-icon').forEach(icon => {
  icon.addEventListener('click', function() {
    document.querySelectorAll('.goal-icon').forEach(el => el.classList.remove('selected'));
    this.classList.add('selected');
    selectedGoalIcon = this.dataset.icon;
  });
});

// Load goals on startup
loadGoals();

// ============================================
// ✅ TAB NAVIGATION (Fixed)
// ============================================
function switchTab(tab) {
  if (tab !== 'stats') {
    destroyCharts();
  }
  
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('text-[#1e293b]');
    n.classList.add('text-[#94a3b8]');
  });
  
  const activeNav = document.querySelector(`[data-tab="${tab}"]`);
  if (activeNav) {
    activeNav.classList.remove('text-[#94a3b8]');
    activeNav.classList.add('text-[#1e293b]');
  }
  
  const appHeader = document.getElementById('appHeader');
  const balanceCard = document.getElementById('balanceCard');
  const expenseList = document.getElementById('expenseListContainer');
  const profilePanel = document.getElementById('profilePanel');
  const statsPanel = document.getElementById('statsPanel');
  const goalsPanel = document.getElementById('goalsPanel');
  const quickAdd = document.getElementById('quickAddSection');
  const addExpense = document.getElementById('addExpenseSection');
  const addIncomeBtn = document.getElementById('addIncomeBtn');
  
  // Hide everything first
  appHeader.classList.add('hidden');
  balanceCard.classList.add('hidden');
  expenseList.classList.add('hidden');
  profilePanel.classList.add('hidden');
  if (statsPanel) statsPanel.classList.add('hidden');
  if (goalsPanel) goalsPanel.classList.add('hidden');
  quickAdd.classList.add('hidden');
  addExpense.classList.add('hidden');
  if (addIncomeBtn) addIncomeBtn.classList.add('hidden');
  
  // Show based on tab
  if (tab === 'home') {
    appHeader.classList.remove('hidden');
    balanceCard.classList.remove('hidden');
    expenseList.classList.remove('hidden');
    quickAdd.classList.remove('hidden');
    addExpense.classList.remove('hidden');
    if (addIncomeBtn) addIncomeBtn.classList.remove('hidden');
  } else if (tab === 'goals') {
    // ✅ Show ONLY goals panel
    if (goalsPanel) goalsPanel.classList.remove('hidden');
    renderGoals();
  } else if (tab === 'stats') {
    if (statsPanel) statsPanel.classList.remove('hidden');
    loadStats();
  } else if (tab === 'profile') {
    profilePanel.classList.remove('hidden');
    loadProfile();
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function() {
    switchTab(this.getAttribute('data-tab'));
  });
});

// ============================================
// SUPABASE DATA FUNCTIONS
// ============================================
async function fetchCategories() {
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    useFallbackCategories();
  } else {
    categories = data;
  }
  renderCategoryTags();
  renderModalCategories();
  if (categories.length > 0 && !selectedCategoryId) {
    selectedCategoryId = categories[0].id;
    selectedCategoryName = categories[0].name;
    highlightSelectedTag();
  }
}

function useFallbackCategories() {
  categories = [
    { id: 'temp-1', name: 'Food', icon: 'fa-utensils' },
    { id: 'temp-2', name: 'Transport', icon: 'fa-bus' },
    { id: 'temp-3', name: 'Books', icon: 'fa-book' },
    { id: 'temp-4', name: 'Coffee', icon: 'fa-mug-hot' },
    { id: 'temp-5', name: 'Fun', icon: 'fa-gamepad' }
  ];
}

async function fetchExpenses() {
  const { data, error } = await sb
    .from('expenses')
    .select('*, categories(name, icon, color)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching expenses:', error);
    expenses = [];
  } else {
    expenses = data;
  }
  updateUI();
}

async function fetchIncome() {
  const { data, error } = await sb
    .from('income')
    .select('*');

  if (error) {
    console.error('Error fetching income:', error);
    incomeTotal = 2100;
  } else {
    incomeTotal = data.reduce((sum, inc) => sum + parseFloat(inc.amount), 0) || 2100;
  }
  updateUI();
}

async function addExpenseToDB(expenseData) {
  const { data, error } = await sb
    .from('expenses')
    .insert([expenseData])
    .select();

  if (error) { console.error('Error adding expense:', error); return null; }
  return data[0];
}

async function deleteExpenseFromDB(id) {
  const { error } = await sb.from('expenses').delete().eq('id', id);
  return !error;
}

// ============================================
// ✅ STATS & ANALYTICS (FULLY FIXED)
// ============================================
async function loadStats() {
  destroyCharts();
  
  const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  
  // ✅ FIX: Try multiple sources for budget
  const budget = parseFloat(document.getElementById('editBudget')?.value) || 
                 parseFloat(localStorage.getItem('pennyBudget')) || 
                 0;
  
  // ✅ Save budget to localStorage as backup
  if (budget > 0) {
    localStorage.setItem('pennyBudget', budget);
  }
  
  // ============================================
  // BUDGET PROGRESS BAR
  // ============================================
  if (budget > 0) {
    const percent = Math.min((totalExpense / budget) * 100, 100);
    const bar = document.getElementById('statsBudgetBar');
    const warning = document.getElementById('statsBudgetWarning');
    const budgetText = document.getElementById('statsBudgetText');
    
    if (bar) bar.style.width = percent + '%';
    if (budgetText) budgetText.textContent = formatMoney(totalExpense);
    
    // ✅ Update "of $X limit" label
    const budgetLabel = document.querySelector('#statsBudgetText + span');
    if (budgetLabel) {
      budgetLabel.textContent = `of ${formatMoney(budget)} limit`;
    }
    
    // Color coding
    if (percent > 100) {
      if (bar) bar.className = 'bg-[#ef4444] h-3 rounded-full transition-all duration-500';
      if (warning) {
        warning.textContent = '⚠️ You have exceeded your budget!';
        warning.classList.remove('hidden');
      }
    } else if (percent > 80) {
      if (bar) bar.className = 'bg-[#f59e0b] h-3 rounded-full transition-all duration-500';
      if (warning) {
        warning.textContent = '⚠️ Almost at your limit!';
        warning.classList.remove('hidden');
      }
    } else {
      if (bar) bar.className = 'bg-[#10b981] h-3 rounded-full transition-all duration-500';
      if (warning) warning.classList.add('hidden');
    }
    
    // ✅ UPDATE REMAINING BUDGET CARD
    const remaining = budget - totalExpense;
    const budgetLeftAmount = document.getElementById('budgetLeftAmount');
    const budgetRemainingBar = document.getElementById('budgetRemainingBar');
    
    if (budgetLeftAmount) {
      budgetLeftAmount.textContent = remaining >= 0 ? formatMoney(remaining) : formatMoney(0);
    }
    if (budgetRemainingBar) {
      const remainingPercent = Math.max(0, (remaining / budget) * 100);
      budgetRemainingBar.style.width = remainingPercent + '%';
    }
  } else {
    // No budget set
    const budgetLeftAmount = document.getElementById('budgetLeftAmount');
    const budgetText = document.getElementById('statsBudgetText');
    const budgetLabel = document.querySelector('#statsBudgetText + span');
    
    if (budgetLeftAmount) budgetLeftAmount.textContent = formatMoney(0);
    if (budgetText) budgetText.textContent = formatMoney(0);
    if (budgetLabel) budgetLabel.textContent = 'Set a budget in Profile';
  }
  
  // ============================================
  // QUICK STATS
  // ============================================
  const totalTxEl = document.getElementById('totalTransactions');
  const avgDailyEl = document.getElementById('avgDailySpend');
  const thisMonthEl = document.getElementById('thisMonthTotal');
  const topCategoryEl = document.getElementById('topCategory');
  const topCategoryPercentEl = document.getElementById('topCategoryPercent');
  const largestExpenseEl = document.getElementById('largestExpense');
  const largestExpenseNameEl = document.getElementById('largestExpenseName');
  
  // Total transactions
  if (totalTxEl) totalTxEl.textContent = expenses.length;
  
  // Average daily spend
  const daysWithExpenses = new Set(expenses.map(e => e.expense_date || e.created_at?.split('T')[0])).size || 1;
  if (avgDailyEl) avgDailyEl.textContent = formatMoney(totalExpense / daysWithExpenses);
  
  // This month total
  const now = new Date();
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.expense_date || e.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonth.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  if (thisMonthEl) thisMonthEl.textContent = formatMoney(thisMonthTotal);
  
  // Month trend
  const monthTrendIcon = document.getElementById('monthTrendIcon');
  const monthTrendText = document.getElementById('monthTrendText');
  if (monthTrendIcon && monthTrendText) {
    // For now show neutral since we don't have last month data
    monthTrendIcon.textContent = '📊';
    monthTrendText.textContent = 'Track your spending';
  }
  
  // Category totals
  const catTotals = {};
  expenses.forEach(e => {
    const name = e.categories?.name || 'Other';
    catTotals[name] = (catTotals[name] || 0) + parseFloat(e.amount || 0);
  });
  
  // Top category
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const topCat = sortedCats[0];
  
  if (topCategoryEl) {
    topCategoryEl.textContent = topCat ? topCat[0] : '—';
  }
  if (topCategoryPercentEl && topCat && totalExpense > 0) {
    topCategoryPercentEl.textContent = ((topCat[1] / totalExpense) * 100).toFixed(0) + '% of total';
  } else if (topCategoryPercentEl) {
    topCategoryPercentEl.textContent = '0% of total';
  }
  
  // ✅ LARGEST EXPENSE
  const largest = expenses.reduce((max, e) => {
    const amount = parseFloat(e?.amount || 0);
    const maxAmount = parseFloat(max?.amount || 0);
    return amount > maxAmount ? e : max;
  }, expenses[0] || null);
  
  if (largestExpenseEl) {
    largestExpenseEl.textContent = largest ? formatMoney(largest.amount) : formatMoney(0);
  }
  if (largestExpenseNameEl) {
    largestExpenseNameEl.textContent = largest ? (largest.description || largest.categories?.name || '—') : '—';
  }
  
  // ============================================
  // CHARTS
  // ============================================
  renderCategoryChart(catTotals);
  renderWeeklyChart();
  
  // ============================================
  // INSIGHTS
  // ============================================
  renderInsights(catTotals, totalExpense, budget);
}


function renderCategoryChart(catTotals) {
  const ctx = document.getElementById('categoryChart')?.getContext('2d');
  if (!ctx) return;
  
  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }
  
  const colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#ef4444', '#f97316', '#06b6d4'];
  const labels = Object.keys(catTotals);
  const data = Object.values(catTotals);
  
  if (labels.length === 0) return;
  
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 15, usePointStyle: true } }
      }
    }
  });
}

function renderWeeklyChart() {
  const ctx = document.getElementById('weeklyChart')?.getContext('2d');
  if (!ctx) return;
  
  if (weeklyChart) {
    weeklyChart.destroy();
    weeklyChart = null;
  }
  
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyTotals = days.map(day => {
    return expenses.filter(e => (e.expense_date || e.created_at?.split('T')[0]) === day)
      .reduce((s, e) => s + parseFloat(e.amount), 0);
  });
  
  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days.map(d => dayNames[new Date(d).getDay()]),
      datasets: [{
        data: dailyTotals,
        backgroundColor: '#1e293b',
        borderRadius: 6,
        barThickness: 24
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function renderInsights(catTotals, totalExpense, budget) {
  const insights = [];
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  
  if (sorted.length > 0) {
    insights.push(`🔝 <b>${sorted[0][0]}</b> is your highest spending category at ${formatMoney(sorted[0][1])}.`);
  }
  
  if (budget > 0) {
    const remaining = budget - totalExpense;
    if (remaining > 0) {
      insights.push(`💚 You have ${formatMoney(remaining)} remaining this month.`);
    } else {
      insights.push(`🔴 You're ${formatMoney(Math.abs(remaining))} over budget!`);
    }
  }
  
  if (expenses.length >= 5) {
    insights.push(`🔥 You've logged ${expenses.length} transactions — keep tracking!`);
  }
  
  const daysWithExpenses = new Set(expenses.map(e => e.expense_date || e.created_at?.split('T')[0])).size || 1;
  if (daysWithExpenses >= 3) {
    insights.push(`📊 You average ${formatMoney(totalExpense / daysWithExpenses)} per day.`);
  }
  
  if (insights.length === 0) {
    insights.push('📝 Add more expenses to see insights!');
  }
  
  const insightsList = document.getElementById('insightsList');
  if (insightsList) insightsList.innerHTML = insights.map(i => `<li>• ${i}</li>`).join('');
}

// ============================================
// EDIT EXPENSE FUNCTIONS
// ============================================
function openEditModal(id) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;
  expenseToEdit = id;
  
  document.getElementById('editCategory').innerHTML = categories.map(cat =>
    `<option value="${cat.id}" ${cat.name === (expense.categories?.name || 'Other') ? 'selected' : ''}>${cat.name}</option>`
  ).join('');
  document.getElementById('editAmount').value = expense.amount;
  document.getElementById('editDescription').value = expense.description || '';
  document.getElementById('editAmountError').classList.add('hidden');
  
  const modal = document.getElementById('editModal');
  modal.classList.remove('invisible', 'opacity-0');
  modal.querySelector('.modal-form').classList.remove('translate-y-5');
}

function closeEditModal() {
  const modal = document.getElementById('editModal');
  modal.classList.add('invisible', 'opacity-0');
  modal.querySelector('.modal-form').classList.add('translate-y-5');
  expenseToEdit = null;
}

async function handleEditExpense() {
  const amountStr = document.getElementById('editAmount').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const categoryId = document.getElementById('editCategory').value;
  const errorEl = document.getElementById('editAmountError');
  errorEl.classList.add('hidden');
  
  if (!amountStr) { errorEl.textContent = 'Please enter an amount'; errorEl.classList.remove('hidden'); return; }
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) { errorEl.textContent = 'Enter a valid positive amount'; errorEl.classList.remove('hidden'); return; }
  
  const { error } = await sb.from('expenses').update({
    category_id: categoryId, amount: amount, description: description, updated_at: new Date()
  }).eq('id', expenseToEdit);
  
  if (error) { alert.error('Failed to update expense'); }
  else { closeEditModal(); await fetchExpenses(); alert.success('Expense updated! ✏️'); }
}

// ============================================
// INCOME MANAGEMENT FUNCTIONS
// ============================================
function openIncomeModal() {
  document.getElementById('incomeSource').value = '';
  document.getElementById('incomeAmount').value = '';
  document.getElementById('incomeFrequency').value = 'monthly';
  document.getElementById('incomeModal').classList.remove('invisible', 'opacity-0');
}

function closeIncomeModal() {
  document.getElementById('incomeModal').classList.add('invisible', 'opacity-0');
}

async function handleAddIncome() {
  const source = document.getElementById('incomeSource').value.trim();
  const amountStr = document.getElementById('incomeAmount').value.trim();
  const frequency = document.getElementById('incomeFrequency').value;
  if (!source || !amountStr) { alert.error('Please fill all fields'); return; }
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) { alert.error('Enter a valid amount'); return; }
  
  const { error } = await sb.from('income').insert([{
    user_id: currentUser?.id || 'demo-user', source, amount,
    is_recurring: frequency !== 'one-time', frequency,
    income_date: new Date().toISOString().split('T')[0]
  }]);
  
  if (error) { alert.error('Failed to add income'); }
  else { closeIncomeModal(); await fetchIncome(); alert.success('Income added! 💰'); }
}

// ============================================
// UI FUNCTIONS
// ============================================
function updateUI() {
  const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const balance = incomeTotal - totalExpense;
  document.getElementById('balanceDisplay').textContent = formatMoney(balance);
  document.getElementById('incomeDisplay').textContent = formatMoney(incomeTotal);
  document.getElementById('expenseDisplay').textContent = formatMoney(totalExpense);
  renderExpenseList();
}

function renderCategoryTags() {
  const iconMap = {
    'Food': 'fa-utensils', 'Transport': 'fa-bus', 'Books': 'fa-book',
    'Coffee': 'fa-mug-hot', 'Fun': 'fa-gamepad', 'Shopping': 'fa-shopping-bag',
    'Bills': 'fa-file-invoice', 'Health': 'fa-heart'
  };

  document.getElementById('categoryTags').innerHTML = categories.map(cat => `
    <div data-category-id="${cat.id}" data-category-name="${cat.name}" 
         class="tag bg-[#f8fafc] rounded-[30px] py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-[#334155] flex items-center gap-1.5 cursor-pointer transition-all duration-200 border border-transparent hover:bg-white hover:border-[#d9d9e6] hover:scale-[1.02]">
      <i class="fas ${iconMap[cat.name] || 'fa-receipt'} text-xs sm:text-sm text-[#64748b]"></i> ${cat.name}
    </div>
  `).join('');

  document.querySelectorAll('#categoryTags .tag').forEach(tag => {
    tag.addEventListener('click', function() {
      selectedCategoryId = this.getAttribute('data-category-id');
      selectedCategoryName = this.getAttribute('data-category-name');
      highlightSelectedTag();
      this.style.transform = 'scale(0.94)';
      setTimeout(() => { this.style.transform = ''; }, 120);
    });
  });

  highlightSelectedTag();
}

function renderModalCategories() {
  document.getElementById('modalCategory').innerHTML = categories.map(cat =>
    `<option value="${cat.id}">${cat.name}</option>`
  ).join('');
}

function highlightSelectedTag() {
  document.querySelectorAll('#categoryTags .tag').forEach(tag => {
    const isSelected = tag.getAttribute('data-category-id') === selectedCategoryId;
    if (isSelected) {
      tag.classList.add('bg-[#1e293b]', 'text-white', 'border-[#1e293b]');
      tag.classList.remove('bg-[#f8fafc]', 'text-[#334155]', 'border-transparent');
      tag.querySelector('i').classList.add('text-yellow-400');
      tag.querySelector('i').classList.remove('text-[#64748b]');
    } else {
      tag.classList.remove('bg-[#1e293b]', 'text-white', 'border-[#1e293b]');
      tag.classList.add('bg-[#f8fafc]', 'text-[#334155]', 'border-transparent');
      tag.querySelector('i').classList.remove('text-yellow-400');
      tag.querySelector('i').classList.add('text-[#64748b]');
    }
  });
}

function renderExpenseList() {
  const container = document.getElementById('expenseListContainer');

  if (expenses.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-[#94a3b8] text-sm"><i class="fas fa-receipt text-3xl mb-2.5 block"></i>No expenses yet. Add your first!</div>`;
    return;
  }

  const iconMap = {
    'Food': 'fa-utensils', 'Transport': 'fa-bus', 'Books': 'fa-book',
    'Coffee': 'fa-mug-hot', 'Fun': 'fa-gamepad', 'Shopping': 'fa-shopping-bag',
    'Bills': 'fa-file-invoice', 'Health': 'fa-heart'
  };

  container.innerHTML = expenses.map(exp => {
    const name = exp.categories?.name || 'Other';
    const icon = iconMap[name] || 'fa-receipt';
    const date = new Date(exp.expense_date || exp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div class="flex items-center justify-between py-3 px-2 border-b border-[#f1f5f9] rounded-xl hover:bg-[#fafaf9] transition-colors">
        <div class="flex items-center gap-3.5">
          <div class="w-9 h-9 sm:w-[42px] sm:h-[42px] bg-[#f1f5f9] rounded-2xl flex items-center justify-center text-base sm:text-lg text-[#475569]"><i class="fas ${icon}"></i></div>
          <div>
            <h4 class="font-semibold text-sm sm:text-[0.95rem] text-[#1e1e2f] mb-1">${escapeHTML(name)}</h4>
            <p class="text-[10px] sm:text-xs text-[#64748b] flex items-center gap-1"><i class="far fa-calendar-alt"></i> ${date} · ${escapeHTML(exp.description || '')}</p>
          </div>
        </div>
        <div class="flex items-center">
          <span class="font-bold text-sm sm:text-base text-[#1e1e2f]">-${formatMoney(exp.amount)}</span>
          <button class="edit-btn bg-transparent border-none text-[#cbd5e1] text-sm cursor-pointer py-1.5 px-1.5 hover:text-blue-500 transition-colors" data-id="${exp.id}"><i class="fas fa-edit"></i></button>
          <button class="delete-btn bg-transparent border-none text-[#cbd5e1] text-sm cursor-pointer py-1.5 px-1.5 ml-1 hover:text-red-500 transition-colors" data-id="${exp.id}"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(btn.getAttribute('data-id')); });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); expenseToDelete = btn.getAttribute('data-id'); openDeleteModal(); });
  });
setTimeout(() => buildFilterChips(), 100);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m] || m));
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function openModal() {
  document.getElementById('modalCategory').value = selectedCategoryId || (categories[0]?.id || '');
  document.getElementById('modalAmount').value = '';
  document.getElementById('modalDescription').value = '';
  document.getElementById('amountError').classList.add('hidden');
  const modal = document.getElementById('expenseModal');
  modal.classList.remove('invisible', 'opacity-0');
  modal.querySelector('.modal-form').classList.remove('translate-y-5');
  setTimeout(() => document.getElementById('modalAmount').focus(), 100);
}

function closeModal() {
  const modal = document.getElementById('expenseModal');
  modal.classList.add('invisible', 'opacity-0');
  modal.querySelector('.modal-form').classList.add('translate-y-5');
}

function openDeleteModal() { document.getElementById('deleteModal').classList.remove('invisible', 'opacity-0'); }
function closeDeleteModal() { document.getElementById('deleteModal').classList.add('invisible', 'opacity-0'); expenseToDelete = null; }

async function handleAddExpense() {
  const amountStr = document.getElementById('modalAmount').value.trim();
  const description = document.getElementById('modalDescription').value.trim();
  const errorEl = document.getElementById('amountError');
  errorEl.classList.add('hidden');

  if (!amountStr) { errorEl.textContent = 'Please enter an amount'; errorEl.classList.remove('hidden'); return; }
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) { errorEl.textContent = 'Enter a valid positive amount'; errorEl.classList.remove('hidden'); return; }

  const category = categories.find(c => c.id === selectedCategoryId);
  const result = await addExpenseToDB({
    user_id: currentUser?.id || 'demo-user',
    category_id: selectedCategoryId,
    amount: amount,
    description: description || (category?.name || '') + ' expense',
    expense_date: new Date().toISOString().split('T')[0]
  });

  if (result) {
    closeModal();
    await fetchExpenses();
    alert.expenseAdded();
    document.getElementById('balanceCard').style.transform = 'scale(0.98)';
    setTimeout(() => { document.getElementById('balanceCard').style.transform = ''; }, 150);
  } else {
    alert.error('Failed to add expense');
  }
}

// ============================================
// AI INTEGRATION (FULLY FIXED)
// ============================================

// Override openModal to add AI smart features
const originalOpenModal = openModal;
openModal = function() {
  // Call original first
  originalOpenModal();
  
  const descInput = document.getElementById('modalDescription');
  const amountInput = document.getElementById('modalAmount');
  const categorySelect = document.getElementById('modalCategory');
  
  if (!descInput || !amountInput || !categorySelect) return;
  
  // Remove any existing AI hint
  const existingHint = descInput.parentElement?.querySelector('.ai-hint');
  if (existingHint) existingHint.remove();
  
  // Smart parsing on EVERY input
  descInput.addEventListener('input', function() {
    const text = this.value.trim();
    
    if (text.length < 2) return;
    
    console.log('🔍 AI analyzing:', text);
    
    // Try to parse with AI
    const parsed = pennyAI.parseExpense(text);
    
    if (parsed) {
      console.log('✅ AI result:', parsed);
      
      // Show hint
      let hint = this.parentElement.querySelector('.ai-hint');
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'ai-hint text-[10px] text-green-600 mt-1 font-medium';
        this.parentElement.appendChild(hint);
      }
      
      hint.textContent = `✨ ${parsed.category} • ${parsed.description || text}`;
      
      // ✅ AUTO-FILL AMOUNT
      if (parsed.amount && parsed.amount > 0) {
        amountInput.value = parsed.amount;
        amountInput.style.borderColor = '#10b981';
        amountInput.style.backgroundColor = '#f0fdf4';
        setTimeout(() => {
          amountInput.style.borderColor = '';
          amountInput.style.backgroundColor = '';
        }, 2000);
      }
      
      // ✅ AUTO-SELECT CATEGORY (overrides previous selection)
      if (parsed.category && parsed.category !== 'Other') {
        const options = Array.from(categorySelect.options);
        const match = options.find(opt => 
          opt.text.toLowerCase() === parsed.category.toLowerCase()
        );
        
        if (match) {
          categorySelect.value = match.value;
          categorySelect.style.borderColor = '#10b981';
          categorySelect.style.backgroundColor = '#f0fdf4';
          
          // Update selectedCategoryId so the tag highlights correctly
          selectedCategoryId = match.value;
          selectedCategoryName = parsed.category;
          highlightSelectedTag();
          
          console.log('✅ Category set to:', parsed.category);
          
          setTimeout(() => {
            categorySelect.style.borderColor = '';
            categorySelect.style.backgroundColor = '';
          }, 2000);
        } else {
          console.log('⚠️ Category not found in dropdown:', parsed.category);
          // List available categories for debugging
          console.log('Available:', options.map(o => o.text));
        }
      }
    }
  });
  
  // Focus description field for immediate typing
  setTimeout(() => descInput.focus(), 150);
};

// Learn from user's manual categorization
const originalHandleAddExpense = handleAddExpense;
handleAddExpense = async function() {
  const amountStr = document.getElementById('modalAmount')?.value.trim();
  const description = document.getElementById('modalDescription')?.value.trim();
  const catId = document.getElementById('modalCategory')?.value;
  const errorEl = document.getElementById('amountError');
  
  if (errorEl) errorEl.classList.add('hidden');
  
  // Validate
  if (!amountStr) { 
    if (errorEl) {
      errorEl.textContent = 'Please enter an amount'; 
      errorEl.classList.remove('hidden');
    }
    document.getElementById('modalAmount')?.focus();
    return; 
  }
  
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) { 
    if (errorEl) {
      errorEl.textContent = 'Enter a valid positive amount'; 
      errorEl.classList.remove('hidden');
    }
    return; 
  }
  
  // ✅ TEACH AI - Learn from this categorization
  const cat = categories.find(c => c.id === catId);
  if (description && cat) {
    console.log('🧠 Teaching AI:', description, '→', cat.name);
    pennyAI.learn(description, cat.name);
  }
  
  // Call original function
  await originalHandleAddExpense();
};

// Replace insights with AI version
const originalRenderInsights = renderInsights;
renderInsights = function(catTotals, totalExpense, budget) {
  const insightsList = document.getElementById('insightsList');
  if (!insightsList) return;
  
  // Use AI insights if available
  if (typeof pennyAI !== 'undefined' && expenses.length > 0) {
    try {
      const aiInsights = pennyAI.generateInsights(expenses, budget);
      
      if (aiInsights && aiInsights.length > 0) {
        insightsList.innerHTML = aiInsights.map(i => `
          <li class="flex items-start gap-3 p-3 rounded-xl ${
            i.type === 'danger' ? 'bg-red-50 border border-red-100' :
            i.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
            i.type === 'success' ? 'bg-green-50 border border-green-100' :
            'bg-blue-50 border border-blue-100'
          }">
            <span class="text-lg mt-0.5">${i.icon}</span>
            <div>
              <p class="font-semibold text-xs text-gray-800">${i.title}</p>
              <p class="text-[11px] text-gray-600">${i.message}</p>
            </div>
          </li>
        `).join('');
        return;
      }
    } catch (e) {
      console.error('AI insights error:', e);
    }
  }
  
  // Fallback to original insights
  originalRenderInsights(catTotals, totalExpense, budget);
};

async function handleDeleteExpense() {
  if (!expenseToDelete) return;
  const success = await deleteExpenseFromDB(expenseToDelete);
  if (success) { closeDeleteModal(); await fetchExpenses(); alert.expenseDeleted(); }
  else { alert.error('Failed to delete'); }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.getElementById('openModalBtn').addEventListener('click', openModal);
document.getElementById('openModalTrigger').addEventListener('click', openModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
document.getElementById('saveExpenseBtn').addEventListener('click', handleAddExpense);
document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteExpense);
document.getElementById('clearSelection').addEventListener('click', () => {
  if (categories.length > 0) { selectedCategoryId = categories[0].id; selectedCategoryName = categories[0].name; highlightSelectedTag(); }
});
document.getElementById('expenseModal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
document.getElementById('deleteModal').addEventListener('click', function(e) { if (e.target === this) closeDeleteModal(); });
document.getElementById('modalAmount').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddExpense(); } });
document.getElementById('modalDescription').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddExpense(); } });
document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
document.getElementById('logoutBtn').addEventListener('click', handleLogout);

// ✅ Updated: Delete Account button opens modal instead of confirm()
document.getElementById('deleteAccountBtn').addEventListener('click', openDeleteAccountModal);

// Edit expense listeners
document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
document.getElementById('saveEditBtn').addEventListener('click', handleEditExpense);
document.getElementById('editModal').addEventListener('click', function(e) { if (e.target === this) closeEditModal(); });
document.getElementById('editAmount').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleEditExpense(); } });

// Income management listeners
document.getElementById('addIncomeBtn').addEventListener('click', openIncomeModal);
document.getElementById('cancelIncomeBtn').addEventListener('click', closeIncomeModal);
document.getElementById('saveIncomeBtn').addEventListener('click', handleAddIncome);
document.getElementById('incomeModal').addEventListener('click', function(e) { if (e.target === this) closeIncomeModal(); });
document.getElementById('incomeAmount').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIncome(); } });

// ✅ Delete Account Modal Listeners
document.getElementById('cancelDeleteAccountBtn')?.addEventListener('click', closeDeleteAccountModal);
document.getElementById('confirmDeleteAccountBtn')?.addEventListener('click', handleDeleteAccount);
document.getElementById('deleteAccountModal')?.addEventListener('click', function(e) { if (e.target === this) closeDeleteAccountModal(); });

// ✅ Delete Account Input - Enable button when "DELETE" is typed
document.getElementById('deleteConfirmInput')?.addEventListener('input', function() {
  const confirmBtn = document.getElementById('confirmDeleteAccountBtn');
  if (this.value === 'DELETE') {
    confirmBtn.disabled = false;
    confirmBtn.className = 'flex-1 py-3 rounded-[16px] font-semibold text-sm bg-red-500 text-white hover:bg-red-600 active:scale-[0.98] transition-all shadow-lg shadow-red-200';
  } else {
    confirmBtn.disabled = true;
    confirmBtn.className = 'flex-1 py-3 rounded-[16px] font-semibold text-sm bg-gray-300 text-gray-500 cursor-not-allowed transition-all';
  }
});

// Enter key to confirm delete
document.getElementById('deleteConfirmInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && e.target.value === 'DELETE') {
    handleDeleteAccount();
  }
});

// ============================================
// HIDE/SHOW BOTTOM NAV ON SCROLL
// ============================================
function initScrollBehavior() {
  const mainContent = document.getElementById('mainContent');
  const nav = document.querySelector('.mt-auto');
  if (!mainContent || !nav) return;
  
  let lastScroll = 0;
  
  mainContent.addEventListener('scroll', function() {
    const st = this.scrollTop;
    
    if (st > lastScroll && st > 60) {
      nav.style.transform = 'translateY(100%)';
      nav.style.opacity = '0';
    } else {
      nav.style.transform = 'translateY(0)';
      nav.style.opacity = '1';
    }
    
    nav.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    lastScroll = st;
  });
}

// ============================================
// ERROR HANDLING
// ============================================
async function safeFetch(fetchFn, fallback = null) {
  try {
    return await fetchFn();
  } catch (error) {
    console.error('Fetch failed:', error);
    alert.error('Connection failed. Please check your internet.');
    return fallback;
  }
}
// ============================================
// SEARCH & FILTER
// ============================================

let currentFilter = 'all';
let searchQuery = '';

function initSearchFilter() {
  const searchInput = document.getElementById('searchExpenses');
  const clearBtn = document.getElementById('clearSearch');
  
  if (!searchInput) return;
  
  // Search on input
  searchInput.addEventListener('input', function() {
    searchQuery = this.value.toLowerCase().trim();
    
    // Show/hide clear button
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', searchQuery === '');
    }
    
    filterExpenses();
  });
  
  // Clear search
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.classList.add('hidden');
      filterExpenses();
      searchInput.focus();
    });
  }
  
  // Build filter chips from categories
  buildFilterChips();
}

function buildFilterChips() {
  const container = document.getElementById('filterChips');
  if (!container) return;
  
  // Get unique categories from expenses
  const usedCategories = [...new Set(expenses.map(e => e.categories?.name || 'Other'))];
  
  // Add category chips
  const chipsHTML = usedCategories.map(cat => `
    <button class="filter-chip whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium bg-[#f1f5f9] text-[#64748b]" data-filter="${cat.toLowerCase()}">
      ${cat}
    </button>
  `).join('');
  
  container.innerHTML = `
    <button class="filter-chip active whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium bg-[#1e293b] text-white" data-filter="all">All</button>
    ${chipsHTML}
  `;
  
  // Add click handlers
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      filterExpenses();
    });
  });
}

// ============================================
// RECURRING EXPENSES
// ============================================

let recurringExpenses = [];

function loadRecurringExpenses() {
  try {
    recurringExpenses = JSON.parse(localStorage.getItem('pennyRecurring')) || [];
  } catch (e) {
    recurringExpenses = [];
  }
}

function saveRecurringExpenses() {
  localStorage.setItem('pennyRecurring', JSON.stringify(recurringExpenses));
}

// Add recurring checkbox to expense modal
function addRecurringOption() {
  const modalForm = document.querySelector('#expenseModal .modal-form');
  if (!modalForm || document.getElementById('recurringOption')) return;
  
  const recurringDiv = document.createElement('div');
  recurringDiv.id = 'recurringOption';
  recurringDiv.className = 'mb-3 sm:mb-[18px]';
  recurringDiv.innerHTML = `
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" id="isRecurring" class="w-4 h-4 rounded border-gray-300 text-[#1e293b] focus:ring-[#1e293b]">
      <span class="text-[10px] sm:text-xs font-semibold text-[#475569]">Recurring monthly expense</span>
    </label>
    <div id="recurringInfo" class="hidden mt-2">
      <p class="text-[10px] text-[#64748b]">
        <i class="fas fa-sync-alt mr-1"></i> 
        Will auto-add on the <strong>1st of each month</strong>
      </p>
    </div>
  `;
  
  // Insert before buttons
  const buttons = modalForm.querySelector('.flex.gap-2');
  if (buttons) {
    modalForm.insertBefore(recurringDiv, buttons);
  }
  
  // Toggle info
  document.getElementById('isRecurring').addEventListener('change', function() {
    document.getElementById('recurringInfo').classList.toggle('hidden', !this.checked);
  });
}

// Override openModal to add recurring option
const origOpenModal = openModal;
openModal = function() {
  origOpenModal();
  setTimeout(addRecurringOption, 50);
};

// Override handleAddExpense to save recurring
const origHandleAddExpense = handleAddExpense;
handleAddExpense = async function() {
  const isRecurring = document.getElementById('isRecurring')?.checked;
  const description = document.getElementById('modalDescription')?.value.trim();
  const amount = parseFloat(document.getElementById('modalAmount')?.value) || 0;
  const categoryId = document.getElementById('modalCategory')?.value;
  const category = categories.find(c => c.id === categoryId);
  
  await origHandleAddExpense();
  
  // Save recurring after successful add
  if (isRecurring && description) {
    recurringExpenses.push({
      description,
      amount,
      category: category?.name || 'Other',
      categoryId,
      dayOfMonth: 1,
      createdAt: new Date().toISOString()
    });
    saveRecurringExpenses();
    alert.success('Marked as recurring! 🔄');
  }
};

// Auto-add recurring expenses
async function checkRecurringExpenses() {
  const today = new Date();
  const isFirstOfMonth = today.getDate() === 1;
  
  if (!isFirstOfMonth) return;
  
  // Check if already added this month
  const lastRun = localStorage.getItem('pennyRecurringLastRun');
  const thisMonth = `${today.getFullYear()}-${today.getMonth()}`;
  
  if (lastRun === thisMonth) return;
  
  for (const rec of recurringExpenses) {
    try {
      await addExpenseToDB({
        user_id: currentUser?.id || 'demo-user',
        category_id: rec.categoryId,
        amount: rec.amount,
        description: rec.description,
        expense_date: new Date().toISOString().split('T')[0]
      });
    } catch (e) {
      console.error('Failed to add recurring:', rec.description, e);
    }
  }
  
  localStorage.setItem('pennyRecurringLastRun', thisMonth);
  
  if (recurringExpenses.length > 0) {
    await fetchExpenses();
    alert.success(`✅ Added ${recurringExpenses.length} recurring expenses!`);
  }
}

// View recurring expenses
function showRecurringList() {
  if (recurringExpenses.length === 0) {
    alert.info('No recurring expenses set up yet. Check "Recurring" when adding an expense.');
    return;
  }
  
  const list = recurringExpenses.map((r, i) => 
    `${i + 1}. ${r.description} - ${formatMoney(r.amount)} (${r.category})`
  ).join('\n');
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-[24px] p-6 max-w-sm w-full">
      <h3 class="font-bold text-lg mb-3">🔄 Recurring Expenses</h3>
      <div class="text-sm text-gray-600 mb-4 whitespace-pre-line">${list}</div>
      <p class="text-[10px] text-gray-400 mb-4">Auto-added on the 1st of each month</p>
      <button class="w-full py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm" id="clearRecurring">
        Clear All Recurring
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  modal.querySelector('#clearRecurring').addEventListener('click', () => {
    recurringExpenses = [];
    saveRecurringExpenses();
    modal.remove();
    alert.success('All recurring expenses cleared');
  });
}

// Add recurring button to home screen
function addRecurringButton() {
  const addIncomeBtn = document.getElementById('addIncomeBtn');
  if (!addIncomeBtn || document.getElementById('recurringBtn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'recurringBtn';
  btn.className = 'text-[10px] sm:text-xs text-purple-500 font-semibold cursor-pointer hover:opacity-70 flex items-center gap-1 ml-3';
  btn.innerHTML = '<i class="fas fa-sync-alt"></i> Recurring';
  btn.addEventListener('click', showRecurringList);
  
  addIncomeBtn.parentElement.appendChild(btn);
}

// Initialize
loadRecurringExpenses();

// Update init()
const origInit = init;
init = async function() {
  await origInit();
  addRecurringButton();
  await checkRecurringExpenses();
};

function filterExpenses() {
  let filtered = [...expenses];
  
  // Apply category filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(e => 
      (e.categories?.name || 'Other').toLowerCase() === currentFilter
    );
  }
  
  // Apply search
  if (searchQuery) {
    filtered = filtered.filter(e => 
      (e.description || '').toLowerCase().includes(searchQuery) ||
      (e.categories?.name || '').toLowerCase().includes(searchQuery) ||
      formatMoney(e.amount).toLowerCase().includes(searchQuery)
    );
  }
  
  // Render filtered list
  renderFilteredList(filtered);
}

function renderFilteredList(filteredExpenses) {
  const container = document.getElementById('expenseListContainer');
  if (!container) return;
  
  if (filteredExpenses.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-[#94a3b8] text-sm">
        <i class="fas fa-search text-3xl mb-2.5 block"></i>
        No expenses found
      </div>`;
    return;
  }
  
  // Use same rendering as renderExpenseList but with filtered data
  const originalExpenses = expenses;
  expenses = filteredExpenses;
  renderExpenseList();
  expenses = originalExpenses;
}

// ============================================
// INIT
// ============================================
async function init() {
  loader.loadingDashboard();
  
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { data: profile } = await sb.from('profiles').select('currency, full_name').eq('id', user.id).single();
    if (profile?.currency) { userCurrency = profile.currency; }
    const name = profile?.full_name || user.email?.split('@')[0] || 'User';
    updateGreeting(name);
    updateInitials(name);
    setCurrencySymbol();
    alert.welcomeBack(getFirstName(name));
  }
  
  await Promise.all([fetchCategories(), fetchIncome(), fetchExpenses()]);
  updateCurrencyLabels();
  
  if (categories.length > 0) {
    selectedCategoryId = categories[0].id;
    selectedCategoryName = categories[0].name;
    highlightSelectedTag();
  }
  
  initScrollBehavior();
   
   initSearchFilter();
  loader.hideAll();
}

// Start the app
init();