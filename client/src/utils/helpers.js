// --- HELPER FUNCTIONS ---

export const parseDetailsFromID = (idNumber) => {
  if (!idNumber || idNumber.length !== 13 || isNaN(idNumber)) {
    return { age: '', gender: '' };
  }

  const yy = idNumber.substring(0, 2);
  const mm = idNumber.substring(2, 4);
  const dd = idNumber.substring(4, 6);
  
  const currentYear = new Date().getFullYear();
  const century = (parseInt(yy) + 2000) > currentYear ? 1900 : 2000;
  const fullYear = century + parseInt(yy);
  
  const birthDate = new Date(fullYear, parseInt(mm) - 1, parseInt(dd));
  const now = new Date();
  
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  const genderCode = parseInt(idNumber.substring(6, 10));
  const gender = genderCode < 5000 ? 'Female' : 'Male';

  return { age, gender };
};

// --- DATA MAPPERS ---
export const mapPolicyFromDB = (p) => ({
  id: p.policy_number,
  name: p.applicant_name,
  idNumber: p.id_number,
  age: p.age,
  smoker: p.smoker,
  coverage: parseFloat(p.coverage),
  premium: parseFloat(p.premium),
  status: p.status,
  inceptionDate: p.inception_date ? p.inception_date.split('T')[0] : '',
  paidUntil: p.paid_until ? p.paid_until.split('T')[0] : '',
  policyDocumentUrl: p.policy_doc_url,
  riskFactor: p.risk_factor,
  type: `Term Life (${p.term_years || 15} Yr)`
});

export const mapClaimFromDB = (c) => ({
  id: c.claim_number,
  policyId: c.policy_id,
  claimant: c.claimant_name,
  amount: parseFloat(c.amount),
  reason: c.reason,
  status: c.status,
  date: c.date_filed ? c.date_filed.split('T')[0] : '',
  settlementFormUrl: c.settlement_form_url,
  rejectionReason: c.rejection_reason
});

export const mapComplaintFromDB = (t) => ({
  id: t.ticket_number,
  policyId: t.policy_id,
  customer: t.customer_name,
  subject: t.subject,
  priority: t.priority,
  status: t.status,
  comments: t.comments,
  date: t.date_logged ? t.date_logged.split('T')[0] : ''
});