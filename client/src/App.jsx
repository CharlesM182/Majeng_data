import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  FileText, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Plus, 
  Calculator, 
  TrendingUp, 
  Archive, 
  Upload, 
  RefreshCw,
  Lock,
  LogOut
} from 'lucide-react';

// --- IMPORT YOUR EXTERNAL MODULES ---
import UnderwritingModule from './components/UnderwritingModule'; 
import PremiumModule from './components/PremiumModule';
import { calculateSinglePolicyValue, ACTUARIAL_CONSTANTS } from './utils/actuarial';
import { mapPolicyFromDB, mapClaimFromDB, mapComplaintFromDB } from './utils/helpers';
import { calculateNextDueDate } from './utils/paymentLogic';

// --- API CONFIGURATION ---
const API_BASE_URL = 'http://localhost:3000/api';

// --- ELECTRON BRIDGE ---
let ipcRenderer;
try {
  if (window.require) {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
  }
} catch (e) {
  console.log('Running in web mode');
}

// --- LOGIN COMPONENT ---
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'Admin' && password === '1234') {
      onLogin({ username: 'Admin', role: 'admin' });
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-100 font-sans text-slate-900">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 border border-slate-200">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Majeng Life</h2>
          <p className="text-sm text-slate-500">Core Admin System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
            <input 
              type="text" 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <input 
              type="password" 
              className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-2 rounded text-center border border-red-100">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition font-medium"
          >
            Login
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-400">
          Authorized personnel only.
        </div>
      </div>
    </div>
  );
};

// --- INLINE MODULES ---

const PolicyValuesModule = ({ policies }) => {
  const [activeSubTab, setActiveSubTab] = useState('projection');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [projection, setProjection] = useState(null);
  const [portfolioValuation, setPortfolioValuation] = useState([]);

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
      
      const valuationData = activePolicies.map(policy => {
        const inceptionYear = new Date(policy.inceptionDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const duration = Math.max(0, currentYear - inceptionYear);
        const currentValue = calculateSinglePolicyValue(policy, duration);
        return { ...policy, duration, currentValue };
      });
      setPortfolioValuation(valuationData);
    }
  }, [activeSubTab, policies]);

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
             <h3 className="font-bold text-purple-900">Portfolio Valuation Snapshot ({new Date().getFullYear()})</h3>
             <div className="text-sm text-purple-800 font-medium">Total Reserve: R {portfolioValuation.reduce((acc, curr) => acc + (curr.currentValue || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
           </div>
           <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs"><tr><th className="p-3">Policy ID</th><th className="p-3">Holder</th><th className="p-3 text-right">Current Reserve E(L)</th></tr></thead>
              <tbody className="divide-y">
                {portfolioValuation.length === 0 ? <tr><td colSpan="3" className="p-6 text-center text-slate-500">No active policies found.</td></tr> : portfolioValuation.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50"><td className="p-3">{row.id}</td><td className="p-3">{row.name}</td><td className={`p-3 text-right font-bold ${row.currentValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>R {row.currentValue ? row.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminModule = ({ policies, onUploadPolicy, onUpdateStatus }) => {
  const [uploadingId, setUploadingId] = useState(null);
  
  const activePolicies = policies.filter(p => !['Archived', 'Settled', 'Lapsed'].includes(p.status));
  const archivedPolicies = policies.filter(p => ['Archived', 'Settled', 'Lapsed'].includes(p.status));

  const handleFileChange = async (e, id) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingId(id);
      await onUploadPolicy(id, file);
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b"><h2 className="text-xl font-bold flex items-center text-slate-800"><Users className="mr-2 text-indigo-600" /> Active Policy Administration</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs"><tr><th className="p-4">ID</th><th className="p-4">Holder</th><th className="p-4">Coverage</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
            <tbody className="divide-y">
              {activePolicies.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-slate-500">No active policies.</td></tr> : activePolicies.map(policy => (
                  <tr key={policy.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-xs">{policy.id}</td>
                    <td className="p-4">{policy.name}</td>
                    <td className="p-4">R {policy.coverage.toLocaleString()}</td>
                    <td className="p-4">
                      <select
                        value={policy.status}
                        onChange={(e) => onUpdateStatus(policy.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-bold border-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                          policy.status === 'Active' ? 'bg-green-100 text-green-700' : 
                          policy.status === 'Pending Doc' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        <option value="Pending Doc" disabled={policy.status !== 'Pending Doc'}>Pending Doc</option>
                        <option value="Active">Active</option>
                        <option value="Lapsed">Lapsed</option>
                        <option value="Settled">Settled</option>
                      </select>
                    </td>
                    <td className="p-4">
                        {policy.status === 'Pending Doc' && (
                            <div className="relative">
                                {uploadingId === policy.id ? (
                                    <span className="text-xs font-bold text-blue-600 animate-pulse">Uploading...</span>
                                ) : (
                                    <>
                                        <input 
                                            type="file" 
                                            id={`file-upload-${policy.id}`} 
                                            className="hidden" 
                                            onChange={(e) => handleFileChange(e, policy.id)}
                                        />
                                        <label 
                                            htmlFor={`file-upload-${policy.id}`}
                                            className="flex items-center text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-100 cursor-pointer"
                                        >
                                            <Upload className="w-3 h-3 mr-1" /> Upload
                                        </label>
                                    </>
                                )}
                            </div>
                        )}
                        {policy.status === 'Active' && policy.policyDocumentUrl && (
                             <a 
                                href={policy.policyDocumentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
                             >
                                <FileText className="w-3 h-3 mr-1" /> View Doc
                             </a>
                        )}
                        {policy.status === 'Active' && !policy.policyDocumentUrl && (
                             <span className="text-xs text-slate-400 italic">No Doc</span>
                        )}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-slate-50 rounded-lg shadow-inner overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-100"><h3 className="text-lg font-bold flex items-center text-slate-600"><Archive className="mr-2 w-5 h-5" /> Policy Archive</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500 uppercase text-xs"><tr><th className="p-3">ID</th><th className="p-3">Holder</th><th className="p-3">Reason</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-200">{archivedPolicies.map(policy => (<tr key={policy.id} className="text-slate-500"><td className="p-3 font-mono">{policy.id}</td><td className="p-3">{policy.name}</td><td className="p-3">{policy.reason || 'Status Change / Terminated'}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${policy.status === 'Settled' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>{policy.status || 'Archived'}</span></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
};

// UPDATED CLAIMS MODULE
const ClaimsModule = ({ claims, policies, onAddClaim, onUpdateClaimStatus }) => {
  const [newClaim, setNewClaim] = useState({ policyId: '' });
  const [showForm, setShowForm] = useState(false);
  const [actionClaimId, setActionClaimId] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [hasUploadedForm, setHasUploadedForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const policy = policies.find(p => p.id === newClaim.policyId);
    if (!policy) { alert("Policy ID not found"); return; }
    if (['Archived', 'Settled', 'Lapsed'].includes(policy.status)) { alert(`Policy is ${policy.status}. Cannot file claim.`); return; }
    if (policy.status === 'Pending Doc') { alert("Policy is not active yet."); return; }

    onAddClaim({ policyId: newClaim.policyId, claimant: policy.name, amount: policy.coverage, date: new Date().toISOString().split('T')[0], status: 'Pending', reason: 'Death of Insured' });
    setNewClaim({ policyId: '' }); setShowForm(false);
  };

  const handleSettlementUpload = async (e, id) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      await onUpdateClaimStatus(id, 'File_Upload', null, file);
      setUploading(false);
      setHasUploadedForm(true);
  };

  const initiateAction = (id, type) => {
    setActionClaimId(id); setActionType(type); setRejectReason(''); setHasUploadedForm(false);
  };

  const handleConfirmAction = (id) => {
    onUpdateClaimStatus(id, actionType === 'Approve' ? 'Approved' : 'Rejected', rejectReason);
    setActionClaimId(null); setActionType(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold flex items-center text-slate-800"><FileText className="mr-2 text-red-600" /> Claims Processing</h2><button onClick={() => setShowForm(!showForm)} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"><Plus className="w-4 h-4 mr-2" /> New Claim</button></div>
      {showForm && (<form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-red-100"><h3 className="font-bold mb-4">File New Claim</h3><div className="flex gap-4 items-end"><div className="flex-1"><label className="block text-sm font-medium text-slate-700 mb-1">Policy ID</label><input placeholder="Policy ID" className="w-full border p-2 rounded" value={newClaim.policyId} onChange={e => setNewClaim({...newClaim, policyId: e.target.value})} required /></div><button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded">Submit</button></div></form>)}
      <div className="grid grid-cols-1 gap-4">
        {claims.map(claim => (
          <div key={claim.id} className="bg-white rounded-lg shadow-sm border-l-4 border-l-indigo-500 overflow-hidden">
            <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h4 className="text-lg font-bold mt-1">R {claim.amount.toLocaleString()} - {claim.claimant}</h4>
                  <p className="text-sm text-slate-600">{claim.reason}</p>
                  
                  {/* --- NEW ADDITION: View Settlement Form Link --- */}
                  {claim.settlementFormUrl && (
                    <a 
                      href={claim.settlementFormUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                    >
                      <FileText className="w-3 h-3 mr-1" /> View Settlement Form
                    </a>
                  )}
                  {/* ------------------------------------------- */}
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-3">{claim.status === 'Pending' ? (<><button onClick={() => initiateAction(claim.id, 'Approve')} className="text-green-600"><CheckCircle className="w-6 h-6" /></button><button onClick={() => initiateAction(claim.id, 'Reject')} className="text-red-600"><XCircle className="w-6 h-6" /></button></>) : (<span className="px-3 py-1 rounded-full font-bold text-sm bg-slate-100 text-slate-800">{claim.status}</span>)}</div>
            </div>
            {actionClaimId === claim.id && claim.status === 'Pending' && (
                <div className="bg-slate-50 border-t p-4">
                    {actionType === 'Approve' && (
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-bold text-slate-700">Required: Upload Settlement Form</p>
                            <div className="flex gap-4 items-center">
                                {uploading ? <span className="text-sm text-blue-600 animate-pulse">Uploading Form...</span> : (
                                    <>
                                        <input type="file" id={`settle-${claim.id}`} className="hidden" onChange={(e) => handleSettlementUpload(e, claim.id)} />
                                        <label htmlFor={`settle-${claim.id}`} className={`flex items-center px-4 py-2 rounded text-sm border cursor-pointer ${hasUploadedForm ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-slate-600 border-slate-300'}`}>
                                            <Upload className="w-4 h-4 mr-2" /> {hasUploadedForm ? 'Form Uploaded' : 'Select File'}
                                        </label>
                                    </>
                                )}
                                <button onClick={() => handleConfirmAction(claim.id)} disabled={!hasUploadedForm} className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Confirm Approval</button>
                            </div>
                        </div>
                    )}
                    {actionType === 'Reject' && (<div className="flex gap-4 items-center"><input type="text" placeholder="Reason" className="flex-1 border p-2 rounded text-sm" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /><button onClick={() => handleConfirmAction(claim.id)} disabled={!rejectReason.trim()} className="bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Confirm Rejection</button></div>)}
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ComplaintsModule = ({ complaints, policies, onResolveComplaint, onAddComplaint }) => {
  const [showForm, setShowForm] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ policyId: '', subject: '', priority: 'Low' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const policy = policies.find(p => p.id === newComplaint.policyId);
    onAddComplaint({ policyId: newComplaint.policyId, customer: policy ? policy.name : 'Unknown', subject: newComplaint.subject, status: 'Open', priority: newComplaint.priority, date: new Date().toISOString().split('T')[0] });
    setNewComplaint({ policyId: '', subject: '', priority: 'Low' }); setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold flex items-center text-slate-800"><AlertCircle className="mr-2 text-orange-600" /> Complaints</h2><button onClick={() => setShowForm(!showForm)} className="bg-orange-600 text-white px-4 py-2 rounded-md"><Plus className="w-4 h-4 mr-2" /> New Complaint</button></div>
      {showForm && (<form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm"><input placeholder="Policy ID" className="w-full border p-2 mb-2 rounded" value={newComplaint.policyId} onChange={e => setNewComplaint({...newComplaint, policyId: e.target.value})} /><button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded">Log</button></form>)}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-4">Customer</th><th className="p-4">Issue</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{complaints.map(ticket => (<tr key={ticket.id} className="border-b"><td className="p-4">{ticket.customer}</td><td className="p-4">{ticket.subject}</td><td className="p-4">{ticket.status}</td><td className="p-4">{ticket.status !== 'Resolved' && (<button onClick={() => onResolveComplaint(ticket.id)} className="text-xs bg-green-600 text-white px-3 py-1 rounded">Resolve</button>)}</td></tr>))}</tbody></table></div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 

  // 1. DATA LOADING
  const refreshData = async () => {
    try {
      const [pRes, cRes, tRes] = await Promise.all([
        fetch(`${API_BASE_URL}/policies`),
        fetch(`${API_BASE_URL}/claims`),
        fetch(`${API_BASE_URL}/complaints`)
      ]);
      setPolicies((await pRes.json()).map(mapPolicyFromDB));
      setClaims((await cRes.json()).map(mapClaimFromDB));
      setComplaints((await tRes.json()).map(mapComplaintFromDB));
    } catch (err) {
      console.error("Failed to fetch data. Is the server (node server.js) running?", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // LOGIN HANDLER UPDATED to save user details
  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setCurrentUser(userData);
    setActiveTab('dashboard'); // Reset to dashboard on login
  };

  // 2. HANDLERS
  const handleCreatePolicy = async (policy) => {
    try {
      await fetch(`${API_BASE_URL}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      });
      setActiveTab('admin');
      alert("Policy successfully saved to Database.");
      refreshData();
    } catch (e) {
      alert("Error saving policy: " + e.message);
    }
  };

  const handleUpdatePolicyStatus = async (id, newStatus) => {
    try {
        await fetch(`${API_BASE_URL}/policies/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        refreshData();
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
  };

  const handleUploadPolicyDoc = async (id, file) => {
    if (!file) return;
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadRes = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
        const { url } = await uploadRes.json();

        await fetch(`${API_BASE_URL}/policies/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Active', policy_doc_url: url })
        });
        
        alert("Policy Activated and Document Saved Securely!");
        refreshData();
    } catch(e) {
        console.error(e);
        alert("Error uploading document: " + e.message);
    }
  };

  const handleProcessPayment = async (id) => {
    const policy = policies.find(p => p.id === id);
    if (!policy) return;

    const nextDate = calculateNextDueDate(policy.inceptionDate, policy.paidUntil);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    try {
        await fetch(`${API_BASE_URL}/policies/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paid_until: nextDateStr }) 
        });
        
        alert(`Payment Processed successfully.\nNew Paid Until Date: ${nextDateStr}`);
        refreshData();

    } catch (e) {
        alert("Error processing payment: " + e.message);
    }
  };

  const handleAddClaim = async (claim) => {
    await fetch(`${API_BASE_URL}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claim)
    });
    refreshData();
  };

  const handleAddComplaint = async (complaint) => {
    await fetch(`${API_BASE_URL}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaint)
    });
    refreshData();
  };

  const handleUpdateClaimStatus = async (id, status, reason, file) => {
    let settlementUrl = null;
    
    if (file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
            const data = await res.json();
            settlementUrl = data.url;
        } catch (e) {
            alert("File upload failed");
            return;
        }
    }

    const payload = { status };
    if (reason) payload.rejection_reason = reason;
    if (settlementUrl) payload.settlement_form_url = settlementUrl;

    await fetch(`${API_BASE_URL}/claims/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (status === 'Approved') {
        const claim = claims.find(c => c.id === id);
        if (claim && claim.policyId) {
             // SET STATUS TO SETTLED (Moves to Archive)
             await fetch(`${API_BASE_URL}/policies/${claim.policyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Settled' })
            });
        }
    }
    refreshData();
  };

  const handleResolveComplaint = async (id) => {
      await fetch(`${API_BASE_URL}/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved' })
    });
    refreshData();
  };

  // 3. RENDER CONTENT
  const renderContent = () => {
    switch (activeTab) {
      case 'underwriting': 
        return <UnderwritingModule onCreatePolicy={handleCreatePolicy} />;
      case 'admin': return <AdminModule policies={policies} onUploadPolicy={handleUploadPolicyDoc} onUpdateStatus={handleUpdatePolicyStatus} />;
      case 'policyValues': return <PolicyValuesModule policies={policies} />;
      case 'claims': return <ClaimsModule claims={claims} policies={policies} onAddClaim={handleAddClaim} onUpdateClaimStatus={handleUpdateClaimStatus} />;
      case 'premium': 
        return <PremiumModule policies={policies} onProcessPayment={handleProcessPayment} />;
      case 'complaints': return <ComplaintsModule complaints={complaints} policies={policies} onResolveComplaint={handleResolveComplaint} onAddComplaint={handleAddComplaint} />;
      default: return (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-bold">System Overview</h3>
            <p>Welcome to Majeng Life Core Admin.</p>
            {currentUser && <p className="text-sm text-slate-500 mt-2">Logged in as: <strong>{currentUser.username}</strong> ({currentUser.role})</p>}
          </div>
        </div>
      );
    }
  };

  const NavItem = ({ id, label, icon: Icon, allowedRoles }) => {
    // RBAC: Check if current user role is in the list of allowed roles for this tab
    // If no roles specified, assume public/all
    const userRole = currentUser?.role || 'agent'; // default to agent if undefined
    
    // Admin sees everything
    if (userRole === 'admin') {
      return (
        <button onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center p-3 rounded-lg mb-1 ${activeTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Icon className="w-5 h-5 mr-3" /> {label}
        </button>
      );
    }

    // Check specific roles
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return null; // Render nothing if not allowed
    }

    return (
      <button onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center p-3 rounded-lg mb-1 ${activeTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
        <Icon className="w-5 h-5 mr-3" /> {label}
      </button>
    );
  };

  // AUTH CHECK
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r h-full">
        <div className="p-6 border-b"><span className="text-xl font-bold text-slate-800">Majeng Life</span></div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <NavItem id="dashboard" label="Dashboard" icon={Activity} />
          
          <div className="my-4 border-t border-slate-100"></div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Operations</div>
          
          <NavItem id="underwriting" label="Underwriting" icon={Calculator} allowedRoles={['underwriter']} />
          <NavItem id="admin" label="Policy Admin" icon={Users} allowedRoles={['underwriter']} />
          <NavItem id="premium" label="Collections" icon={DollarSign} allowedRoles={['agent']} />
          <NavItem id="policyValues" label="Policy Values" icon={TrendingUp} allowedRoles={['underwriter']} />
          
          <div className="my-4 border-t border-slate-100"></div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Support</div>
          
          <NavItem id="claims" label="Claims" icon={AlertCircle} allowedRoles={['agent']} />
          <NavItem id="complaints" label="Complaints" icon={CheckCircle} allowedRoles={['agent']} />
        </nav>
        <div className="p-4 border-t bg-slate-50">
             <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold uppercase">
                  {currentUser?.username?.substring(0,2) || 'AD'}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{currentUser?.username || 'Admin User'}</p>
                  <p className="text-xs text-slate-500 capitalize">{currentUser?.role || 'System Administrator'}</p>
                  <button onClick={() => setIsLoggedIn(false)} className="text-[10px] text-red-500 mt-1 flex items-center hover:text-red-700">
                      <LogOut className="w-3 h-3 mr-1"/> Sign Out
                  </button>
                </div>
              </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-6xl mx-auto">{renderContent()}</div></main>
      </div>
    </div>
  );
};

export default App;