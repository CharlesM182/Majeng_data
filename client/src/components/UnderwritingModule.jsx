import React, { useState } from 'react';
import { Calculator, CheckCircle, Download, FileText, UserPlus } from 'lucide-react';
import { jsPDF } from "jspdf"; 

// Import logic from our utility files
import { 
  ACTUARIAL_CONSTANTS, 
  simpsonsRule, 
  assuranceIntegrand, 
  annuityIntegrand, 
  delta, 
  delta_in 
} from '../utils/actuarial';
import { parseDetailsFromID } from '../utils/helpers';

const UnderwritingModule = ({ onCreatePolicy }) => {
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    age: '', 
    gender: '',
    smoker: false,
    coverage: 100000,
    history: 'clean',
    // Beneficiary Fields
    beneficiaryName: 'none',
    beneficiaryId: '',
    beneficiaryPhone: '',
    beneficiaryEmail: ''
  });
  const [quote, setQuote] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const handleIdChange = (e) => {
    const newId = e.target.value;
    const { age, gender } = parseDetailsFromID(newId);
    
    setFormData(prev => ({
      ...prev,
      idNumber: newId,
      age: age,
      gender: gender
    }));
  };

  const calculateActuarialPremium = () => {
    if (!formData.age) {
        alert("Please enter a valid 13-digit ID number to determine age.");
        return;
    }

    setCalculating(true);
    setTimeout(() => {
      try {
        const x = parseInt(formData.age);
        const S = parseFloat(formData.coverage);
        const n = ACTUARIAL_CONSTANTS.n;

        if (isNaN(x) || isNaN(S)) {
            throw new Error("Invalid Age or Coverage Amount. Please check inputs.");
        }

        const assuranceValue = simpsonsRule(assuranceIntegrand, x, n, 100);
        const annuityValue = simpsonsRule((t, x) => annuityIntegrand(t, x, delta), x, n, 100);
        const annuityInValue = simpsonsRule((t, x) => annuityIntegrand(t, x, delta_in), x, n, 100);

        const numerator = (S * assuranceValue) + (annuityInValue * 8000) + 2000;
        let annualPremium = numerator / annuityValue;

        let loadingMultiplier = 1.0;
        if (formData.smoker === true || formData.smoker === 'true') loadingMultiplier += 1.5;
        if (formData.history === 'minor') loadingMultiplier += 0.5;
        if (formData.history === 'major') loadingMultiplier += 2.5;

        const finalAnnualPremium = annualPremium * loadingMultiplier;
        const monthlyPremium = finalAnnualPremium / 12;

        let risk = 'Low';
        if (formData.smoker || formData.history === 'minor') risk = 'Medium';
        if (formData.history === 'major') risk = 'High';

        const approved = (x + n < ACTUARIAL_CONSTANTS.omega);

        setQuote({
          premium: monthlyPremium.toFixed(2),
          annual: finalAnnualPremium.toFixed(2),
          assuranceFactor: assuranceValue.toFixed(5),
          annuityFactor: annuityValue.toFixed(5),
          annuityInFactor: annuityInValue.toFixed(5),
          risk: risk,
          approved: approved
        });
      } catch (err) {
        console.error("Premium Calculation failed:", err);
        alert(`Calculation Error: ${err.message}`);
      } finally {
        setCalculating(false);
      }
    }, 500);
  };

  // --- PDF GENERATION ---
  const generatePdfDocument = () => {
    if (!quote) return;

    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();

      // -- Header --
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235); // Blue color
      doc.text("Majeng Life", 80, 20);
      
      doc.setFontSize(16);
      doc.setTextColor(71, 85, 105); // Slate color
      doc.text("Policy Schedule", 20, 30);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Date Generated: ${date}`, 20, 40);

      // -- Section 1: Policyholder --
      doc.setFillColor(241, 245, 249); // Light gray background
      doc.rect(20, 50, 170, 10, 'F');
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("1. Policyholder Details", 25, 57);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      let y = 70;
      doc.text(`Name:`, 25, y); doc.text(formData.name, 80, y); y += 10;
      doc.text(`ID Number:`, 25, y); doc.text(formData.idNumber, 80, y); y += 10;
      doc.text(`Age:`, 25, y); doc.text(String(formData.age), 80, y); y += 10;
      doc.text(`Gender:`, 25, y); doc.text(formData.gender, 80, y); y += 10;
      doc.text(`Smoker Status:`, 25, y); doc.text(formData.smoker ? 'Yes' : 'No', 80, y); y += 10;

      // -- Section 2: Beneficiary --
      y += 10;
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 7, 170, 10, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("2. Beneficiary Details", 25, y);
      
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Beneficiary Name:`, 25, y); doc.text(formData.beneficiaryName || '-', 80, y); y += 10;
      doc.text(`Beneficiary ID:`, 25, y); doc.text(formData.beneficiaryId || '-', 80, y); y += 10;
      doc.text(`Contact Number:`, 25, y); doc.text(formData.beneficiaryPhone || '-', 80, y); y += 10;
      doc.text(`Email Address:`, 25, y); doc.text(formData.beneficiaryEmail || '-', 80, y); y += 10;

      // -- Section 3: Premium --
      y += 10;
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 7, 170, 10, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("3. Premium & Coverage", 25, y);

      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Cover Amount:`, 25, y); doc.text(`R ${parseFloat(formData.coverage).toLocaleString()}`, 80, y); y += 10;
      doc.text(`Risk Category:`, 25, y); doc.text(quote.risk, 80, y); y += 10;
      doc.text(`Annual Premium:`, 25, y); doc.text(`R ${quote.annual}`, 80, y); y += 10;
      
      doc.setFont("helvetica", "bold");
      doc.text(`Monthly Premium:`, 25, y); doc.text(`R ${quote.premium}`, 80, y);

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("This document is a generated illustration and not a final contract.", 105, 280, null, null, "center");

      // Save
      doc.save(`Policy_Schedule_${formData.name.replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF: " + error.message);
    }
  };

  // --- BIND POLICY LOGIC ---
  const handleIssuePolicy = () => {
    const newPolicy = {
      name: formData.name,
      idNumber: formData.idNumber,
      age: formData.age,
      gender: formData.gender, 
      type: `Term Life (${ACTUARIAL_CONSTANTS.n} Yr)`,
      coverage: formData.coverage,
      premium: quote.premium,
      status: 'Pending Doc',
      inceptionDate: new Date().toISOString().split('T')[0],
      paidUntil: new Date().toISOString().split('T')[0],
      riskFactor: quote.risk,
      smoker: formData.smoker,
      beneficiary: {
        name: formData.beneficiaryName,
        id: formData.beneficiaryId,
        phone: formData.beneficiaryPhone,
        email: formData.beneficiaryEmail
      }
    };
    onCreatePolicy(newPolicy);
    setQuote(null);
    setFormData({ 
      name: '', idNumber: '', age: '', gender: '', smoker: false, coverage: 100000, history: 'clean',
      beneficiaryName: '', beneficiaryId: '', beneficiaryPhone: '', beneficiaryEmail: '' 
    });
  };

  // --- COMBINED HANDLER ---
  const handleGenerateQuote = async () => {
    generatePdfDocument();
    handleIssuePolicy();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center text-slate-800">
        <Calculator className="mr-2 text-blue-600" /> Actuarial Underwriting
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: APPLICANT DETAILS */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-200">
             <strong>Model parameters:</strong> Term (n)=15.
             <br/>i=5% (Base), i=2.439% (Expense).
             <br/>Using Gompertz-Makeham Mortality.
          </div>

          <h3 className="font-bold text-slate-700 border-b pb-1">Applicant Details</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700">Applicant Name</label>
            <input 
              type="text" 
              className="mt-1 w-full border rounded-md p-2 bg-white" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">ID Number (SA 13-Digit)</label>
            <input 
              type="text" 
              className="mt-1 w-full border rounded-md p-2 bg-white"
              value={formData.idNumber}
              onChange={handleIdChange}
              placeholder="e.g. 9001015009087"
              maxLength={13}
            />
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Age (Auto)</label>
              <input 
                type="text" 
                className="mt-1 w-full border rounded-md p-2 bg-slate-100 text-slate-500"
                value={formData.age}
                readOnly
                placeholder="-"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Gender (Auto)</label>
               <input 
                type="text" 
                className="mt-1 w-full border rounded-md p-2 bg-slate-100 text-slate-500"
                value={formData.gender}
                readOnly
                placeholder="-"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Smoker?</label>
                <select 
                className="mt-1 w-full border rounded-md p-2 bg-white"
                value={formData.smoker}
                onChange={e => setFormData({...formData, smoker: e.target.value === 'true'})}
                >
                <option value="false">No</option>
                <option value="true">Yes</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Medical History</label>
                <select 
                className="mt-1 w-full border rounded-md p-2 bg-white"
                value={formData.history}
                onChange={e => setFormData({...formData, history: e.target.value})}
                >
                <option value="clean">Clean History</option>
                <option value="minor">Minor Issues</option>
                <option value="major">Major Issues</option>
                </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Coverage Amount (S)</label>
            <input 
              type="number" 
              className="mt-1 w-full border rounded-md p-2 bg-white"
              value={formData.coverage}
              onChange={e => setFormData({...formData, coverage: parseInt(e.target.value)})}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: BENEFICIARY & QUOTE */}
        <div className="space-y-4">
          <div className="bg-slate-50 p-6 rounded-lg border flex flex-col justify-center items-center h-40">
            {!quote ? (
                <div className="text-center text-slate-400">
                    <Calculator className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Enter details to view premium breakdown.</p>
                </div>
            ) : (
                <div className="w-full text-center">
                    <p className="text-sm text-slate-500 uppercase tracking-wide">Monthly Premium</p>
                    <p className="text-4xl font-bold text-blue-600">R {quote.premium}</p>
                    <div className="text-xs text-slate-400 mt-1">Annual: R {quote.annual} | Risk: {quote.risk}</div>
                </div>
            )}
          </div>

          <h3 className="font-bold text-slate-700 border-b pb-1 pt-4">Beneficiary Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Beneficiary Name</label>
            <input 
              type="text" 
              className="mt-1 w-full border rounded-md p-2 bg-white" 
              value={formData.beneficiaryName}
              onChange={e => setFormData({...formData, beneficiaryName: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Beneficiary ID Number</label>
            <input 
              type="text" 
              className="mt-1 w-full border rounded-md p-2 bg-white" 
              value={formData.beneficiaryId}
              onChange={e => setFormData({...formData, beneficiaryId: e.target.value})}
            />
          </div>

          <div className="flex space-x-4">
             <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input 
                  type="text" 
                  className="mt-1 w-full border rounded-md p-2 bg-white" 
                  value={formData.beneficiaryPhone}
                  onChange={e => setFormData({...formData, beneficiaryPhone: e.target.value})}
                />
             </div>
             <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input 
                  type="email" 
                  className="mt-1 w-full border rounded-md p-2 bg-white" 
                  value={formData.beneficiaryEmail}
                  onChange={e => setFormData({...formData, beneficiaryEmail: e.target.value})}
                />
             </div>
          </div>

          <div className="pt-4 border-t mt-4">
              {!quote ? (
                  <button 
                    onClick={calculateActuarialPremium}
                    disabled={calculating}
                    className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition flex justify-center items-center font-bold"
                >
                    {calculating ? 'Integrating...' : 'Calculate Premium'}
                </button>
              ) : (
                  <button 
                    onClick={handleGenerateQuote}
                    className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 flex items-center justify-center shadow-md font-bold text-lg"
                  >
                    <FileText className="w-5 h-5 mr-2" /> Generate Quote & PDF
                  </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderwritingModule;