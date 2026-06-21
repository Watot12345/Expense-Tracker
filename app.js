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
// ✅ TAB NAVIGATION (Fixed with chart cleanup)
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
  const quickAdd = document.getElementById('quickAddSection');
  const addExpense = document.getElementById('addExpenseSection');
  const addIncomeBtn = document.getElementById('addIncomeBtn');
  
  appHeader.classList.add('hidden');
  balanceCard.classList.add('hidden');
  expenseList.classList.add('hidden');
  profilePanel.classList.add('hidden');
  if (statsPanel) statsPanel.classList.add('hidden');
  quickAdd.classList.add('hidden');
  addExpense.classList.add('hidden');
  if (addIncomeBtn) addIncomeBtn.classList.add('hidden');
  
  if (tab === 'home' || tab === 'history') {
    appHeader.classList.remove('hidden');
    balanceCard.classList.remove('hidden');
    expenseList.classList.remove('hidden');
    quickAdd.classList.remove('hidden');
    addExpense.classList.remove('hidden');
    if (addIncomeBtn) addIncomeBtn.classList.remove('hidden');
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
// ✅ STATS & ANALYTICS
// ============================================
async function loadStats() {
  destroyCharts();
  
  const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const budget = parseFloat(document.getElementById('editBudget')?.value) || 0;
  
  if (budget > 0) {
    const percent = Math.min((totalExpense / budget) * 100, 100);
    document.getElementById('statsBudgetBar').style.width = percent + '%';
    document.getElementById('statsBudgetText').textContent = `${formatMoney(totalExpense)} / ${formatMoney(budget)}`;
    
    const bar = document.getElementById('statsBudgetBar');
    const warning = document.getElementById('statsBudgetWarning');
    if (percent > 100) {
      bar.className = 'bg-[#ef4444] h-3 rounded-full transition-all duration-500';
      warning.textContent = '⚠️ You have exceeded your budget!';
      warning.classList.remove('hidden');
    } else if (percent > 80) {
      bar.className = 'bg-[#f59e0b] h-3 rounded-full transition-all duration-500';
      warning.textContent = '⚠️ Almost at your limit!';
      warning.classList.remove('hidden');
    } else {
      bar.className = 'bg-[#10b981] h-3 rounded-full transition-all duration-500';
      warning.classList.add('hidden');
    }
  }
  
  document.getElementById('totalTransactions').textContent = expenses.length;
  
  const daysWithExpenses = new Set(expenses.map(e => e.expense_date || e.created_at?.split('T')[0])).size || 1;
  document.getElementById('avgDailySpend').textContent = formatMoney(totalExpense / daysWithExpenses);
  
  const now = new Date();
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.expense_date || e.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  document.getElementById('thisMonthTotal').textContent = formatMoney(thisMonth.reduce((s, e) => s + parseFloat(e.amount), 0));
  
  const catTotals = {};
  expenses.forEach(e => {
    const name = e.categories?.name || 'Other';
    catTotals[name] = (catTotals[name] || 0) + parseFloat(e.amount);
  });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('topCategory').textContent = topCat ? topCat[0] : '-';
  
  renderCategoryChart(catTotals);
  renderWeeklyChart();
  
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
  
  loader.hideAll();
}

// Start the app
init();