import React, { useState } from 'react';
import { FileText, Plus, CheckCircle, XCircle, Upload } from 'lucide-react';

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
                <div><h4 className="text-lg font-bold mt-1">R {claim.amount.toLocaleString()} - {claim.claimant}</h4><p className="text-sm text-slate-600">{claim.reason}</p>
                  {/* View Settlement Form Link */}
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

export default ClaimsModule;