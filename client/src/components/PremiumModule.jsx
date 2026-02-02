import React, { useState } from 'react';
import { Search, DollarSign, FileText, CheckCircle, X, ArrowUpRight, ArrowDownLeft, Calendar, FileSpreadsheet, Download } from 'lucide-react';
import { calculateNextDueDate, generateAccountStatement, generateMonthlyStatement } from '../utils/paymentLogic';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Changed import style

const PremiumModule = ({ policies, onProcessPayment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Modals & Views
  const [statementPolicy, setStatementPolicy] = useState(null); // Full History View
  const [monthlyPolicy, setMonthlyPolicy] = useState(null); // Monthly Statement View
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentPolicy, setPaymentPolicy] = useState(null);
  
  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  // Month Picker State (Default to current month YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Filter Active Policies
  const activePolicies = policies.filter(p => p.status === 'Active');
  
  const filteredPolicies = activePolicies.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.idNumber && p.idNumber.includes(searchTerm))
  );

  // --- HANDLERS ---

  const openPaymentModal = (policy) => {
      setPaymentPolicy(policy);
      setPaymentAmount(policy.premium); // Default to standard premium
      setPaymentDate(new Date().toISOString().split('T')[0]); // Default to today
      setPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
      if (!paymentPolicy || !paymentAmount || !paymentDate) return;
      
      // Pass the specific details to the parent handler
      onProcessPayment(paymentPolicy.id, parseFloat(paymentAmount), paymentDate);
      
      setPaymentModalOpen(false);
      setPaymentPolicy(null);
  };

  // --- PDF GENERATOR ---
  const downloadPdf = async (title, data, policy, extraDetails = {}) => {
    const doc = new jsPDF();

    // 1. Add Logo (Async load)
    try {
        const img = new Image();
        img.src = '/logo.png'; // Looks for logo.png in public folder of client
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        // Add image at top-left: x=14, y=10, w=50, h=30 (approx)
        doc.addImage(img, 'PNG', 14, 10, 50, 30);
    } catch (e) {
        console.warn("Logo not loaded - continuing without it");
    }

    // 2. Header Information
    doc.setFontSize(22);
    doc.setTextColor(22, 163, 74); // Green color
    doc.text("Majeng Life", 195, 20, null, null, "right");
    
    doc.setFontSize(16);
    doc.setTextColor(80);
    doc.text(title, 195, 30, null, null, "right");

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 195, 38, null, null, "right");

    // 3. Policy Details
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Policy Holder: ${policy.name}`, 14, 50);
    doc.text(`Policy Number: ${policy.id}`, 14, 56);
    
    let startY = 65;
    
    // Add specific monthly details if present
    if (extraDetails.monthName) {
        doc.text(`Statement Period: ${extraDetails.monthName}`, 14, 62);
        
        // Opening Balance Box
        doc.setFillColor(241, 245, 249);
        doc.rect(14, 68, 180, 10, 'F');
        doc.setFont("helvetica", "bold");
        doc.text(`Opening Balance: R ${extraDetails.openingBalance.toFixed(2)}`, 20, 75);
        startY = 85;
    }

    // 4. Table Generation
    const tableColumn = ["Date", "Description", "Debit (-)", "Credit (+)", "Balance"];
    const tableRows = [];

    data.forEach(row => {
        const debit = !row.isCredit ? `R ${Math.abs(row.amount).toFixed(2)}` : "-";
        const credit = row.isCredit ? `R ${Math.abs(row.amount).toFixed(2)}` : "-";
        const balance = `R ${row.balance.toFixed(2)}`;
        
        tableRows.push([
            row.date,
            row.description,
            debit,
            credit,
            balance
        ]);
    });

    // FIX: Call autoTable directly as a function
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] }, // Matches Majeng green
    });

    // 5. Closing Balance (For Monthly Statements)
    if (extraDetails.closingBalance !== undefined) {
        // Use doc.lastAutoTable.finalY to find where the table ended
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, finalY, 180, 10, 'F');
        doc.setFont("helvetica", "bold");
        doc.text(`Closing Balance: R ${extraDetails.closingBalance.toFixed(2)}`, 20, finalY + 7);
    }

    // 6. Save
    doc.save(`${title.replace(/\s/g, '_')}_${policy.name}.pdf`);
  };

  // --- DATA GENERATION ---
  const fullStatementData = statementPolicy ? generateAccountStatement(statementPolicy) : [];
  
  const monthlyData = monthlyPolicy 
    ? generateMonthlyStatement(monthlyPolicy, selectedMonth ? new Date(selectedMonth + "-01") : new Date()) 
    : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center text-slate-800">
          <DollarSign className="mr-2 text-green-600" /> Premium Management
        </h2>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-6 rounded-lg shadow-sm flex gap-4 items-center">
        <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text" 
              className="w-full border rounded-md p-2 pl-10" 
              placeholder="Search by Policy Number, Name, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="text-sm text-slate-500 font-medium">
            {filteredPolicies.length} Active Policies
        </div>
      </div>

      {/* POLICY LIST TABLE */}
      {!statementPolicy && !monthlyPolicy && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-slate-600 uppercase text-xs font-bold">
                <tr>
                  <th className="p-4">Policy ID</th>
                  <th className="p-4">Holder</th>
                  <th className="p-4">Premium</th>
                  <th className="p-4">Paid Until</th>
                  <th className="p-4">Next Due</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPolicies.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">No active policies found matching your search.</td></tr>
                ) : (
                    filteredPolicies.map(policy => {
                        const nextDue = calculateNextDueDate(policy.inceptionDate, policy.paidUntil);
                        const isOverdue = nextDue < new Date();
                        
                        return (
                            <tr key={policy.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-mono text-xs text-slate-500">{policy.id}</td>
                                <td className="p-4 font-medium text-slate-800">{policy.name}</td>
                                <td className="p-4 font-bold text-slate-700">R {policy.premium}</td>
                                <td className="p-4 text-slate-600">{policy.paidUntil || policy.inceptionDate}</td>
                                <td className={`p-4 font-mono font-bold ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                                    {nextDue.toISOString().split('T')[0]}
                                </td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button 
                                        onClick={() => openPaymentModal(policy)}
                                        className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 flex items-center shadow-sm"
                                        title="Pay"
                                    >
                                        <DollarSign className="w-3 h-3 mr-1" /> Pay
                                    </button>
                                    <button 
                                        onClick={() => { setMonthlyPolicy(policy); setSelectedMonth(new Date().toISOString().slice(0, 7)); }}
                                        className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded text-xs hover:bg-blue-100 flex items-center shadow-sm"
                                        title="Monthly Statement"
                                    >
                                        <FileSpreadsheet className="w-3 h-3 mr-1" /> Month Stmt
                                    </button>
                                    <button 
                                        onClick={() => setStatementPolicy(policy)}
                                        className="bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded text-xs hover:bg-slate-50 flex items-center shadow-sm"
                                        title="Full History"
                                    >
                                        <FileText className="w-3 h-3 mr-1" /> History
                                    </button>
                                </td>
                            </tr>
                        );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paymentModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b bg-green-50 flex justify-between items-center">
                      <h3 className="font-bold text-green-800 flex items-center"><DollarSign className="w-4 h-4 mr-2"/> Capture Payment</h3>
                      <button onClick={() => setPaymentModalOpen(false)}><X className="w-5 h-5 text-green-600 hover:text-green-800"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Date</label>
                          <div className="relative">
                            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input 
                                type="date" 
                                className="w-full border rounded p-2 pl-10"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                            />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount (R)</label>
                          <input 
                              type="number" 
                              className="w-full border rounded p-2 text-lg font-bold text-green-700"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                      </div>
                      <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 border border-slate-100">
                          Recording payment for <strong>{paymentPolicy?.name}</strong> ({paymentPolicy?.id}). <br/>
                          Standard premium is R {paymentPolicy?.premium}.
                      </div>
                      <button 
                          onClick={handleConfirmPayment}
                          className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 font-bold shadow-sm transition-colors"
                      >
                          Confirm Payment
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* FULL HISTORY VIEW */}
      {statementPolicy && (
        <div className="bg-white rounded-lg shadow-lg border border-indigo-100 overflow-hidden animation-fade-in">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-indigo-900 flex items-center">
                        <FileText className="w-4 h-4 mr-2"/> Full Transaction History: {statementPolicy.name}
                    </h3>
                    <p className="text-xs text-indigo-700 mt-1">Policy: {statementPolicy.id} | Monthly Premium: R {statementPolicy.premium}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => downloadPdf("Full Account Statement", fullStatementData, statementPolicy)}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center text-xs font-bold mr-4"
                    >
                        <Download className="w-4 h-4 mr-1"/> Download PDF
                    </button>
                    <button onClick={() => setStatementPolicy(null)} className="text-indigo-400 hover:text-indigo-700 p-1"><X className="w-5 h-5" /></button>
                </div>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b sticky top-0 z-10">
                        <tr>
                            <th className="p-3 w-32">Date</th>
                            <th className="p-3">Description</th>
                            <th className="p-3 text-right">Debit / Credit</th>
                            <th className="p-3 text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {fullStatementData.map((row, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-600 text-xs">{row.date}</td>
                                <td className="p-3 text-slate-700 flex items-center">
                                    {row.isCredit ? <ArrowDownLeft className="w-3 h-3 text-green-500 mr-2"/> : <ArrowUpRight className="w-3 h-3 text-orange-500 mr-2"/>}
                                    {row.description}
                                </td>
                                <td className={`p-3 text-right font-medium ${row.isCredit ? 'text-green-600' : 'text-orange-600'}`}>
                                    {row.isCredit ? '-' : ''} R {Math.abs(row.amount).toFixed(2)}
                                </td>
                                <td className={`p-3 text-right font-bold ${row.balance > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                    R {row.balance.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end">
                <button 
                    onClick={() => setStatementPolicy(null)}
                    className="text-sm text-slate-500 hover:text-slate-800 underline"
                >
                    Close
                </button>
            </div>
        </div>
      )}

      {/* MONTHLY STATEMENT VIEW */}
      {monthlyPolicy && monthlyData && (
        <div className="bg-white rounded-lg shadow-lg border border-blue-200 overflow-hidden animation-fade-in">
             <div className="p-6 border-b bg-blue-50 flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-bold text-blue-900">Monthly Statement</h2>
                    <p className="text-blue-700">{monthlyData.monthName}</p>
                    <p className="text-sm text-slate-500 mt-1">{monthlyPolicy.name} ({monthlyPolicy.id})</p>
                 </div>
                 <div className="flex gap-2">
                    <button 
                        onClick={() => downloadPdf("Monthly Statement", monthlyData.activities, monthlyPolicy, { 
                            monthName: monthlyData.monthName,
                            openingBalance: monthlyData.openingBalance,
                            closingBalance: monthlyData.closingBalance
                        })}
                        className="bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded text-xs hover:bg-blue-50 flex items-center shadow-sm font-bold mr-2"
                    >
                        <Download className="w-4 h-4 mr-2"/> Download PDF
                    </button>
                    <button onClick={() => setMonthlyPolicy(null)} className="text-blue-400 hover:text-blue-700 p-1"><X className="w-6 h-6" /></button>
                 </div>
             </div>

             <div className="p-6">
                {/* Month Picker Control */}
                <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded border border-blue-100 shadow-sm w-fit">
                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wide">Select Period:</label>
                    <input 
                        type="month" 
                        className="border rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                </div>

                {/* Opening Balance */}
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded mb-4 border border-slate-100">
                    <span className="font-bold text-slate-600">Opening Balance</span>
                    <span className={`font-mono font-bold ${monthlyData.openingBalance > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        R {monthlyData.openingBalance.toFixed(2)}
                    </span>
                </div>

                {/* Activities Table */}
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Month Activities</h4>
                <div className="border rounded overflow-hidden mb-4">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {monthlyData.activities.length === 0 ? (
                                <tr><td colSpan="4" className="p-4 text-center text-slate-400 italic">No activity this month.</td></tr>
                            ) : (
                                monthlyData.activities.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="p-3 font-mono text-xs">{row.date}</td>
                                        <td className="p-3">{row.description}</td>
                                        <td className={`p-3 text-right ${row.isCredit ? 'text-green-600' : 'text-orange-600'}`}>
                                            {row.isCredit ? '-' : ''} R {Math.abs(row.amount).toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right font-mono text-slate-600">R {row.balance.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Closing Balance */}
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded border border-blue-200">
                    <span className="font-bold text-blue-900">Closing Balance</span>
                    <span className={`font-mono text-xl font-bold ${monthlyData.closingBalance > 0 ? 'text-red-600' : 'text-blue-900'}`}>
                        R {monthlyData.closingBalance.toFixed(2)}
                    </span>
                </div>
             </div>

             <div className="p-4 bg-slate-50 border-t flex justify-end">
                <button onClick={() => setMonthlyPolicy(null)} className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700">Close</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default PremiumModule;