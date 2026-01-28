import React, { useState } from 'react';
import { Users, Archive, Upload, FileText, X, Plus } from 'lucide-react';

const AdminModule = ({ policies, onUploadPolicy, onUpdateStatus, onFetchDocs }) => {
  // Filter Policies:
  // Active = Not Archived, Settled, or Lapsed
  const activePolicies = policies.filter(p => !['Archived', 'Settled', 'Lapsed'].includes(p.status));
  // Archive = Archived, Settled, or Lapsed
  const archivedPolicies = policies.filter(p => ['Archived', 'Settled', 'Lapsed'].includes(p.status));

  // --- MODAL STATE ---
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [docsList, setDocsList] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Open Modal and Fetch Docs
  const handleOpenDocs = async (policy) => {
    setSelectedPolicy(policy);
    // Fetch docs from API using the prop function passed from App.jsx
    if (onFetchDocs) {
        const docs = await onFetchDocs(policy.id);
        setDocsList(docs || []);
    } else {
        setDocsList([]);
    }
  };

  // Handle New Upload from Modal
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (file && selectedPolicy) {
      setIsUploading(true);
      await onUploadPolicy(selectedPolicy.id, file);
      
      // Refresh list
      if (onFetchDocs) {
        const updatedDocs = await onFetchDocs(selectedPolicy.id);
        setDocsList(updatedDocs);
      }
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ACTIVE POLICIES TABLE */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b"><h2 className="text-xl font-bold flex items-center text-slate-800"><Users className="mr-2 text-indigo-600" /> Active Policy Administration</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs"><tr><th className="p-4">ID</th><th className="p-4">Holder</th><th className="p-4">Coverage</th><th className="p-4">Status</th><th className="p-4">Documents</th></tr></thead>
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
                        <button 
                            onClick={() => handleOpenDocs(policy)}
                            className="flex items-center text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1 rounded hover:bg-slate-50 transition"
                        >
                            <FileText className="w-3 h-3 mr-1" /> 
                            {policy.status === 'Pending Doc' ? 'Upload Required' : 'Manage Docs'}
                        </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ARCHIVE TABLE */}
      <div className="bg-slate-50 rounded-lg shadow-inner overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-100"><h3 className="text-lg font-bold flex items-center text-slate-600"><Archive className="mr-2 w-5 h-5" /> Policy Archive</h3></div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="text-slate-500 uppercase text-xs"><tr><th className="p-3">ID</th><th className="p-3">Holder</th><th className="p-3">Reason</th><th className="p-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-200">{archivedPolicies.map(p => (<tr key={p.id} className="text-slate-500"><td className="p-3 font-mono">{p.id}</td><td className="p-3">{p.name}</td><td className="p-3">{p.reason || 'Terminated'}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${p.status === 'Settled' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>{p.status}</span></td></tr>))}</tbody>
            </table>
        </div>
      </div>

      {/* DOCUMENTS MODAL */}
      {selectedPolicy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-slate-700">Documents: {selectedPolicy.name}</h3>
                          <p className="text-xs text-slate-500">{selectedPolicy.id}</p>
                      </div>
                      <button onClick={() => setSelectedPolicy(null)} className="p-1 hover:bg-slate-200 rounded"><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  
                  <div className="p-4 max-h-[300px] overflow-y-auto bg-slate-50 border-b">
                      {docsList.length === 0 ? (
                          <div className="text-center text-slate-400 py-4 italic">No documents uploaded yet.</div>
                      ) : (
                          <div className="space-y-2">
                              {docsList.map((doc, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200 shadow-sm">
                                      <div className="flex items-center overflow-hidden">
                                          <FileText className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                                          <span className="text-sm truncate text-slate-700">{doc.doc_name}</span>
                                      </div>
                                      <a 
                                        href={doc.doc_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline flex-shrink-0 ml-2"
                                      >
                                          View
                                      </a>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-white">
                      <div className="relative">
                          {isUploading ? (
                              <div className="text-center text-sm text-blue-600 font-bold py-2 animate-pulse">Uploading Document...</div>
                          ) : (
                              <>
                                <input type="file" id="modal-upload" className="hidden" onChange={handleUpload} />
                                <label htmlFor="modal-upload" className="w-full flex items-center justify-center bg-indigo-600 text-white py-2 rounded cursor-pointer hover:bg-indigo-700 transition">
                                    <Plus className="w-4 h-4 mr-2" /> Upload New Document
                                </label>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminModule;