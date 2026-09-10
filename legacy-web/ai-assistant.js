// ============================================
// PennyFlow AI - Smart Expense + Insights
// ============================================

class PennyAI {
  constructor() {
    this.learnedPatterns = this.loadPatterns();
  }

  // ============================================
  // SMART EXPENSE PARSING
  // ============================================
  parseExpense(text) {
    if (!text || text.length < 3) return null;

    const lower = text.toLowerCase();
    let amount = null;
    let category = null;
    let description = text;

    // Extract amount - check for currency symbol or number patterns
    const amountPatterns = [
      /\$(\d+\.?\d*)/,           // $25 or $25.50
      /(\d+\.?\d*)\s*dollars?/i, // 25 dollars
      /(\d+\.?\d*)\s*bucks?/i,   // 25 bucks
      /(\d+)\s*(?:php|pesos?)/i, // 25 php or 25 pesos
      /₱(\d+\.?\d*)/,            // ₱25
      /(\d+\.?\d*)\s*₹/          // 25₹
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = parseFloat(match[1]);
        description = text.replace(match[0], '').trim();
        break;
      }
    }

    // If no amount found with symbols, try to find standalone number
    if (!amount) {
      const numberMatch = text.match(/(\d+\.?\d*)/);
      if (numberMatch && parseFloat(numberMatch[1]) > 0) {
        amount = parseFloat(numberMatch[1]);
        description = text.replace(numberMatch[0], '').trim();
      }
    }

    // ✅ Guess category from FULL text (not just cleaned description)
    category = this.guessCategory(text);

    // Extract vendor/place name
    const vendorPatterns = [
      /(?:at|from|to)\s+(.+?)(?:\s+(?:for|on|with|and)|\s*$)/i,
      /(.+?)(?:\s+(?:for|on|with|and)|\s+\d|\s*$)/i
    ];

