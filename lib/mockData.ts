// ─── Accounts ────────────────────────────────────────────────────────────────

export const mockAccounts = [
  {
    id: 'acc_1',
    userId: 'user_1',
    institutionName: 'Chase',
    accountType: 'checking',
    balance: 24850.42,
    last4: '3891',
    akoyaAccountId: null,
    akoyaToken: null,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'acc_2',
    userId: 'user_1',
    institutionName: 'Vanguard',
    accountType: 'brokerage',
    balance: 142680.00,
    last4: '7204',
    akoyaAccountId: null,
    akoyaToken: null,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'acc_3',
    userId: 'user_1',
    institutionName: 'Chase',
    accountType: 'credit',
    balance: -4820.55,
    last4: '2293',
    akoyaAccountId: null,
    akoyaToken: null,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'acc_4',
    userId: 'user_1',
    institutionName: 'Marcus by Goldman Sachs',
    accountType: 'savings',
    balance: 52000.00,
    last4: '6601',
    akoyaAccountId: null,
    akoyaToken: null,
    createdAt: new Date('2024-01-15'),
  },
]

// ─── Transactions (Oct 2025 – Mar 2026, sorted newest-first) ─────────────────

export const mockTransactions = [
  // ── March 2026 ──────────────────────────────────────────────────────────────
  { id: 't_72', accountId: 'acc_3', merchantName: 'Sweetgreen',                  amount: -16.50,   category: 'Dining',        date: new Date('2026-03-09'), pending: false },
  { id: 't_71', accountId: 'acc_3', merchantName: 'Whole Foods Market',           amount: -124.32,  category: 'Groceries',     date: new Date('2026-03-08'), pending: false },
  { id: 't_70', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2026-03-07'), pending: false },
  { id: 't_69', accountId: 'acc_3', merchantName: 'Netflix',                      amount: -22.99,   category: 'Entertainment', date: new Date('2026-03-06'), pending: false },
  { id: 't_68', accountId: 'acc_3', merchantName: 'Uber',                         amount: -28.40,   category: 'Transport',     date: new Date('2026-03-05'), pending: false },
  { id: 't_67', accountId: 'acc_1', merchantName: 'Con Edison',                   amount: -98.12,   category: 'Utilities',     date: new Date('2026-03-04'), pending: false },
  { id: 't_66', accountId: 'acc_3', merchantName: 'Amazon',                       amount: -67.99,   category: 'Shopping',      date: new Date('2026-03-03'), pending: false },
  { id: 't_65', accountId: 'acc_3', merchantName: 'Spotify',                      amount: -9.99,    category: 'Entertainment', date: new Date('2026-03-01'), pending: false },
  { id: 't_64', accountId: 'acc_1', merchantName: 'Rent — 245 W 77th Street',     amount: -3200.00, category: 'Housing',       date: new Date('2026-03-01'), pending: false },

  // ── February 2026 ───────────────────────────────────────────────────────────
  { id: 't_63', accountId: 'acc_3', merchantName: "Trader Joe's",                 amount: -89.21,   category: 'Groceries',     date: new Date('2026-02-25'), pending: false },
  { id: 't_62', accountId: 'acc_1', merchantName: 'Con Edison',                   amount: -102.60,  category: 'Utilities',     date: new Date('2026-02-24'), pending: false },
  { id: 't_61', accountId: 'acc_3', merchantName: 'CVS Pharmacy',                 amount: -38.92,   category: 'Health',        date: new Date('2026-02-22'), pending: false },
  { id: 't_60', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2026-02-21'), pending: false },
  { id: 't_59', accountId: 'acc_3', merchantName: 'Carbone',                      amount: -340.00,  category: 'Dining',        date: new Date('2026-02-14'), pending: false },
  { id: 't_58', accountId: 'acc_3', merchantName: 'United Airlines',              amount: -420.00,  category: 'Travel',        date: new Date('2026-02-10'), pending: false },
  { id: 't_57', accountId: 'acc_3', merchantName: 'Equinox',                      amount: -185.00,  category: 'Health',        date: new Date('2026-02-09'), pending: false },
  { id: 't_56', accountId: 'acc_3', merchantName: 'Whole Foods Market',           amount: -172.66,  category: 'Groceries',     date: new Date('2026-02-08'), pending: false },
  { id: 't_55', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2026-02-07'), pending: false },
  { id: 't_54', accountId: 'acc_1', merchantName: 'Rent — 245 W 77th Street',     amount: -3200.00, category: 'Housing',       date: new Date('2026-02-01'), pending: false },

  // ── January 2026 ────────────────────────────────────────────────────────────
  { id: 't_53', accountId: 'acc_3', merchantName: 'Amazon',                       amount: -89.99,   category: 'Shopping',      date: new Date('2026-01-27'), pending: false },
  { id: 't_52', accountId: 'acc_3', merchantName: "Trader Joe's",                 amount: -108.92,  category: 'Groceries',     date: new Date('2026-01-24'), pending: false },
  { id: 't_51', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2026-01-21'), pending: false },
  { id: 't_50', accountId: 'acc_3', merchantName: 'Uber',                         amount: -28.90,   category: 'Transport',     date: new Date('2026-01-17'), pending: false },
  { id: 't_49', accountId: 'acc_1', merchantName: 'Con Edison',                   amount: -109.75,  category: 'Utilities',     date: new Date('2026-01-15'), pending: false },
  { id: 't_48', accountId: 'acc_3', merchantName: 'Sweetgreen',                   amount: -21.50,   category: 'Dining',        date: new Date('2026-01-13'), pending: false },
  { id: 't_47', accountId: 'acc_3', merchantName: 'Spotify',                      amount: -9.99,    category: 'Entertainment', date: new Date('2026-01-10'), pending: false },
  { id: 't_46', accountId: 'acc_3', merchantName: 'Netflix',                      amount: -22.99,   category: 'Entertainment', date: new Date('2026-01-10'), pending: false },
  { id: 't_45', accountId: 'acc_3', merchantName: 'Equinox',                      amount: -185.00,  category: 'Health',        date: new Date('2026-01-09'), pending: false },
  { id: 't_44', accountId: 'acc_3', merchantName: 'Whole Foods Market',           amount: -156.44,  category: 'Groceries',     date: new Date('2026-01-08'), pending: false },
  { id: 't_43', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2026-01-07'), pending: false },
  { id: 't_42', accountId: 'acc_1', merchantName: 'Rent — 245 W 77th Street',     amount: -3200.00, category: 'Housing',       date: new Date('2026-01-01'), pending: false },

  // ── December 2025 ───────────────────────────────────────────────────────────
  { id: 't_41', accountId: 'acc_3', merchantName: "Trader Joe's",                 amount: -145.22,  category: 'Groceries',     date: new Date('2025-12-28'), pending: false },
  { id: 't_40', accountId: 'acc_3', merchantName: 'Gramercy Tavern',              amount: -168.00,  category: 'Dining',        date: new Date('2025-12-26'), pending: false },
  { id: 't_39', accountId: 'acc_3', merchantName: 'Uber',                         amount: -88.40,   category: 'Transport',     date: new Date('2025-12-24'), pending: false },
  { id: 't_38', accountId: 'acc_3', merchantName: 'Apple Store',                  amount: -1299.00, category: 'Shopping',      date: new Date('2025-12-20'), pending: false },
  { id: 't_37', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2025-12-19'), pending: false },
  { id: 't_36', accountId: 'acc_1', merchantName: 'Con Edison',                   amount: -142.90,  category: 'Utilities',     date: new Date('2025-12-17'), pending: false },
  { id: 't_35', accountId: 'acc_3', merchantName: 'Nobu',                         amount: -210.00,  category: 'Dining',        date: new Date('2025-12-17'), pending: false },
  { id: 't_34', accountId: 'acc_3', merchantName: 'Delta Airlines',               amount: -820.00,  category: 'Travel',        date: new Date('2025-12-14'), pending: false },
  { id: 't_33', accountId: 'acc_3', merchantName: 'Saks Fifth Avenue',            amount: -560.00,  category: 'Shopping',      date: new Date('2025-12-12'), pending: false },
  { id: 't_32', accountId: 'acc_3', merchantName: 'Amazon',                       amount: -342.80,  category: 'Shopping',      date: new Date('2025-12-10'), pending: false },
  { id: 't_31', accountId: 'acc_3', merchantName: 'Equinox',                      amount: -185.00,  category: 'Health',        date: new Date('2025-12-07'), pending: false },
  { id: 't_30', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2025-12-05'), pending: false },
  { id: 't_29', accountId: 'acc_3', merchantName: 'Whole Foods Market',           amount: -221.34,  category: 'Groceries',     date: new Date('2025-12-06'), pending: false },
  { id: 't_28', accountId: 'acc_1', merchantName: 'Rent — 245 W 77th Street',     amount: -3200.00, category: 'Housing',       date: new Date('2025-12-01'), pending: false },

  // ── November 2025 ───────────────────────────────────────────────────────────
  { id: 't_27', accountId: 'acc_3', merchantName: 'Eleven Madison Park',          amount: -380.00,  category: 'Dining',        date: new Date('2025-11-27'), pending: false },
  { id: 't_26', accountId: 'acc_3', merchantName: 'Todd Snyder',                  amount: -420.00,  category: 'Shopping',      date: new Date('2025-11-25'), pending: false },
  { id: 't_25', accountId: 'acc_3', merchantName: 'Apple One',                    amount: -29.95,   category: 'Entertainment', date: new Date('2025-11-23'), pending: false },
  { id: 't_24', accountId: 'acc_3', merchantName: "Trader Joe's",                 amount: -112.88,  category: 'Groceries',     date: new Date('2025-11-22'), pending: false },
  { id: 't_23', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2025-11-21'), pending: false },
  { id: 't_22', accountId: 'acc_3', merchantName: 'Uber',                         amount: -41.80,   category: 'Transport',     date: new Date('2025-11-14'), pending: false },
  { id: 't_21', accountId: 'acc_1', merchantName: 'Con Edison',                   amount: -88.20,   category: 'Utilities',     date: new Date('2025-11-12'), pending: false },
  { id: 't_20', accountId: 'acc_3', merchantName: 'Seamless',                     amount: -64.40,   category: 'Dining',        date: new Date('2025-11-11'), pending: false },
  { id: 't_19', accountId: 'acc_3', merchantName: 'Sweetgreen',                   amount: -18.75,   category: 'Dining',        date: new Date('2025-11-10'), pending: false },
  { id: 't_18', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2025-11-07'), pending: false },
  { id: 't_17', accountId: 'acc_3', merchantName: 'Equinox',                      amount: -185.00,  category: 'Health',        date: new Date('2025-11-06'), pending: false },
  { id: 't_16', accountId: 'acc_3', merchantName: 'Whole Foods Market',           amount: -198.21,  category: 'Groceries',     date: new Date('2025-11-05'), pending: false },
  { id: 't_15', accountId: 'acc_1', merchantName: 'Rent — 245 W 77th Street',     amount: -3200.00, category: 'Housing',       date: new Date('2025-11-01'), pending: false },

  // ── October 2025 ────────────────────────────────────────────────────────────
  { id: 't_14', accountId: 'acc_3', merchantName: 'Eataly',                       amount: -124.50,  category: 'Dining',        date: new Date('2025-10-28'), pending: false },
  { id: 't_13', accountId: 'acc_3', merchantName: 'Netflix',                      amount: -15.99,   category: 'Entertainment', date: new Date('2025-10-25'), pending: false },
  { id: 't_12', accountId: 'acc_3', merchantName: 'Spotify',                      amount: -9.99,    category: 'Entertainment', date: new Date('2025-10-24'), pending: false },
  { id: 't_11', accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2025-10-21'), pending: false },
  { id: 't_10', accountId: 'acc_3', merchantName: "Trader Joe's",                 amount: -97.34,   category: 'Groceries',     date: new Date('2025-10-23'), pending: false },
  { id: 't_9',  accountId: 'acc_3', merchantName: 'Delta Airlines',               amount: -580.00,  category: 'Travel',        date: new Date('2025-10-18'), pending: false },
  { id: 't_8',  accountId: 'acc_3', merchantName: 'Amazon',                       amount: -134.99,  category: 'Shopping',      date: new Date('2025-10-16'), pending: false },
  { id: 't_7',  accountId: 'acc_3', merchantName: 'Le Bernardin',                 amount: -284.00,  category: 'Dining',        date: new Date('2025-10-12'), pending: false },
  { id: 't_6',  accountId: 'acc_1', merchantName: 'Con Edison',                   amount: -98.55,   category: 'Utilities',     date: new Date('2025-10-10'), pending: false },
  { id: 't_5',  accountId: 'acc_3', merchantName: 'Uber',                         amount: -22.40,   category: 'Transport',     date: new Date('2025-10-09'), pending: false },
  { id: 't_4',  accountId: 'acc_1', merchantName: 'Direct Deposit — Payroll',     amount: 5200.00,  category: 'Income',        date: new Date('2025-10-07'), pending: false },
  { id: 't_3',  accountId: 'acc_3', merchantName: 'Equinox',                      amount: -185.00,  category: 'Health',        date: new Date('2025-10-05'), pending: false },
  { id: 't_2',  accountId: 'acc_3', merchantName: 'Whole Foods Market',           amount: -164.82,  category: 'Groceries',     date: new Date('2025-10-04'), pending: false },
  { id: 't_1',  accountId: 'acc_1', merchantName: 'Rent — 245 W 77th Street',     amount: -3200.00, category: 'Housing',       date: new Date('2025-10-01'), pending: false },
]

// ─── Net Worth Summary ────────────────────────────────────────────────────────

export const mockNetWorth = {
  current: 214709.87,      // 24850.42 + 142680.00 + 52000.00 − 4820.55
  lastMonth: 211200.00,    // Jan 2026 snapshot
  totalAssets: 219530.42,
  totalLiabilities: 4820.55,
}

// ─── Net Worth History (12 months: Apr 2025 – Mar 2026) ──────────────────────

export const mockNetWorthHistory = [
  { month: 'Apr 2025', date: new Date('2025-04-01'), totalAssets: 176500, totalLiabilities: 5800, netWorth: 170700 },
  { month: 'May 2025', date: new Date('2025-05-01'), totalAssets: 180800, totalLiabilities: 5200, netWorth: 175600 },
  { month: 'Jun 2025', date: new Date('2025-06-01'), totalAssets: 185400, totalLiabilities: 6100, netWorth: 179300 },
  { month: 'Jul 2025', date: new Date('2025-07-01'), totalAssets: 190200, totalLiabilities: 4900, netWorth: 185300 },
  { month: 'Aug 2025', date: new Date('2025-08-01'), totalAssets: 196500, totalLiabilities: 5600, netWorth: 190900 },
  { month: 'Sep 2025', date: new Date('2025-09-01'), totalAssets: 201800, totalLiabilities: 5100, netWorth: 196700 },
  { month: 'Oct 2025', date: new Date('2025-10-01'), totalAssets: 207300, totalLiabilities: 6200, netWorth: 201100 },
  { month: 'Nov 2025', date: new Date('2025-11-01'), totalAssets: 210100, totalLiabilities: 5800, netWorth: 204300 },
  { month: 'Dec 2025', date: new Date('2025-12-01'), totalAssets: 214600, totalLiabilities: 7200, netWorth: 207400 },
  { month: 'Jan 2026', date: new Date('2026-01-01'), totalAssets: 216800, totalLiabilities: 5600, netWorth: 211200 },
  { month: 'Feb 2026', date: new Date('2026-02-01'), totalAssets: 218200, totalLiabilities: 6100, netWorth: 212100 },
  { month: 'Mar 2026', date: new Date('2026-03-01'), totalAssets: 219530, totalLiabilities: 4821, netWorth: 214709 },
]

// ─── Investment Portfolio ─────────────────────────────────────────────────────

export const mockPortfolio = [
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    shares: 285,
    price: 252.40,
    value: 71934.00,
    allocation: 50.4,
    gainLoss: 8240.00,
    gainLossPct: 12.9,
  },
  {
    ticker: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    shares: 380,
    price: 62.80,
    value: 23864.00,
    allocation: 16.7,
    gainLoss: 1840.00,
    gainLossPct: 8.4,
  },
  {
    ticker: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    shares: 210,
    price: 73.20,
    value: 15372.00,
    allocation: 10.8,
    gainLoss: -320.00,
    gainLossPct: -2.0,
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    shares: 95,
    price: 192.50,
    value: 18287.50,
    allocation: 12.8,
    gainLoss: 3120.00,
    gainLossPct: 20.6,
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    shares: 52,
    price: 256.75,
    value: 13351.00,
    allocation: 9.3,
    gainLoss: 2280.00,
    gainLossPct: 20.6,
  },
]

// ─── Monthly Cash Flow (Oct 2025 – Mar 2026) ─────────────────────────────────

export const mockMonthlyData = [
  { month: 'Oct', income: 10400, expenses: 6820, savings: 3580 },
  { month: 'Nov', income: 10400, expenses: 7340, savings: 3060 },
  { month: 'Dec', income: 10400, expenses: 9120, savings: 1280 },
  { month: 'Jan', income: 10400, expenses: 6950, savings: 3450 },
  { month: 'Feb', income: 10400, expenses: 7480, savings: 2920 },
  { month: 'Mar', income: 10400, expenses: 4580, savings: 5820 },
]

// ─── Spending by Category (last 30 days) ─────────────────────────────────────

export const mockSpendingByCategory = [
  { category: 'Dining',        amount: 356.50, color: '#8aad78' },
  { category: 'Groceries',     amount: 213.53, color: '#c4a882' },
  { category: 'Health',        amount: 223.92, color: '#9090a0' },
  { category: 'Utilities',     amount: 200.72, color: '#a08060' },
  { category: 'Travel',        amount: 420.00, color: '#b08050' },
  { category: 'Shopping',      amount: 67.99,  color: '#6a8070' },
  { category: 'Entertainment', amount: 32.98,  color: '#7a6040' },
  { category: 'Transport',     amount: 28.40,  color: '#c4806a' },
]
