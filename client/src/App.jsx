import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, FileText, DollarSign, AlertCircle, CheckCircle, 
  XCircle, Activity, Plus, Calculator, TrendingUp, Archive, Upload, 
  RefreshCw, Lock, LogOut, ClipboardList, MessageSquare, Paperclip,
  ArrowUpRight, ArrowDownLeft, Calendar, X, QrCode 
} from 'lucide-react';
import { jsPDF } from "jspdf";


import UnderwritingModule from './components/UnderwritingModule'; 
import AuditLogModule from './components/AuditLogModule';
import PremiumModule from './components/PremiumModule';
import PolicyValuesModule from './components/PolicyValuesModule';
import AdminModule from './components/AdminModule';
import ClaimsModule from './components/ClaimsModule';
import ComplaintsModule from './components/ComplaintsModule';
import LoginScreen from './components/LoginScreen';

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

// ==========================================
//                 UTILS
// ==========================================


// ==========================================
//              MODULE COMPONENTS
// ==========================================



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
      const [pRes, cRes, tRes, payRes] = await Promise.all([
        fetch(`${API_BASE_URL}/policies`),
        fetch(`${API_BASE_URL}/claims`),
        fetch(`${API_BASE_URL}/complaints`),
        fetch(`${API_BASE_URL}/payments`)
      ]);
      
      const payments = await payRes.json();
      
      // Map Policies and inject payment history
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
      
      // Map Complaints and include comments
      const rawComplaints = await tRes.json();
      setComplaints(rawComplaints.map(t => ({
          ...mapComplaintFromDB(t),
          comments: t.comments // Ensure this passes through if DB has it
      })));

    } catch (err) {
      console.error("Failed to fetch data.", err);
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
            body: JSON.stringify({ status: 'Active', policy_doc_url: url, userId: currentUser?.id })
        });
        
        alert("Policy Activated and Document Saved Securely!");
        refreshData();
    } catch(e) {
        console.error(e);
        alert("Error uploading document: " + e.message);
    }
  };

  // PAYMENT HANDLER
  const handleProcessPayment = async (id, amount, date) => {
    const policy = policies.find(p => p.id === id);
    if (!policy) return;

    // 1. Record the Payment in the Payments Table
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

        // 2. Advance the 'Paid Until' Date on the Policy
        const nextDate = calculateNextDueDate(policy.inceptionDate, policy.paidUntil);
        const nextDateStr = nextDate.toISOString().split('T')[0];

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

  // UPDATED: Set Policy to 'Settled' when claim approved
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
             // SET STATUS TO SETTLED (Moves to Archive)
             await fetch(`${API_BASE_URL}/policies/${claim.policyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Settled', userId: currentUser?.id })
            });
        }
    }
    refreshData();
  };

  // UPDATED: Handle Complaint Updates (Comments & Status)
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

      // Logic to append new comment to existing ones
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
      case 'complaints': 
        return <ComplaintsModule 
            complaints={complaints} 
            policies={policies} 
            onUpdateComplaint={handleUpdateComplaint} 
            onAddComplaint={handleAddComplaint} 
            currentUser={currentUser}
        />;
      case 'audit': return <AuditLogModule />;
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
          
          <NavItem id="underwriting" label="Underwriting" icon={Calculator} allowedRoles={['underwriter']} />
          <NavItem id="admin" label="Policy Admin" icon={Users} allowedRoles={['underwriter']} />
          <NavItem id="premium" label="Collections" icon={DollarSign} allowedRoles={['agent']} />
          <NavItem id="policyValues" label="Policy Values" icon={TrendingUp} allowedRoles={['underwriter']} />
          
          <div className="my-4 border-t border-slate-100"></div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Support</div>
          
          <NavItem id="claims" label="Claims" icon={AlertCircle} allowedRoles={['agent']} />
          <NavItem id="complaints" label="Complaints" icon={CheckCircle} allowedRoles={['agent']} />
          
          <div className="my-4 border-t border-slate-100"></div>
          <NavItem id="audit" label="Audit Logs" icon={ClipboardList} allowedRoles={['admin']} />
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