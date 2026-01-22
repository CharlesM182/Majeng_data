import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, MessageSquare, X, Paperclip, FileText } from 'lucide-react';

// --- UPDATED COMPLAINTS MODULE (Safe Render) ---
const ComplaintsModule = ({ complaints, policies, onUpdateComplaint, onAddComplaint, currentUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ policyId: '', subject: '', priority: 'Low' });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [commentFile, setCommentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to parse text and make "Attachment: URL" clickable
  const renderCommentWithLinks = (text) => {
    if (!text) return <span className="text-slate-400 italic">No comments yet.</span>;
    if (typeof text !== 'string') return <span className="text-slate-400 italic">Invalid comment format.</span>;

    // Split by newlines to handle the log format
    return text.split('\n').filter(line => line.trim() !== '').map((line, index) => {
      // Check for attachment pattern
      const attachmentMatch = line.match(/\(Attachment: (https?:\/\/[^\s)]+)\)/);
      
      if (attachmentMatch) {
        const url = attachmentMatch[1];
        const textPart = line.replace(attachmentMatch[0], '').trim();
        return (
          <div key={index} className="mb-2 p-2 bg-white rounded border border-slate-100">
            <div className="text-slate-800">{textPart}</div>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium bg-blue-50 px-2 py-1 rounded"
            >
              <Paperclip className="w-3 h-3 mr-1"/> View Attached Document
            </a>
          </div>
        );
      }
      return <div key={index} className="mb-2 text-slate-700 border-b border-slate-100 pb-1 last:border-0">{line}</div>;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const policy = policies.find(p => p.id === newComplaint.policyId);
    onAddComplaint({ 
        policyId: newComplaint.policyId, 
        customer: policy ? policy.name : 'Unknown', 
        subject: newComplaint.subject, 
        status: 'Open', 
        priority: newComplaint.priority, 
        date: new Date().toISOString().split('T')[0] 
    });
    setNewComplaint({ policyId: '', subject: '', priority: 'Low' }); 
    setShowForm(false);
  };

  const handleAddComment = async () => {
    if(!newComment && !commentFile) return;
    setIsSubmitting(true);

    const success = await onUpdateComplaint(selectedTicket.id, { 
        status: selectedTicket.status, 
        newComment: newComment,
        existingComments: selectedTicket.comments 
    }, commentFile);

    setIsSubmitting(false);

    if (success) {
        setNewComment('');
        setCommentFile(null);
    }
  };

  // Sync selectedTicket with the latest data from props when props change
  useEffect(() => {
    if (selectedTicket) {
        const updatedTicket = complaints.find(t => t.id === selectedTicket.id);
        if (updatedTicket) setSelectedTicket(updatedTicket);
    }
  }, [complaints]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center text-slate-800">
          <AlertCircle className="mr-2 text-orange-600" /> Complaints
        </h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> New Complaint
        </button>
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-orange-100 animation-fade-in">
           <h3 className="font-bold mb-4 text-slate-800">Log New Complaint</h3>
           <div className="flex gap-4 items-end">
             <div className="flex-1">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Policy ID</label>
               <input placeholder="e.g. POL-8821" className="w-full border p-2 rounded" value={newComplaint.policyId} onChange={e => setNewComplaint({...newComplaint, policyId: e.target.value})} required />
             </div>
             <div className="flex-[2]">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
               <input placeholder="Issue description" className="w-full border p-2 rounded" value={newComplaint.subject} onChange={e => setNewComplaint({...newComplaint, subject: e.target.value})} required />
             </div>
             <div className="flex-1">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
               <select className="w-full border p-2 rounded bg-white" value={newComplaint.priority} onChange={e => setNewComplaint({...newComplaint, priority: e.target.value})}>
                 <option value="Low">Low</option>
                 <option value="Medium">Medium</option>
                 <option value="High">High</option>
               </select>
             </div>
             <button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-700">Log</button>
           </div>
        </form>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs font-bold">
                <tr><th className="p-4">Customer</th><th className="p-4">Issue</th><th className="p-4">Status</th><th className="p-4">Comments</th><th className="p-4">Action</th></tr>
            </thead>
            <tbody className="divide-y">
                {complaints.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{ticket.customer}</td>
                    <td className="p-4 text-slate-600">{ticket.subject}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{ticket.status}</span></td>
                    <td className="p-4">
                        <button onClick={() => setSelectedTicket(ticket)} className="text-xs bg-white text-slate-600 px-3 py-1.5 rounded flex items-center border border-slate-300 hover:bg-slate-50 shadow-sm transition">
                             <MessageSquare className="w-3 h-3 mr-1"/> {ticket.comments ? 'View/Edit' : 'Add Comment'}
                        </button>
                    </td>
                    <td className="p-4">{ticket.status !== 'Resolved' && (<button onClick={() => onUpdateComplaint(ticket.id, {status: 'Resolved'})} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 shadow-sm">Resolve</button>)}</td>
                </tr>
            ))}
            </tbody>
        </table>
      </div>

      {/* COMMENT MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center"><FileText className="w-4 h-4 mr-2"/> Ticket: {selectedTicket.id}</h3>
                        <p className="text-xs text-slate-500">{selectedTicket.subject} - {selectedTicket.customer}</p>
                    </div>
                    <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-slate-200 rounded"><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                {/* Scrollable Comment History */}
                <div className="p-4 overflow-y-auto flex-grow bg-slate-50 text-xs font-mono border-b border-t text-slate-600">
                    {renderCommentWithLinks(selectedTicket.comments)}
                </div>

                {/* Input Area */}
                <div className="p-4 space-y-3 bg-white flex-shrink-0">
                    <textarea 
                        className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                        rows="3" 
                        placeholder="Type a new comment here..." 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                         <div className="flex items-center">
                             <input type="file" id="commentFile" className="hidden" onChange={(e) => setCommentFile(e.target.files[0])} />
                             <label htmlFor="commentFile" className={`flex items-center text-xs cursor-pointer hover:text-blue-800 font-medium px-2 py-1 rounded ${commentFile ? 'bg-blue-100 text-blue-800' : 'text-blue-600'}`}>
                                <Paperclip className="w-3 h-3 mr-1"/> {commentFile ? commentFile.name : "Attach Document"}
                             </label>
                         </div>
                         <button 
                            onClick={handleAddComment} 
                            disabled={isSubmitting || (!newComment && !commentFile)}
                            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 shadow-sm disabled:opacity-50"
                        >
                             {isSubmitting ? 'Saving...' : 'Add Entry'}
                         </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsModule;