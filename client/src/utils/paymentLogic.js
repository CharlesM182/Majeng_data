/**
 * Calculates the next payment due date based on inception and paid-until dates.
 * Payments are due on the same day of the month as the inception date.
 */
export const calculateNextDueDate = (inceptionDateStr, paidUntilDateStr) => {
  const inception = new Date(inceptionDateStr);
  const paidUntil = paidUntilDateStr && paidUntilDateStr !== '' ? new Date(paidUntilDateStr) : null;

  // If never paid, due date is inception
  if (!paidUntil) return inception;

  // Otherwise, next due is 1 month after the last paid date
  const nextDue = new Date(paidUntil);
  nextDue.setMonth(nextDue.getMonth() + 1);

  return nextDue;
};

/**
 * Generates a ledger-style account statement.
 * 1. Creates a "Billing" entry for every month from Inception until TODAY.
 * 2. Merges in actual "Payment" entries provided in the policy data.
 * 3. Calculates a running balance.
 */
export const generateAccountStatement = (policy) => {
  if (!policy || !policy.inceptionDate) return [];

  const transactions = [];
  const inception = new Date(policy.inceptionDate);
  const today = new Date();
  
  // A. Generate Billings (Debits) - From Inception up to TODAY
  let cursor = new Date(inception);
  
  // Safety cap to prevent infinite loops (e.g. 50 years)
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

    // Move to next month
    cursor.setMonth(cursor.getMonth() + 1);
    safetyCount++;
  }

  // B. Add Actual Payments (Credits)
  // We expect policy.paymentHistory to be an array of { date, amount }
  // If it doesn't exist yet, we default to empty array
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

  // C. Sort chronological (Oldest first) to calculate balance
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // D. Calculate Running Balance
  let balance = 0;
  transactions.forEach(t => {
      if (t.isCredit) {
          balance -= t.amount;
      } else {
          balance += t.amount;
      }
      // Round to 2 decimal places to avoid floating point errors
      t.balance = Math.round(balance * 100) / 100;
  });

  // E. Return reversed (Newest first) for display
  return transactions.reverse();
};