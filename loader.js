// ============================================
// PennyFlow - Loading Screen
// ============================================

class PennyLoader {
  constructor() {
    this.createLoader();
  }

  createLoader() {
    if (!document.getElementById('pennyLoader')) {
      const loader = document.createElement('div');
      loader.id = 'pennyLoader';
      loader.className = 'fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-[3000] hidden';
      loader.innerHTML = `
        <div class="text-center">
          <div class="bg-[#1e293b] w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-[0_8px_20px_rgba(15,23,42,0.2)] animate-bounce">
            <i class="fas fa-coins text-2xl text-white"></i>
          </div>
          <p id="loaderMessage" class="text-sm font-semibold text-[#1e1e2f]">Loading...</p>
        </div>
      `;
      document.body.appendChild(loader);
    }
  }

  show(message = 'Loading...') {
    const loader = document.getElementById('pennyLoader');
    const msg = document.getElementById('loaderMessage');
    if (msg) msg.textContent = message;
    if (loader) loader.classList.remove('hidden');
  }

  hide() {
    const loader = document.getElementById('pennyLoader');
    if (loader) loader.classList.add('hidden');
  }

  // Specific loaders
  loggingOut() {
    this.show('👋 Logging out...');
  }

  loggingIn() {
    this.show('🔐 Signing in...');
  }

  creatingAccount() {
    this.show('✨ Creating your account...');
  }

  saving() {
    this.show('💾 Saving...');
  }

  deleting() {
    this.show('🗑️ Deleting...');
  }

  loading() {
    this.show('📂 Loading your data...');
  }
}

const loader = new PennyLoader();