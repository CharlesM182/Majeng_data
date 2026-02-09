import React, { useState, useEffect, useMemo } from 'react';
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
  LogOut, 
  ClipboardList, 
  MessageSquare, 
  Paperclip,
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  X,
  UserPlus // <--- ADDED THIS IMPORT to fix the crash
} from 'lucide-react';
import { jsPDF } from "jspdf";

// --- IMPORT YOUR EXTERNAL MODULES ---
import LoginScreen from './components/LoginScreen'; 
import UnderwritingModule from './components/UnderwritingModule'; 
import PremiumModule from './components/PremiumModule';
import AdminModule from './components/AdminModule';
import ClaimsModule from './components/ClaimsModule';
import PolicyValuesModule from './components/PolicyValuesModule';
import ComplaintsModule from './components/ComplaintsModule';
import AuditLogModule from './components/AuditLogModule';
import UserManagementModule from './components/UserManagementModule';

// --- IMPORT UTILS ---
import { calculateSinglePolicyValue } from './utils/actuarial';
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

// --- MAIN APP COMPONENT ---
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data State
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [complaints, setComplaints] = useState([]);
  
  // App State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 

  // 1. DATA LOADING
  const refreshData = async () => {
    try {
      const [pRes, cRes, tRes, payRes] = await Promise.all([
        fetch(`${API_BASE_URL}/policies`),
        fetch(`${API_BASE_URL}/claims`),
        fetch(`${API_BASE_URL}/complaints`),
        fetch(`${API_BASE_URL}/payments`)
      ]);
      
      const payments = await payRes.json();
      
      setPolicies((await pRes.json()).map(p => {
          const mapped = mapPolicyFromDB(p);
          mapped.paymentHistory = payments
              .filter(pay => pay.policy_id === p.policy_number)
              .map(pay => ({ 
                  date: pay.payment_date ? pay.payment_date.split('T')[0] : '', 
                  amount: pay.amount 
              }));
          return mapped;
      }));

      setClaims((await cRes.json()).map(mapClaimFromDB));
      
      const rawComplaints = await tRes.json();
      setComplaints(rawComplaints.map(t => ({
          ...mapComplaintFromDB(t),
          comments: t.comments 
      })));

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

  // --- 2. DASHBOARD STATS CALCULATION ---
  const dashboardStats = useMemo(() => {
    const activePolicies = policies.filter(p => p.status === 'Active');
    const pendingClaims = claims.filter(c => c.status === 'Pending');
    const currentYear = new Date().getFullYear();

    const stats = {
      activeCount: activePolicies.length,
      pendingClaimsCount: pendingClaims.length,
      totalInsuredValue: 0,
      currentReserve: 0
    };

    activePolicies.forEach(policy => {
      // 1. Sum Assured
      stats.totalInsuredValue += (parseFloat(policy.coverage) || 0);

      // 2. Reserve Calculation
      // Only calculate if inception date is valid
      if (policy.inceptionDate) {
          const inceptionYear = new Date(policy.inceptionDate).getFullYear();
          const duration = Math.max(0, currentYear - inceptionYear);
          const reserve = calculateSinglePolicyValue(policy, duration);
          stats.currentReserve += (reserve || 0);
      }
    });

    return stats;
  }, [policies, claims]);

  // --- 3. HANDLERS ---

  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setCurrentUser(userData);
    setActiveTab('dashboard'); 
  };

  const handleCreatePolicy = async (policy) => {
    try {
      await fetch(`${API_BASE_URL}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...policy, userId: currentUser?.id })
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
            body: JSON.stringify({ status: newStatus, userId: currentUser?.id })
        });
        refreshData();
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
  };

  const handleFetchPolicyDocuments = async (policyId) => {
      try {
          const res = await fetch(`${API_BASE_URL}/policies/${policyId}/documents`);
          if (res.ok) {
              return await res.json();
          }
      } catch (e) {
          console.error("Error fetching docs", e);
      }
      return [];
  };

  const handleUploadPolicyDoc = async (id, file) => {
    if (!file) return;
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', currentUser?.id); 
        
        await fetch(`${API_BASE_URL}/policies/${id}/documents`, { method: 'POST', body: formData });
        
        refreshData();
    } catch(e) {
        console.error(e);
        alert("Error uploading document: " + e.message);
    }
  };

  const handleProcessPayment = async (id, amount, date) => {
    const policy = policies.find(p => p.id === id);
    if (!policy) return;

    const nextDate = calculateNextDueDate(policy.inceptionDate, policy.paidUntil);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    try {
        await fetch(`${API_BASE_URL}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                policyId: id, 
                amount: amount, 
                date: date, 
                userId: currentUser?.id 
            }) 
        });

        await fetch(`${API_BASE_URL}/policies/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paid_until: nextDateStr, userId: currentUser?.id })
        });
        
        alert(`Payment of R${amount} Recorded.\nNew Paid Until Date: ${nextDateStr}`);
        refreshData();

    } catch (e) {
        alert("Error processing payment: " + e.message);
    }
  };

  const handleAddClaim = async (claim) => {
    await fetch(`${API_BASE_URL}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...claim, userId: currentUser?.id })
    });
    refreshData();
  };

  const handleAddComplaint = async (complaint) => {
    await fetch(`${API_BASE_URL}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...complaint, userId: currentUser?.id })
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

    const payload = { status, userId: currentUser?.id };
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
             const policy = policies.find(p => p.id === claim.policyId);
             
             await fetch(`${API_BASE_URL}/policies/${claim.policyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'Settled', 
                    policy_doc_url: policy?.policyDocumentUrl, 
                    userId: currentUser?.id 
                })
            });
        }
    }
    refreshData();
  };

  const handleUpdateComplaint = async (id, updates, file) => {
      let fileUrl = null;
      if (file) {
          const formData = new FormData();
          formData.append('file', file);
          try {
              const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
              const data = await res.json();
              fileUrl = data.url;
          } catch (e) { alert("File upload failed"); return; }
      }

      let finalComments = updates.existingComments || "";
      if (updates.newComment || fileUrl) {
          const timestamp = new Date().toLocaleString();
          const author = currentUser?.username || 'Unknown';
          let entry = `\n[${timestamp}] ${author}: ${updates.newComment || ''}`;
          if (fileUrl) entry += ` (Attachment: ${fileUrl})`;
          finalComments += entry;
      }

      const payload = { 
          status: updates.status, 
          comments: finalComments, 
          userId: currentUser?.id 
      };

      try {
        await fetch(`${API_BASE_URL}/complaints/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await refreshData(); 
        return true; 
      } catch(e) {
        return false;
      }
  };

  // --- 4. RENDER CONTENT ---
  const renderContent = () => {
    switch (activeTab) {
      case 'underwriting': 
        return <UnderwritingModule onCreatePolicy={handleCreatePolicy} />;
      case 'admin': 
        return <AdminModule 
            policies={policies} 
            onUploadPolicy={handleUploadPolicyDoc} 
            onUpdateStatus={handleUpdatePolicyStatus} 
            onFetchDocs={handleFetchPolicyDocuments} 
        />;
      case 'policyValues': return <PolicyValuesModule policies={policies} />;
      case 'claims': return <ClaimsModule claims={claims} policies={policies} onAddClaim={handleAddClaim} onUpdateClaimStatus={handleUpdateClaimStatus} />;
      case 'premium': 
        return <PremiumModule policies={policies} onProcessPayment={handleProcessPayment} />;
      case 'complaints': 
        return <ComplaintsModule 
            complaints={complaints} 
            policies={policies} 
            onUpdateComplaint={handleUpdateComplaint} 
            onAddComplaint={handleAddComplaint} 
            currentUser={currentUser}
        />;
      case 'audit': return <AuditLogModule />;
      case 'users': return <UserManagementModule currentUser={currentUser} />;
      default: return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-1">System Dashboard</h3>
            {currentUser && <p className="text-sm text-slate-500">Welcome, <strong>{currentUser.username}</strong> ({currentUser.role})</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. Active Policies */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                    <p className="text-slate-500 uppercase text-xs font-bold tracking-wider mb-2">Active Policies</p>
                    <div className="text-4xl font-bold text-slate-800">{dashboardStats.activeCount}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-green-600 text-sm font-medium">
                    <Users className="w-4 h-4 mr-1"/> Portfolio Count
                </div>
            </div>

            {/* 2. Claims Outstanding */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                    <p className="text-slate-500 uppercase text-xs font-bold tracking-wider mb-2">Outstanding Claims</p>
                    <div className="text-4xl font-bold text-red-600">{dashboardStats.pendingClaimsCount}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-red-500 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 mr-1"/> Action Required
                </div>
            </div>

            {/* 3. Total Insured Value */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                    <p className="text-slate-500 uppercase text-xs font-bold tracking-wider mb-2">Total Sum Assured</p>
                    <div className="text-2xl font-bold text-slate-800">R {dashboardStats.totalInsuredValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-blue-600 text-sm font-medium">
                    <Shield className="w-4 h-4 mr-1"/> Total Risk Exposure
                </div>
            </div>

             {/* 4. Current Reserve */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                    <p className="text-slate-500 uppercase text-xs font-bold tracking-wider mb-2">Current Reserve</p>
                    <div className={`text-2xl font-bold ${dashboardStats.currentReserve >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        R {dashboardStats.currentReserve.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-slate-500 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 mr-1"/> Actuarial Valuation
                </div>
            </div>

          </div>
        </div>
      );
    }
  };

  const NavItem = ({ id, label, icon: Icon, allowedRoles }) => {
    const userRole = currentUser?.role || 'agent'; 
    if (userRole === 'admin') {
      return (
        <button onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center p-3 rounded-lg mb-1 ${activeTab === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Icon className="w-5 h-5 mr-3" /> {label}
        </button>
      );
    }
    if (allowedRoles && !allowedRoles.includes(userRole)) return null;

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
          
          <NavItem id="underwriting" label="Underwriting" icon={Calculator} allowedRoles={['underwriter', 'agent']} />
          <NavItem id="admin" label="Policy Admin" icon={Users} allowedRoles={['underwriter', 'agent']} />
          <NavItem id="premium" label="Collections" icon={DollarSign} allowedRoles={['agent', 'underwriter']} />
          <NavItem id="policyValues" label="Policy Values" icon={TrendingUp} allowedRoles={['underwriter', 'agent']} />
          
          <div className="my-4 border-t border-slate-100"></div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Support</div>
          
          <NavItem id="claims" label="Claims" icon={AlertCircle} allowedRoles={['agent', 'underwriter']} />
          <NavItem id="complaints" label="Complaints" icon={CheckCircle} allowedRoles={['agent', 'underwriter']} />
          
          <div className="my-4 border-t border-slate-100"></div>
          <NavItem id="audit" label="Audit Logs" icon={ClipboardList} allowedRoles={['admin']} />
          <NavItem id="users" label="User Management" icon={UserPlus} allowedRoles={['admin']} />
        </nav>
        <div className="p-4 border-t bg-slate-50">
             <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold uppercase">
                  {currentUser?.username?.substring(0,3) || 'USR'}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{currentUser?.realName || currentUser?.username || 'Admin User'}</p>
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