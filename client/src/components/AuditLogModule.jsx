// --- AUDIT LOG MODULE ---

import React, { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api';

const AuditLogModule = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/audit-logs`);
        if (response.ok) {
          const data = await response.json();
          setLogs(data);
        }
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center text-slate-800">
          <ClipboardList className="mr-2 text-indigo-600" /> System Audit Logs
        </h2>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs font-bold">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">User</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                 <tr><td colSpan="3" className="p-6 text-center text-slate-500">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                 <tr><td colSpan="3" className="p-6 text-center text-slate-500">No activity recorded.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 font-medium text-slate-800">{log.username || `User #${log.user_id}`}</td>
                    <td className="p-4 text-slate-600">{log.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogModule;