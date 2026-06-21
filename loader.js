// ============================================
// PennyFlow - Loading Screen (with Skeleton)
// ============================================

class PennyLoader {
  constructor() {
    this.createLoader();
    this.createSkeleton();
  }

  // Original bouncing coin loader
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

  // New skeleton loader
  createSkeleton() {
    if (!document.getElementById('pennySkeleton')) {
      const skeleton = document.createElement('div');
      skeleton.id = 'pennySkeleton';
      skeleton.className = 'fixed inset-0 bg-white flex flex-col items-center justify-center z-[3000] hidden p-6';
      skeleton.innerHTML = `
        <style>
          @keyframes shimmer {
            0% { background-position: -400px 0; }
            100% { background-position: 400px 0; }
          }
          
          .skeleton {
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 800px 100%;
            animation: shimmer 1.5s ease-in-out infinite;
            border-radius: 12px;
          }
          
          .skeleton-circle {
            border-radius: 50%;
            background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
            background-size: 800px 100%;
            animation: shimmer 1.5s ease-in-out infinite;
          }
          
          .skeleton-text {
            height: 16px;
            margin-bottom: 8px;
          }
          
          .skeleton-text-sm {
            height: 12px;
            width: 60%;
          }
          
          .skeleton-text-xs {
            height: 10px;
            width: 40%;
          }
        </style>

        <div class="w-full max-w-[420px] bg-white rounded-[32px] sm:rounded-[40px] shadow-[0_30px_50px_rgba(0,0,0,0.08),0_10px_25px_rgba(0,0,0,0.05)] p-6 sm:p-8">
          
          <!-- Logo Skeleton -->
          <div class="flex flex-col items-center mb-6">
            <div class="skeleton w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] mb-3"></div>
            <div class="skeleton skeleton-text w-48 rounded-full"></div>
            <div class="skeleton skeleton-text-sm w-36 mt-2 rounded-full"></div>
          </div>

          <!-- Balance Card Skeleton -->
          <div class="bg-[#f8fafc] rounded-[20px] p-4 mb-4">
            <div class="skeleton skeleton-text-xs w-20 rounded-full mb-2"></div>
            <div class="skeleton skeleton-text w-36 rounded-full"></div>
          </div>

          <!-- Category Tags Skeleton -->
          <div class="flex gap-2 mb-4 overflow-hidden">
            <div class="skeleton w-20 h-10 rounded-[30px]"></div>
            <div class="skeleton w-24 h-10 rounded-[30px]"></div>
            <div class="skeleton w-16 h-10 rounded-[30px]"></div>
            <div class="skeleton w-22 h-10 rounded-[30px]"></div>
          </div>

          <!-- Expense Items Skeleton -->
          <div class="space-y-3 mb-4">
            <div class="flex items-center gap-3">
              <div class="skeleton w-10 h-10 rounded-2xl"></div>
              <div class="flex-1">
                <div class="skeleton skeleton-text w-32 rounded-full"></div>
                <div class="skeleton skeleton-text-xs w-24 rounded-full mt-1"></div>
              </div>
              <div class="skeleton w-16 h-6 rounded-full"></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="skeleton w-10 h-10 rounded-2xl"></div>
              <div class="flex-1">
                <div class="skeleton skeleton-text w-28 rounded-full"></div>
                <div class="skeleton skeleton-text-xs w-20 rounded-full mt-1"></div>
              </div>
              <div class="skeleton w-14 h-6 rounded-full"></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="skeleton w-10 h-10 rounded-2xl"></div>
              <div class="flex-1">
                <div class="skeleton skeleton-text w-36 rounded-full"></div>
                <div class="skeleton skeleton-text-xs w-28 rounded-full mt-1"></div>
              </div>
              <div class="skeleton w-12 h-6 rounded-full"></div>
            </div>
          </div>

          <!-- Bottom Nav Skeleton -->
          <div class="flex justify-between items-center pt-3 border-t border-[#f1f5f9]">
            <div class="skeleton w-12 h-5 rounded-full"></div>
            <div class="skeleton w-12 h-5 rounded-full"></div>
            <div class="skeleton w-12 h-5 rounded-full"></div>
            <div class="skeleton w-12 h-5 rounded-full"></div>
          </div>

          <!-- Loading Text -->
          <div class="text-center mt-6">
            <p id="skeletonMessage" class="text-sm text-[#94a3b8] flex items-center justify-center gap-2">
              <i class="fas fa-spinner fa-spin"></i> Loading your data...
            </p>
          </div>
        </div>
      `;
      document.body.appendChild(skeleton);
    }
  }

  // Show skeleton loader
  showSkeleton(message = 'Loading your data...') {
    const skeleton = document.getElementById('pennySkeleton');
    const msg = document.getElementById('skeletonMessage');
    if (msg) msg.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    if (skeleton) skeleton.classList.remove('hidden');
  }

  // Hide skeleton loader
  hideSkeleton() {
    const skeleton = document.getElementById('pennySkeleton');
    if (skeleton) skeleton.classList.add('hidden');
  }

  // Original show method (bouncing coin)
  show(message = 'Loading...') {
    const loader = document.getElementById('pennyLoader');
    const msg = document.getElementById('loaderMessage');
    if (msg) msg.textContent = message;
    if (loader) loader.classList.remove('hidden');
  }

  // Hide both loaders
  hide() {
    const loader = document.getElementById('pennyLoader');
    const skeleton = document.getElementById('pennySkeleton');
    if (loader) loader.classList.add('hidden');
    if (skeleton) skeleton.classList.add('hidden');
  }

  // Hide all loaders
  hideAll() {
    this.hide();
  }

  // ============================================
  // SKELETON LOADERS (for pages/sections)
  // ============================================
  
  // Skeleton for main app dashboard
  loadingDashboard() {
    this.showSkeleton('📂 Loading your dashboard...');
  }

  // Skeleton for stats page
  loadingStats() {
    const skeleton = document.getElementById('pennySkeleton');
    const msg = document.getElementById('skeletonMessage');
    if (msg) msg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 📊 Crunching numbers...';
    if (skeleton) {
      // Update skeleton content for stats
      const container = skeleton.querySelector('.max-w-\\[420px\\]');
      if (container) {
        container.innerHTML = `
          <!-- Budget Skeleton -->
          <div class="bg-[#f8fafc] rounded-[20px] p-4 mb-4">
            <div class="skeleton skeleton-text w-32 rounded-full mb-2"></div>
            <div class="skeleton w-full h-4 rounded-full mb-2"></div>
            <div class="skeleton skeleton-text-xs w-48 rounded-full"></div>
          </div>

          <!-- Chart Skeleton -->
          <div class="bg-[#f8fafc] rounded-[20px] p-4 mb-4">
            <div class="skeleton skeleton-text w-40 rounded-full mb-3"></div>
            <div class="skeleton w-[200px] h-[200px] rounded-full mx-auto"></div>
          </div>

          <!-- Weekly Chart Skeleton -->
          <div class="bg-[#f8fafc] rounded-[20px] p-4 mb-4">
            <div class="skeleton skeleton-text w-36 rounded-full mb-3"></div>
            <div class="skeleton w-full h-[150px] rounded-xl"></div>
          </div>

          <!-- Stats Grid Skeleton -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-[#f8fafc] rounded-[20px] p-4">
              <div class="skeleton skeleton-text-xs w-24 rounded-full mb-1"></div>
              <div class="skeleton skeleton-text w-16 rounded-full"></div>
            </div>
            <div class="bg-[#f8fafc] rounded-[20px] p-4">
              <div class="skeleton skeleton-text-xs w-24 rounded-full mb-1"></div>
              <div class="skeleton skeleton-text w-16 rounded-full"></div>
            </div>
            <div class="bg-[#f8fafc] rounded-[20px] p-4">
              <div class="skeleton skeleton-text-xs w-20 rounded-full mb-1"></div>
              <div class="skeleton skeleton-text w-16 rounded-full"></div>
            </div>
            <div class="bg-[#f8fafc] rounded-[20px] p-4">
              <div class="skeleton skeleton-text-xs w-20 rounded-full mb-1"></div>
              <div class="skeleton skeleton-text w-16 rounded-full"></div>
            </div>
          </div>

          <!-- Loading Text -->
          <div class="text-center mt-6">
            <p id="skeletonMessage" class="text-sm text-[#94a3b8] flex items-center justify-center gap-2">
              <i class="fas fa-spinner fa-spin"></i> 📊 Crunching numbers...
            </p>
          </div>
        `;
      }
      skeleton.classList.remove('hidden');
    }
  }

  // Skeleton for setup/profile page
  loadingSetup() {
    const skeleton = document.getElementById('pennySkeleton');
    const msg = document.getElementById('skeletonMessage');
    if (msg) msg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ⚙️ Setting things up...';
    if (skeleton) {
      const container = skeleton.querySelector('.max-w-\\[420px\\]');
      if (container) {
        container.innerHTML = `
          <!-- Logo Skeleton -->
          <div class="flex flex-col items-center mb-6">
            <div class="skeleton w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] mb-3"></div>
            <div class="skeleton skeleton-text w-48 rounded-full"></div>
            <div class="skeleton skeleton-text-sm w-36 mt-2 rounded-full"></div>
          </div>

          <!-- Step Dots Skeleton -->
          <div class="flex justify-center gap-2 mb-8">
            <div class="skeleton w-2.5 h-2.5 rounded-full"></div>
            <div class="skeleton w-2.5 h-2.5 rounded-full"></div>
            <div class="skeleton w-2.5 h-2.5 rounded-full"></div>
          </div>

          <!-- Step Content Skeleton -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-2">
              <div class="skeleton w-6 h-6 rounded-full"></div>
              <div class="skeleton skeleton-text w-40 rounded-full"></div>
            </div>
            <div class="skeleton skeleton-text-sm w-56 rounded-full ml-8 mb-5"></div>
            <div class="ml-8">
              <div class="skeleton w-full h-12 rounded-[16px]"></div>
            </div>
          </div>

          <!-- Buttons Skeleton -->
          <div class="flex gap-3 justify-between mt-4">
            <div class="skeleton w-24 h-12 rounded-[30px]"></div>
            <div class="skeleton w-28 h-12 rounded-[30px] ml-auto"></div>
          </div>

          <!-- Skip Skeleton -->
          <div class="flex justify-center mt-5">
            <div class="skeleton skeleton-text-sm w-24 rounded-full"></div>
          </div>

          <!-- Loading Text -->
          <div class="text-center mt-6">
            <p id="skeletonMessage" class="text-sm text-[#94a3b8] flex items-center justify-center gap-2">
              <i class="fas fa-spinner fa-spin"></i> ⚙️ Setting things up...
            </p>
          </div>
        `;
      }
      skeleton.classList.remove('hidden');
    }
  }

  // ============================================
  // ORIGINAL LOADERS (bouncing coin)
  // ============================================
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