    for (const pattern of vendorPatterns) {
      const match = description.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        description = match[1].trim();
        break;
      }
    }

    // Clean up description
    description = description.replace(/^(spent|paid|bought|purchased)\s+/i, '').trim();
    
    if (!description || description.length < 1) {
      description = text.replace(/\$?\d+\.?\d*\s*/g, '').trim();
    }

    if (amount || category !== 'Other') {
      return {
        amount: amount,
        category: category,
        description: description || text,
        confidence: amount ? 'high' : 'medium'
      };
    }

    return null;
  }

  // ============================================
  // AUTO-CATEGORIZATION (FIXED)
  // ============================================
  guessCategory(text) {
    if (!text) return 'Other';
    
    const lower = text.toLowerCase();

    // ✅ Check learned patterns FIRST (from localStorage)
    for (const [keyword, cat] of Object.entries(this.learnedPatterns)) {
      if (lower.includes(keyword.toLowerCase())) {
        console.log(`AI Memory: "${keyword}" → ${cat}`);
        return cat;
      }
    }

    // ✅ Category keywords - ORDERED by specificity
    const categoryKeywords = {
      'Coffee': [
        'coffee', 'starbucks', 'latte', 'espresso', 'cappuccino',
        'cafe', 'brewed', 'frappe', 'matcha', 'boba', 'milk tea',
        'dunkin', 'tim hortons', 'coffee bean'
      ],
      'Food': [
        'restaurant', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast',
        'mcdonald', 'domino', 'grocery', 'supermarket', 'walmart',
        'whole foods', 'chipotle', 'subway', 'sushi', 'taco',
        'noodle', 'ramen', 'food', 'eat', 'meal', 'jollibee',
        'mang inasal', 'chowking', 'kfc', 'wendy', 'pancake',
        'buffet', 'bakery', 'chicken', 'steak', 'pasta','jollibee', 'mang inasal', 'chowking', 'maxs', 'greenwich',
  'tapa king', 'kuya j', 'mang tomas', 'goldilocks', 'red ribbon',
  'andoks', 'baliwag', 'savory', 'aristocrat', 'dennys'
      ],
      'Transport': [
        'uber', 'lyft', 'grab', 'gas', 'fuel', 'bus', 'train',
        'taxi', 'subway', 'metro', 'parking', 'toll', 'ride',
        'commute', 'jeep', 'tricycle', 'angkas', 'joyride',
        'lrt', 'mrt', 'car', 'bike', 'scooter','angkas', 'joyride', 'lrt', 'mrt', 'p2p',
  'tricycle', 'jeepney', 'fx', 'uv express'
      ],
      'Shopping': [
        'amazon', 'shopee', 'lazada', 'target', 'mall', 'clothes',
        'shoes', 'electronics', 'apple', 'best buy', 'online',
        'order', 'purchase', 'bought', 'shopping', 'uniqlo',
        'h&m', 'nike', 'adidas', 'walmart', 'ikea', 'shop','shopee', 'lazada', 'zalora', 'sm', 'robinsons', 'landmark',
  'bench', 'penshoppe', 'regatta', 'tiktok', 'shein', 'fashion nova', 'asos', 'zara', 'forever 21'
      ],
      'Entertainment': [
        'movie', 'game', 'concert', 'netflix', 'spotify', 'theater',
        'bowling', 'party', 'bar', 'club', 'karaoke', 'stream',
        'youtube', 'disney', 'hbo', 'hulu', 'cinema', 'arcade'
      ],
      'Bills': [
        'rent', 'electric', 'water', 'internet', 'phone', 'bill',
        'subscription', 'insurance', 'utility', 'meralco', 'pldt',
        'globe', 'smart', 'converge', 'wifi', 'data'
      ],
      'Health': [
        'pharmacy', 'doctor', 'gym', 'medicine', 'hospital',
        'fitness', 'vitamin', 'checkup', 'dental', 'clinic',
        'drugstore', 'workout', 'yoga', 'pilates'
      ],
      'Books': [
        'book', 'kindle', 'barnes', 'audible', 'textbook',
        'ebook', 'magazine', 'comic', 'manga', 'novel'
      ]
    };

    // ✅ Check each category
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          console.log(`Keyword match: "${keyword}" → ${category}`);
          return category;
        }
      }
    }

    console.log('No category match found, returning Other');
    return 'Other';
  }

  // ============================================
  // MACHINE LEARNING
  // ============================================
  learn(description, category) {
    if (!description || !category) return;
    
    const words = description.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      // Clean word - remove punctuation
      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      
      // Remember words longer than 2 characters
      if (cleanWord.length > 2) {
        this.learnedPatterns[cleanWord] = category;
        console.log(`Learned: "${cleanWord}" → ${category}`);
      }
    });
    
    // Also remember the full description (for phrases)
    const cleanDesc = description.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (cleanDesc.length > 3) {
      this.learnedPatterns[cleanDesc] = category;
    }
    
    this.savePatterns();
  }

  savePatterns() {
    try {
      localStorage.setItem('pennyAI_patterns', JSON.stringify(this.learnedPatterns));
      console.log('Patterns saved:', this.learnedPatterns);
    } catch (e) {
      console.error('Failed to save patterns:', e);
    }
  }

  loadPatterns() {
    try {
      const patterns = JSON.parse(localStorage.getItem('pennyAI_patterns')) || {};
      console.log('Patterns loaded:', Object.keys(patterns).length, 'entries');
      return patterns;
    } catch (e) {
      console.error('Failed to load patterns:', e);
      return {};
    }
  }

  // ============================================
  // AI SPENDING INSIGHTS
  // ============================================
  generateInsights(expenses, budget) {
    if (!expenses || expenses.length === 0) return [];

    const insights = [];
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    // Category breakdown
    const catTotals = {};
    expenses.forEach(e => {
      const cat = e.categories?.name || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + parseFloat(e.amount || 0);
    });

    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    // 1. Top category insight
    if (sortedCats.length > 0) {
      const [topCat, topAmount] = sortedCats[0];
      const percentage = ((topAmount / totalSpent) * 100).toFixed(0);

      if (percentage > 50) {
        insights.push({
          icon: '🎯',
          title: `${topCat} takes ${percentage}% of spending`,
          message: `Try setting a ${topCat.toLowerCase()} budget to balance things out.`,
          type: 'warning'
        });
      } else {
        insights.push({
          icon: '📊',
          title: `Top category: ${topCat}`,
          message: `${this.formatMoney(topAmount)} (${percentage}% of total)`,
          type: 'info'
        });
      }
    }

    // 2. Budget tracking
    if (budget > 0) {
      const percentUsed = (totalSpent / budget) * 100;
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysElapsed = today.getDate();
      const expectedPercent = (daysElapsed / daysInMonth) * 100;
      const remaining = budget - totalSpent;
      const dailyLimit = remaining / Math.max(1, daysInMonth - daysElapsed);

      if (percentUsed > expectedPercent + 15) {
        insights.push({
          icon: '⚠️',
          title: 'Spending too fast!',
          message: `You've used ${percentUsed.toFixed(0)}% but only ${expectedPercent.toFixed(0)}% through the month.`,
          type: 'danger'
        });
      } else if (percentUsed < expectedPercent - 15) {
        insights.push({
          icon: '🎉',
          title: 'Under budget!',
          message: `Only ${percentUsed.toFixed(0)}% used. Keep it up!`,
          type: 'success'
        });
      } else {
        insights.push({
          icon: '✅',
          title: 'On track',
          message: `${this.formatMoney(remaining)} remaining.`,
          type: 'info'
        });
      }
    }

    // 3. Small purchases
    const smallPurchases = expenses.filter(e => parseFloat(e.amount || 0) < 10);
    const smallTotal = smallPurchases.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    if (smallPurchases.length > 5 && smallTotal > 50) {
      insights.push({
        icon: '💡',
        title: 'Small purchases add up',
        message: `${smallPurchases.length} purchases under $10 total ${this.formatMoney(smallTotal)}.`,
        type: 'info'
      });
    }

    // 4. No-spend day
    const todayStr = new Date().toDateString();
    const spentToday = expenses.some(e => {
      const d = new Date(e.expense_date || e.created_at);
      return d.toDateString() === todayStr;
    });

    if (!spentToday && expenses.length > 0) {
      insights.push({
        icon: '🔥',
        title: 'No spend day!',
        message: 'You haven\'t spent anything today. Keep the streak going!',
        type: 'success'
      });
    }

    return insights;
  }

  formatMoney(amount) {
    return '$' + parseFloat(amount || 0).toFixed(2);
  }
}

const pennyAI = new PennyAI();