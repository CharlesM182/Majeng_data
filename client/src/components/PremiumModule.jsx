import React, { useState } from 'react';
import { Search, DollarSign, FileText, CheckCircle, X, ChevronRight } from 'lucide-react';
import { calculateNextDueDate, generateAccountStatement } from '../utils/paymentLogic';

const PremiumModule = ({ policies, onProcessPayment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statementPolicy, setStatementPolicy] = useState(null); // The policy currently showing a statement

  // 1. Filter Policies: Must be Active AND match search term
  const activePolicies = policies.filter(p => p.status === 'Active');
  
  const filteredPolicies = activePolicies.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.idNumber && p.idNumber.includes(searchTerm))
  );

  // 2. Generate Statement Data (only if a policy is selected)
  const statementData = statementPolicy ? generateAccountStatement(statementPolicy) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center text-slate-800">
          <DollarSign className="mr-2 text-green-600" /> Premium Management
        </h2>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-6 rounded-lg shadow-sm flex gap-4 items-center">
        <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text" 
              className="w-full border rounded-md p-2 pl-10" 
              placeholder="Search by Policy Number, Name, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="text-sm text-slate-500 font-medium">
            {filteredPolicies.length} Active Policies
        </div>
      </div>

      {/* POLICY LIST TABLE */}
      {!statementPolicy && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs font-bold">
                <tr>
                  <th className="p-4">Policy ID</th>
                  <th className="p-4">Holder</th>
                  <th className="p-4">Premium</th>
                  <th className="p-4">Paid Until</th>
                  <th className="p-4">Next Due</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPolicies.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">No active policies found matching your search.</td></tr>
                ) : (
                    filteredPolicies.map(policy => {
                        const nextDue = calculateNextDueDate(policy.inceptionDate, policy.paidUntil);
                        const isOverdue = nextDue < new Date();
                        
                        return (
                            <tr key={policy.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-mono text-xs text-slate-500">{policy.id}</td>
                                <td className="p-4 font-medium text-slate-800">{policy.name}</td>
                                <td className="p-4 font-bold text-slate-700">R {policy.premium}</td>
                                <td className="p-4 text-slate-600">{policy.paidUntil || policy.inceptionDate}</td>
                                <td className={`p-4 font-mono font-bold ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                                    {nextDue.toISOString().split('T')[0]}
                                </td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button 
                                        onClick={() => onProcessPayment(policy.id)}
                                        className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 flex items-center shadow-sm"
                                        title="Pay 1 Month"
                                    >
                                        <DollarSign className="w-3 h-3 mr-1" /> Pay
                                    </button>
                                    <button 
                                        onClick={() => setStatementPolicy(policy)}
                                        className="bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded text-xs hover:bg-slate-50 flex items-center shadow-sm"
                                        title="View Statement"
                                    >
                                        <FileText className="w-3 h-3 mr-1" /> Statement
                                    </button>
                                </td>
                            </tr>
                        );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STATEMENT MODAL / VIEW */}
      {statementPolicy && (
        <div className="bg-white rounded-lg shadow-lg border border-indigo-100 overflow-hidden animation-fade-in">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-indigo-900 flex items-center">
                        <FileText className="w-4 h-4 mr-2"/> Account Statement: {statementPolicy.name}
                    </h3>
                    <p className="text-xs text-indigo-700 mt-1">Policy: {statementPolicy.id} | Premium: R {statementPolicy.premium}</p>
                </div>
                <button 
                    onClick={() => setStatementPolicy(null)} 
                    className="text-indigo-400 hover:text-indigo-700 p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b sticky top-0">
                        <tr>
                            <th className="p-3">Due Date</th>
                            <th className="p-3">Description</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {statementData.map((row, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-600">{row.date}</td>
                                <td className="p-3 text-slate-700">Monthly Premium</td>
                                <td className="p-3 font-medium">R {row.amount}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                                        row.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                        row.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {row.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end">
                <button 
                    onClick={() => setStatementPolicy(null)}
                    className="text-sm text-slate-500 hover:text-slate-800 underline"
                >
                    Close Statement
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default PremiumModule;