import React, { useState } from 'react';
import { FileText, Plus, CheckCircle, XCircle, Upload, Clock } from 'lucide-react';

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
    
    // Validation: Cannot file claim on inactive/archived policies
    if (['Archived', 'Settled', 'Lapsed'].includes(policy.status)) { 
        alert(`Policy is ${policy.status}. Cannot file claim.`); 
        return; 
    }
    if (policy.status === 'Pending Doc') { 
        alert("Policy is not active yet (Pending Documents)."); 
        return; 
    }

    onAddClaim({ 
        policyId: newClaim.policyId, 
        claimant: policy.name, 
        amount: policy.coverage, 
        date: new Date().toISOString().split('T')[0], 
        status: 'Pending', 
        reason: 'Death of Insured' 
    });
    setNewClaim({ policyId: '' }); 
    setShowForm(false);
  };

  const handleSettlementUpload = async (e, id) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      // Upload file immediately to get URL, passing 'File_Upload' as a special status or handling it inside App.jsx
      // The parent handler in App.jsx handles the upload logic when a file is passed
      await onUpdateClaimStatus(id, 'File_Upload', null, file);
      setUploading(false);
      setHasUploadedForm(true);
  };

  const initiateAction = (id, type) => {
    setActionClaimId(id); 
    setActionType(type); 
    setRejectReason(''); 
    setHasUploadedForm(false);
  };

  const handleConfirmAction = (id) => {
    onUpdateClaimStatus(id, actionType === 'Approve' ? 'Approved' : 'Rejected', rejectReason);
    setActionClaimId(null); 
    setActionType(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center text-slate-800">
            <FileText className="mr-2 text-red-600" /> Claims Processing
        </h2>
        <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center shadow-sm"
        >
            <Plus className="w-4 h-4 mr-2" /> New Claim
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-red-100 animation-fade-in">
            <h3 className="font-bold mb-4 text-slate-800">File New Claim</h3>
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Policy ID</label>
                    <input 
                        placeholder="Policy ID" 
                        className="w-full border p-2 rounded" 
                        value={newClaim.policyId} 
                        onChange={e => setNewClaim({...newClaim, policyId: e.target.value})} 
                        required 
                    />
                </div>
                <button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded">Submit</button>
            </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {claims.map(claim => (
          <div key={claim.id} className="bg-white rounded-lg shadow-sm border-l-4 border-l-indigo-500 overflow-hidden">
            <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold mt-1 text-slate-800">
                            R {claim.amount.toLocaleString()} - {claim.claimant}
                        </h4>
                    </div>

                    {/* TIMESTAMPS DISPLAY */}
                    <div className="text-[10px] text-slate-400 flex flex-col mt-1 space-y-1">
                        <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1"/> Recorded: {claim.recordedAt}
                        </span>
                        {claim.resolvedAt && (
                            <span className="flex items-center text-indigo-600 font-medium">
                                <CheckCircle className="w-3 h-3 mr-1"/> Finalized: {claim.resolvedAt}
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-slate-600 mt-2">{claim.reason}</p>
                    
                    {/* View Settlement Form Link */}
                    {claim.settlementFormUrl && (
                        <a 
                          href={claim.settlementFormUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium mt-1 bg-blue-50 px-2 py-1 rounded"
                        >
                          <FileText className="w-3 h-3 mr-1" /> View Settlement Form
                        </a>
                    )}
                </div>

                <div className="mt-4 md:mt-0 flex items-center space-x-3">
                    {claim.status === 'Pending' ? (
                        <>
                            <button onClick={() => initiateAction(claim.id, 'Approve')} className="text-green-600 hover:bg-green-50 p-1 rounded transition">
                                <CheckCircle className="w-6 h-6" />
                            </button>
                            <button onClick={() => initiateAction(claim.id, 'Reject')} className="text-red-600 hover:bg-red-50 p-1 rounded transition">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </>
                    ) : (
                        <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                            claim.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            {claim.status}
                        </span>
                    )}
                </div>
            </div>

            {/* ACTION PANEL (Approve/Reject) */}
            {actionClaimId === claim.id && claim.status === 'Pending' && (
                <div className="bg-slate-50 border-t p-4 animation-fade-in">
                    {actionType === 'Approve' && (
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-bold text-slate-700">Required: Upload Settlement Form</p>
                            <div className="flex gap-4 items-center">
                                {uploading ? (
                                    <span className="text-sm text-blue-600 animate-pulse font-medium">Uploading Form...</span>
                                ) : (
                                    <>
                                        <input 
                                            type="file" 
                                            id={`settle-${claim.id}`} 
                                            className="hidden" 
                                            onChange={(e) => handleSettlementUpload(e, claim.id)} 
                                        />
                                        <label 
                                            htmlFor={`settle-${claim.id}`} 
                                            className={`flex items-center px-4 py-2 rounded text-sm border cursor-pointer transition ${
                                                hasUploadedForm 
                                                ? 'bg-green-100 text-green-700 border-green-300 font-medium' 
                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Upload className="w-4 h-4 mr-2" /> 
                                            {hasUploadedForm ? 'Form Uploaded' : 'Select File'}
                                        </label>
                                    </>
                                )}
                                <button 
                                    onClick={() => handleConfirmAction(claim.id)} 
                                    disabled={!hasUploadedForm} 
                                    className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-green-700 transition shadow-sm font-medium"
                                >
                                    Confirm Approval
                                </button>
                            </div>
                        </div>
                    )}
                    {actionType === 'Reject' && (
                        <div className="flex gap-4 items-center">
                            <input 
                                type="text" 
                                placeholder="Reason for rejection..." 
                                className="flex-1 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-red-500" 
                                value={rejectReason} 
                                onChange={(e) => setRejectReason(e.target.value)} 
                            />
                            <button 
                                onClick={() => handleConfirmAction(claim.id)} 
                                disabled={!rejectReason.trim()} 
                                className="bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-red-700 transition shadow-sm font-medium"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    )}
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClaimsModule;