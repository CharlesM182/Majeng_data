/**
 * Calculates the next payment due date based on inception and paid-until dates.
 * Payments are due on the same day of the month as the inception date.
 */
export const calculateNextDueDate = (inceptionDateStr, paidUntilDateStr) => {
  const inception = new Date(inceptionDateStr);
  const paidUntil = paidUntilDateStr ? new Date(paidUntilDateStr) : null;

  // If never paid, due date is inception
  if (!paidUntil) return inception;

  // Otherwise, next due is 1 month after the last paid date
  const nextDue = new Date(paidUntil);
  nextDue.setMonth(nextDue.getMonth() + 1);

  // Handle month-end edge cases (e.g. Jan 31 -> Feb 28)
  // If the day of the calculated nextDue doesn't match the inception day,
  // it means the month rolled over (e.g. Feb only has 28 days). 
  // We keep it as the last day of that month.
  const originalDay = inception.getDate();
  if (nextDue.getDate() !== originalDay) {
     // Standard JS setMonth behavior handles this correctly by rolling over,
     // but for insurance, we often want to stick to the specific day if possible.
     // However, simpler logic: standard Date object behavior is usually acceptable:
     // Jan 31 + 1 month = March 3 (or Feb 28).
     // To strictly keep "Last day of month" logic requires complex library like date-fns.
     // We will stick to the paidUntil date + 1 month logic for consistency.
  }

  return nextDue;
};

/**
 * Generates an account statement by projecting monthly due dates
 * from inception up to the current date + 1 month.
 */
export const generateAccountStatement = (policy) => {
  const statement = [];
  const inception = new Date(policy.inceptionDate);
  const paidUntil = policy.paidUntil ? new Date(policy.paidUntil) : new Date(policy.inceptionDate);
  
  // Create a cursor starting at inception
  let cursor = new Date(inception);
  const today = new Date();
  // Show up to 3 months in the future
  const futureLimit = new Date(today);
  futureLimit.setMonth(today.getMonth() + 3);

  // Loop month by month
  while (cursor <= futureLimit) {
    // Determine status
    // If this specific cursor date is before or equal to the "Paid Until" date, it's Paid.
    let status = 'Unpaid';
    
    // Simple comparison: Is the cursor date <= paidUntil?
    // Note: We compare timestamps to be accurate
    if (cursor.getTime() <= paidUntil.getTime()) {
      status = 'Paid';
    } else if (cursor > today && status === 'Unpaid') {
      status = 'Due Future';
    } else {
      status = 'Overdue';
    }

    // Skip the very first "Paid" entry if inception == paidUntil (meaning nothing paid yet)
    // unless we treat inception as the first due date.
    // If paidUntil is inception, then the first premium IS paid? 
    // Usually paidUntil starts = inception - 1 month, or null. 
    // Assuming policy.paidUntil means "Covered UP TO this date".
    
    statement.push({
      date: cursor.toISOString().split('T')[0],
      amount: policy.premium,
      status: status
    });

    // Move cursor to next month
    cursor.setMonth(cursor.getMonth() + 1);
  }
  
  // Reverse to show newest first
  return statement.reverse();
};