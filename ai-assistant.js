// ============================================
// PennyFlow AI - Smart Expense + Insights + Multi-Personality Coach
// ============================================

class PennyAI {
  constructor() {
    this.learnedPatterns = this.loadPatterns();
  }

  // ============================================
  // SMART EXPENSE PARSING (Natural Language)
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
      /(\d+\.?\d*)\s*₹/,         // 25₹
      /€(\d+\.?\d*)/,            // €25
      /£(\d+\.?\d*)/,            // £25
      /¥(\d+\.?\d*)/             // ¥2500
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

    // Guess category from FULL text
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
  // AUTO-CATEGORIZATION
  // ============================================
  guessCategory(text) {
    if (!text) return 'Other';
    const lower = text.toLowerCase();

    // Check learned patterns FIRST (from localStorage)
    for (const [keyword, cat] of Object.entries(this.learnedPatterns)) {
      if (lower.includes(keyword.toLowerCase())) {
        return cat;
      }
    }

    // Category keywords - ORDERED by specificity
    const categoryKeywords = {
      'Coffee': [
        'coffee', 'starbucks', 'latte', 'espresso', 'cappuccino',
        'cafe', 'brewed', 'frappe', 'matcha', 'boba', 'milk tea',
        'dunkin', 'tim hortons', 'coffee bean'
      ],
      'Food': [
        'restaurant', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast',
        'mcdonald', 'domino', 'grocery', 'supermarket', 'walmart',
        'whole foods', 'trader joe', 'chipotle', 'subway', 'sushi', 'taco',
        'noodle', 'ramen', 'food', 'eat', 'meal', 'jollibee',
        'mang inasal', 'chowking', 'kfc', 'wendy', 'pancake',
        'buffet', 'bakery', 'chicken', 'steak', 'pasta', 'groceries'
      ],
      'Transport': [
        'uber', 'lyft', 'grab', 'gas', 'fuel', 'bus', 'train',
        'taxi', 'subway', 'metro', 'parking', 'toll', 'ride',
        'commute', 'jeep', 'tricycle', 'angkas', 'joyride',
        'lrt', 'mrt', 'car', 'bike', 'scooter'
      ],
      'Shopping': [
        'amazon', 'shopee', 'lazada', 'target', 'mall', 'clothes',
        'shoes', 'electronics', 'apple', 'best buy', 'online',
        'order', 'purchase', 'bought', 'shopping', 'uniqlo',
        'h&m', 'nike', 'adidas', 'ikea', 'shop', 'zara'
      ],
      'Entertainment': [
        'movie', 'game', 'concert', 'netflix', 'spotify', 'theater',
        'bowling', 'party', 'bar', 'club', 'karaoke', 'stream',
        'youtube', 'disney', 'hbo', 'hulu', 'cinema', 'arcade', 'steam'
      ],
      'Bills': [
        'rent', 'electric', 'water', 'internet', 'phone', 'bill',
        'subscription', 'insurance', 'utility', 'wifi', 'data', 'lease'
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

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          return category;
        }
      }
    }

