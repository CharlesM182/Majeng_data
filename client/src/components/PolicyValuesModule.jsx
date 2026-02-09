import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { calculateSinglePolicyValue, ACTUARIAL_CONSTANTS } from '../utils/actuarial';

const PolicyValuesModule = ({ policies }) => {
  const [activeSubTab, setActiveSubTab] = useState('projection');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [projection, setProjection] = useState(null);
  
  // State for Portfolio Valuation
  const [portfolioValuation, setPortfolioValuation] = useState([]);
  const [valuationYears, setValuationYears] = useState([]);

  const handleGenerateProjection = () => {
    const policy = policies.find(p => p.id === selectedPolicyId);
    if (!policy) return;

    const results = [];
    const term = ACTUARIAL_CONSTANTS.n; 

    for (let t = 0; t <= term; t++) {
        const val = calculateSinglePolicyValue(policy, t);
        results.push({
            year: t,
            age: parseInt(policy.age) + t,
            termRemaining: term - t,
            policyValue: val
        });
    }
    setProjection({ policy, results });
  };

  useEffect(() => {
    if (activeSubTab === 'valuation') {
      const activePolicies = policies.filter(p => p.status === 'Active');
      const currentYear = new Date().getFullYear();
      
      // Generate array of years: [Current, +1, +2, +3, +4, +5]
      const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
      setValuationYears(years);

      const valuationData = activePolicies.map(policy => {
        const inceptionYear = new Date(policy.inceptionDate).getFullYear();
        const baseDuration = Math.max(0, currentYear - inceptionYear);
        
        // Calculate value for each year in the range
        const yearlyValues = years.map((year, i) => {
            const duration = baseDuration + i;
            return calculateSinglePolicyValue(policy, duration);
        });

        return { ...policy, yearlyValues };
      });
      setPortfolioValuation(valuationData);
    }
  }, [activeSubTab, policies]);

  // Helper to calculate column totals
  const calculateColumnTotal = (colIndex) => {
    return portfolioValuation.reduce((acc, curr) => acc + (curr.yearlyValues[colIndex] || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center text-slate-800">
          <TrendingUp className="mr-2 text-purple-600" /> Policy Value Analysis
        </h2>
        <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
          <button onClick={() => setActiveSubTab('projection')} className={`px-4 py-2 rounded-md transition ${activeSubTab === 'projection' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>Individual Projection</button>
          <button onClick={() => setActiveSubTab('valuation')} className={`px-4 py-2 rounded-md transition ${activeSubTab === 'valuation' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>Current Valuation</button>
        </div>
      </div>

      {activeSubTab === 'projection' && (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Policy to Project</label>
                <div className="flex gap-4">
                    <select 
                        className="flex-1 border rounded-md p-2 bg-slate-50"
                        value={selectedPolicyId}
                        onChange={(e) => setSelectedPolicyId(e.target.value)}
                    >
                        <option value="">-- Select Active Policy --</option>
                        {policies.filter(p => p.status === 'Active').map(p => (
                            <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleGenerateProjection}
                        disabled={!selectedPolicyId}
                        className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                        Generate Projection
                    </button>
                </div>
            </div>

            {projection && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                    <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                        <h3 className="font-bold text-purple-900">Projection: {projection.policy.name}</h3>
                        <span className="text-sm text-purple-700">Sum Insured: R {projection.policy.coverage.toLocaleString()}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                                <tr>
                                    <th className="p-3">Year (t)</th>
                                    <th className="p-3">Age</th>
                                    <th className="p-3">Term Remaining</th>
                                    <th className="p-3 text-right">Policy Value E(L)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {projection.results.map((row) => (
                                    <tr key={row.year} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono">{row.year}</td>
                                        <td className="p-3">{row.age}</td>
                                        <td className="p-3">{row.termRemaining}</td>
                                        <td className={`p-3 text-right font-mono font-bold ${row.policyValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            R {row.policyValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      )}

      {activeSubTab === 'valuation' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
           <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
             <h3 className="font-bold text-purple-900">Portfolio Valuation Snapshot ({valuationYears[0]} - {valuationYears[valuationYears.length - 1]})</h3>
             {/* Total Reserve Summary Removed here as it is now in column headers */}
           </div>
           <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-white uppercase text-xs">
                <tr>
                    <th className="p-3">Policy ID</th>
                    <th className="p-3">Holder</th>
                    {/* Dynamic Headers for Years with Totals */}
                    {valuationYears.map((year, index) => {
                        const total = calculateColumnTotal(index);
                        return (
                            <th key={year} className="p-3 text-right min-w-[120px]">
                                <div className="text-slate-300 mb-1">{year}</div>
                                <div className={`font-bold ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    R {total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                </div>
                            </th>
                        );
                    })}
                </tr>
              </thead>
              <tbody className="divide-y">
                {portfolioValuation.length === 0 ? (
                    <tr><td colSpan={2 + valuationYears.length} className="p-6 text-center text-slate-500">No active policies found.</td></tr>
                ) : (
                    portfolioValuation.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-xs">{row.id}</td>
                            <td className="p-3">{row.name}</td>
                            {/* Render columns for each year */}
                            {row.yearlyValues.map((val, idx) => (
                                <td key={idx} className={`p-3 text-right font-mono font-bold ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    R {val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </td>
                            ))}
                        </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyValuesModule;