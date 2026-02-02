export const calculateNextDueDate = (inceptionDateStr, paidUntilDateStr) => {
  const inception = new Date(inceptionDateStr);
  const paidUntil = paidUntilDateStr && paidUntilDateStr !== '' ? new Date(paidUntilDateStr) : null;

  if (!paidUntil) return inception;

  const nextDue = new Date(paidUntil);
  nextDue.setMonth(nextDue.getMonth() + 1);

  return nextDue;
};

// Internal helper to generate the full chronological ledger
const getFullLedger = (policy) => {
  if (!policy || !policy.inceptionDate) return [];

  const transactions = [];
  const inception = new Date(policy.inceptionDate);
  const today = new Date();
  
  // A. Generate Billings (Debits) - Only up to TODAY
  let cursor = new Date(inception);
  cursor.setHours(0,0,0,0);
  today.setHours(0,0,0,0);

  let safetyCount = 0;
  
  while (cursor <= today && safetyCount < 600) {
    const dateStr = cursor.toISOString().split('T')[0];
    transactions.push({
      date: dateStr,
      type: 'Billing',
      description: `Premium Due`,
      amount: parseFloat(policy.premium),
      isCredit: false // Debit
    });
    cursor.setMonth(cursor.getMonth() + 1);
    safetyCount++;
  }

  // B. Add Actual Payments (Credits)
  const payments = policy.paymentHistory || [];
  payments.forEach(pay => {
      transactions.push({
          date: pay.date,
          type: 'Payment',
          description: 'Payment Received',
          amount: parseFloat(pay.amount),
          isCredit: true // Credit
      });
  });

  // C. Sort Chronologically (Oldest First)
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // D. Calculate Running Balance
  let balance = 0;
  transactions.forEach(t => {
      if (t.isCredit) {
          balance -= t.amount;
      } else {
          balance += t.amount;
      }
      t.balance = Math.round(balance * 100) / 100;
  });

  return transactions;
};

/**
 * Returns the full history, reversed (Newest first) for the standard statement view.
 */
export const generateAccountStatement = (policy) => {
    const ledger = getFullLedger(policy);
    return ledger.reverse();
};

/**
 * Generates the specific Monthly Statement data for a specific date.
 */
export const generateMonthlyStatement = (policy, dateParam = new Date()) => {
    const ledger = getFullLedger(policy);
    const targetDate = new Date(dateParam);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    // 1. Calculate Opening Balance
    // This is the balance of the last transaction BEFORE the target month started.
    let openingBalance = 0;
    
    // Filter for transactions strictly before the 1st of the target month
    const firstOfMonth = new Date(targetYear, targetMonth, 1);
    const prevTransactions = ledger.filter(t => new Date(t.date) < firstOfMonth);
    
    if (prevTransactions.length > 0) {
        openingBalance = prevTransactions[prevTransactions.length - 1].balance;
    }

    // 2. Filter Activities for Target Month
    const activities = ledger.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear;
    });

    // 3. Calculate Closing Balance
    let closingBalance = openingBalance;
    if (activities.length > 0) {
        closingBalance = activities[activities.length - 1].balance;
    }

    const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return {
        monthName,
        openingBalance,
        activities: activities.reverse(), // Newest first inside the statement
        closingBalance
    };
};