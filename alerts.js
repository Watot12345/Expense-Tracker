// ============================================
// PennyFlow - Alert/Toast System (TOP position)
// ============================================

class PennyAlert {
  constructor() {
    this.createContainer();
  }

  // Create toast container if not exists
  createContainer() {
    if (!document.getElementById('pennyToast')) {
      const toast = document.createElement('div');
      toast.id = 'pennyToast';
      toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-[#1e293b] text-white py-3 px-6 rounded-[30px] text-sm font-semibold z-[2000] opacity-0 transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.2)]';
      document.body.appendChild(toast);
    }
  }

  // Show toast
  show(message, type = '', duration = 3000) {
    const toast = document.getElementById('pennyToast');
    toast.textContent = message;
    toast.className = `fixed top-8 left-1/2 -translate-x-1/2 py-3 px-6 rounded-[30px] text-sm font-semibold z-[2000] transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.2)] ${type} show`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
    }, duration);
  }

  // Success
  success(message) {
    this.show('✅ ' + message, 'bg-[#10b981] text-white');
  }

  // Error
  error(message) {
    this.show('❌ ' + message, 'bg-[#ef4444] text-white');
  }

  // Info
  info(message) {
    this.show('ℹ️ ' + message, 'bg-[#3b82f6] text-white');
  }

  // Warning
  warning(message) {
    this.show('⚠️ ' + message, 'bg-[#f59e0b] text-white');
  }

  // Welcome back (with name)
  welcomeBack(name) {
    this.show(`👋 Welcome back, ${name}!`, 'bg-[#1e293b] text-white');
  }

  // Login success
  loginSuccess() {
    this.show('🎉 Successfully logged in!', 'bg-[#10b981] text-white');
  }

  // Register success
  registerSuccess() {
    this.show('📧 Account created! Check your email.', 'bg-[#10b981] text-white');
  }

  // Expense added
  expenseAdded() {
    this.show('💸 Expense added!', 'bg-[#10b981] text-white');
  }

  // Expense deleted
  expenseDeleted() {
    this.show('🗑️ Expense deleted', 'bg-[#10b981] text-white');
  }

  // Profile saved
  profileSaved() {
    this.show('✅ Profile saved!', 'bg-[#10b981] text-white');
  }

  // Logout
  logout() {
    this.show('👋 See you soon!', 'bg-[#1e293b] text-white');
  }

  // Coming soon
  comingSoon() {
    this.show('🚧 Coming soon!', 'bg-[#1e293b] text-white');
  }

  // Error with message
  customError(message) {
    this.show(message, 'bg-[#ef4444] text-white');
  }
}

// Create global instance
const alert = new PennyAlert();