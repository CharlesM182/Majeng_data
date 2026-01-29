import React, { useState } from 'react';
import { UserPlus, Save, CheckCircle, Shield, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api';

const UserManagementModule = ({ currentUser }) => {
  const [formData, setFormData] = useState({
    realName: '',
    password: '',
    role: 'agent'
  });
  const [createdUser, setCreatedUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreatedUser(null);
    setLoading(true);
    
    try {
        const res = await fetch(`${API_BASE_URL}/users/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, currentUserId: currentUser.id })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        const data = await res.json();
        setCreatedUser(data); // Returns { username: 'AEO83', realName: '...' }
        setFormData({ realName: '', password: '', role: 'agent' }); // Reset form
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center text-slate-800">
            <UserPlus className="mr-2 text-indigo-600"/> User Management
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <form onSubmit={handleCreate} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-200">
                    <p className="font-bold flex items-center"><Shield className="w-4 h-4 mr-2"/> Admin Access Only</p>
                    <p className="mt-1">Use this form to onboard new staff. The system will automatically generate a secure 5-digit username (3 vowels + 2 numbers).</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">Name and Surname</label>
                    <input 
                        type="text" 
                        className="mt-1 w-full border rounded-md p-2" 
                        placeholder="e.g. John Smith"
                        value={formData.realName}
                        onChange={e => setFormData({...formData, realName: e.target.value})}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">Role</label>
                    <select 
                        className="mt-1 w-full border rounded-md p-2 bg-white"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                        <option value="agent">Agent (Sales & Claims)</option>
                        <option value="underwriter">Underwriter (Policy Approval)</option>
                        <option value="admin">Administrator (Full Access)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">Initial Password</label>
                    <input 
                        type="text" 
                        className="mt-1 w-full border rounded-md p-2" 
                        placeholder="Set temporary password"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required
                    />
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2"/> {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition flex justify-center items-center font-bold"
                >
                    {loading ? 'Generating...' : 'Create User'}
                </button>
            </form>
            
            {/* Success Display */}
            <div className="flex flex-col justify-center">
                {createdUser ? (
                    <div className="bg-green-50 p-8 rounded-lg border border-green-200 text-center shadow-sm animate-in fade-in zoom-in">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-green-800">User Successfully Created!</h3>
                        <div className="my-6">
                            <p className="text-sm text-slate-500 uppercase tracking-wide font-bold">System Generated Username</p>
                            <p className="text-5xl font-mono font-bold text-indigo-600 my-2 tracking-widest">{createdUser.username}</p>
                        </div>
                        <div className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200 inline-block text-left">
                            <p><strong>Name:</strong> {createdUser.realName}</p>
                            <p><strong>Role:</strong> {formData.role}</p> {/* Note: Showing last selected role */}
                        </div>
                        <p className="text-xs text-slate-400 mt-4">Please provide this username to the employee securely.</p>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-lg">
                        <p>User details will appear here</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default UserManagementModule;