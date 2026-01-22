/**
 * Calculates the next payment due date based on inception and paid-until dates.
 * Payments are due on the same day of the month as the inception date.
 */
export const calculateNextDueDate = (inceptionDateStr, paidUntilDateStr) => {
  const inception = new Date(inceptionDateStr);
  const paidUntil = paidUntilDateStr && paidUntilDateStr !== '' ? new Date(paidUntilDateStr) : null;
  if (!paidUntil) return inception;
  const nextDue = new Date(paidUntil);
  nextDue.setMonth(nextDue.getMonth() + 1);
  return nextDue;
};

export const generateAccountStatement = (policy) => {
  if (!policy || !policy.inceptionDate) return [];
  const transactions = [];
  const inception = new Date(policy.inceptionDate);
  const today = new Date();
  
  // A. Generate Billings
  let cursor = new Date(inception);
  let safetyCount = 0;
  while (cursor <= today && safetyCount < 600) {
    const dateStr = cursor.toISOString().split('T')[0];
    transactions.push({
      date: dateStr, type: 'Billing', description: `Premium Due`,
      amount: parseFloat(policy.premium), isCredit: false
    });
    cursor.setMonth(cursor.getMonth() + 1);
    safetyCount++;
  }

  // B. Add Payments
  const payments = policy.paymentHistory || [];
  payments.forEach(pay => {
      transactions.push({
          date: pay.date, type: 'Payment', description: 'Payment Received',
          amount: parseFloat(pay.amount), isCredit: true
      });
  });

  // C. Sort & Calculate Balance
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  transactions.forEach(t => {
      if (t.isCredit) balance -= t.amount;
      else balance += t.amount;
      t.balance = Math.round(balance * 100) / 100;
  });

  return transactions.reverse();
};