    return 'Other';
  }

  // ============================================
  // PATTERN MEMORY
  // ============================================
  learn(keyword, category) {
    if (!keyword || !category) return;
    this.learnedPatterns[keyword.toLowerCase()] = category;
    this.savePatterns();
  }

  savePatterns() {
    try {
      localStorage.setItem('pennyAI_patterns', JSON.stringify(this.learnedPatterns));
    } catch (e) {
      console.error('Failed to save patterns:', e);
    }
  }

  loadPatterns() {
    try {
      const patterns = JSON.parse(localStorage.getItem('pennyAI_patterns')) || {};
      return patterns;
    } catch (e) {
      return {};
    }
  }

  // ============================================
  // MULTI-PERSONALITY COACH (Pragmatic / Roast / Hype)
  // ============================================
  generateAdvice(personality = 'pragmatic', expenses = [], budget = 1000, income = 2500) {
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const balance = income - totalSpent;
    const catTotals = {};
    expenses.forEach(e => {
      const cat = e.categories?.name || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + parseFloat(e.amount || 0);
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats.length > 0 ? sortedCats[0] : ['Food', 0];
    const topCatShare = totalSpent > 0 ? ((topCat[1] / totalSpent) * 100).toFixed(0) : 0;
    const budgetBurnRate = budget > 0 ? ((totalSpent / budget) * 100).toFixed(0) : 0;

    if (personality === 'roast') {
      const roasts = [];
      if (topCat[0] === 'Coffee' || topCat[0] === 'Food') {
        roasts.push(`🔥 You spent ${topCatShare}% of your entire expense pool on ${topCat[0]} ($${topCat[1].toFixed(2)}). Your local barista is literally putting their kids through college on your latte addiction.`);
      }
      if (parseFloat(budgetBurnRate) > 85) {
        roasts.push(`🔥 You've burned through ${budgetBurnRate}% of your monthly budget already. Your bank account is screaming into a pillow right now.`);
      } else {
        roasts.push(`🔥 You haven't gone completely broke yet (${budgetBurnRate}% spent). Did your credit card accidentally expire or did you actually practice self-control?`);
      }
      if (expenses.length > 15) {
        roasts.push(`🔥 You have ${expenses.length} separate transactions logged. Swiping your card is apparently your favorite cardio workout.`);
      }
      roasts.push(`🔥 Pro tip: Eating instant ramen for a week isn't an investment strategy, but with these spending numbers, it might become one.`);
      return {
        title: '🔥 The Honest Roast',
        badge: 'Zero Filter Mode',
        quotes: roasts
      };
    } else if (personality === 'hype') {
      const hypes = [];
      if (balance > 500) {
        hypes.push(`🚀 CASH KING! You are sitting on a solid surplus balance! Financial freedom is not just a dream, you are actively building it!`);
      }
      if (parseFloat(budgetBurnRate) < 70) {
        hypes.push(`💎 DISCIPLINE LEVEL 1000: Only ${budgetBurnRate}% of your monthly limit burned. Warren Buffett is taking notes on your frugality!`);
      }
      hypes.push(`⚡ WINNING STREAK: You are tracking every single penny. 92% of people fail to track their expenses, but you are in the top 8%!`);
      hypes.push(`🏆 FUTURE MILLIONAIRE ALERT: Every dollar you keep in your pocket today compounds into tenfold tomorrow. Keep pushing!`);
      return {
        title: '🏆 The Hype Coach',
        badge: 'Maximum Motivation',
        quotes: hypes
      };
    } else {
      // Pragmatic Advisor
      const pragmatic = [];
      pragmatic.push(`💡 **Burn Rate Analysis**: You have used ${budgetBurnRate}% of your $${budget.toFixed(2)} budget limit with healthy headroom.`);
      if (topCat[1] > 0) {
        pragmatic.push(`📊 **Category Allocation**: Your highest expenditure is **${topCat[0]}** ($${topCat[1].toFixed(2)}, ${topCatShare}% of total). We recommend keeping discretionary categories under 30% of total.`);
      }
      const savingsPotential = balance * 0.20;
      if (savingsPotential > 0) {
        pragmatic.push(`📈 **50/30/20 Rule**: Allocating $${savingsPotential.toFixed(2)} (20% of net balance) to your emergency fund will secure 3 months of buffer in 6 months.`);
      }
      return {
        title: '🧐 Pragmatic Advisor',
        badge: 'Smart Financial Guardrails',
        quotes: pragmatic
      };
    }
  }

  // ============================================
  // OCR RECEIPT SIMULATOR
  // ============================================
  simulateReceiptScan(presetKey = 'starbucks') {
    const presets = {
      starbucks: {
        vendor: 'Starbucks Coffee #492',
        date: new Date().toISOString().split('T')[0],
        total: 12.75,
        tax: 1.15,
        category: 'Coffee',
        is_subscription: false,
        items: [
          { name: 'Iced Caramel Macchiato (Venti)', price: 6.25 },
          { name: 'Pumpkin Cream Cold Brew (Grande)', price: 5.35 }
        ]
      },
      groceries: {
        vendor: 'Trader Joe\'s Market',
        date: new Date().toISOString().split('T')[0],
        total: 84.20,
        tax: 4.80,
        category: 'Food',
        is_subscription: false,
        items: [
          { name: 'Organic Almond Milk 64oz', price: 3.99 },
          { name: 'Sourdough Bread', price: 4.49 },
          { name: 'Avocados (Bag of 4)', price: 5.99 },
          { name: 'Salmon Fillets', price: 18.50 },
          { name: 'Produce & Essentials Basket', price: 51.23 }
        ]
      },
      uber: {
        vendor: 'Uber Technologies, Inc.',
        date: new Date().toISOString().split('T')[0],
        total: 28.50,
        tax: 2.10,
        category: 'Transport',
        is_subscription: false,
        items: [
          { name: 'UberX Trip (Downtown to Airport)', price: 26.40 }
        ]
      },
      netflix: {
        vendor: 'Netflix Services International',
        date: new Date().toISOString().split('T')[0],
        total: 15.99,
        tax: 1.20,
        category: 'Entertainment',
        is_subscription: true,
        items: [
          { name: 'Premium Ultra HD Monthly Subscription', price: 15.99 }
        ]
      }
    };

    return presets[presetKey] || presets.starbucks;
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

      if (percentage > 45) {
        insights.push({
          icon: '🎯',
          title: `${topCat} dominates with ${percentage}% of total expenses`,
          message: `Consider setting a daily or weekly cap on ${topCat.toLowerCase()} to safeguard your balance.`,
          type: 'warning'
        });
      } else {
        insights.push({
          icon: '📊',
          title: `Primary Category: ${topCat}`,
          message: `$${topAmount.toFixed(2)} (${percentage}% of total spending)`,
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
      const remaining = budget - totalSpent;

      if (percentUsed > 80) {
        insights.push({
          icon: '⚠️',
          title: 'High Budget Burn',
          message: `You've utilized ${percentUsed.toFixed(0)}% of your limit. Stay disciplined for the remaining ${daysInMonth - daysElapsed} days.`,
          type: 'danger'
        });
      } else {
        insights.push({
          icon: '🎉',
          title: 'Under Budget Control',
          message: `$${remaining.toFixed(2)} remaining. You are running smoothly ahead of projections!`,
          type: 'success'
        });
      }
    }

    return insights;
  }
}

const pennyAI = new PennyAI();