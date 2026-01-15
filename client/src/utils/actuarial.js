// --- ACTUARIAL CONSTANTS & MATH ---
export const ACTUARIAL_CONSTANTS = {
  A: 0.00022,
  B: 2.7 * Math.pow(10, -6),
  c: 1.124,
  omega: 120,
  n: 15,
  i: 0.05,
  i_in: 0.02439
};

export const delta = Math.log(1 + ACTUARIAL_CONSTANTS.i);
export const delta_in = Math.log(1 + ACTUARIAL_CONSTANTS.i_in);
const s_const = Math.exp(-ACTUARIAL_CONSTANTS.A);
const g_const = Math.exp(-ACTUARIAL_CONSTANTS.B / Math.log(ACTUARIAL_CONSTANTS.c));

export const getSx = (x) => Math.pow(s_const, x) * Math.pow(g_const, Math.pow(ACTUARIAL_CONSTANTS.c, x));

export const getTpx = (x, t) => {
  const Sx = getSx(x);
  if (Sx === 0) return 0;
  return getSx(x + t) / Sx;
};

export const getMu = (x) => ACTUARIAL_CONSTANTS.A + ACTUARIAL_CONSTANTS.B * Math.pow(ACTUARIAL_CONSTANTS.c, x);

export const assuranceIntegrand = (t, x) => Math.exp(-delta * t) * getTpx(x, t) * getMu(x + t);
export const annuityIntegrand = (t, x, specificDelta) => Math.exp(-specificDelta * t) * getTpx(x, t);

export const simpsonsRule = (func, x, n, N = 100) => {
  const h = n / N;
  let sum = func(0, x) + func(n, x);
  for (let k = 1; k < N; k++) {
    const t = k * h;
    const factor = (k % 2 === 0) ? 2 : 4;
    sum += factor * func(t, x);
  }
  return (h / 3) * sum;
};

export const calculateSinglePolicyValue = (policy, durationYears) => {
  const x_initial = parseInt(policy.age);
  const n_initial = ACTUARIAL_CONSTANTS.n;
  const S = parseFloat(policy.coverage);

  const assurance0 = simpsonsRule(assuranceIntegrand, x_initial, n_initial, 100);
  const annuity0 = simpsonsRule((t, x) => annuityIntegrand(t, x, delta), x_initial, n_initial, 100);
  
  const P_prime = (S * assurance0) / annuity0;

  const t = Math.max(0, durationYears);
  const x_t = x_initial + t;
  const n_t = n_initial - t;

  if (n_t <= 0) return 0;

  const assurance_t = simpsonsRule(assuranceIntegrand, x_t, n_t, 100);
  const annuity_t = simpsonsRule((t, x) => annuityIntegrand(t, x, delta), x_t, n_t, 100);
  
  const EL = (S * assurance_t) - (P_prime * annuity_t);
  
  return EL;
};