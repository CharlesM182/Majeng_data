import React, { useState } from 'react';
import { Users, Archive, Upload, FileText } from 'lucide-react';

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

export default AdminModule;