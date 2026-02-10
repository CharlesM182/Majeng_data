import React, { useState } from 'react';
import { Calculator, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib'; 

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
    policyNumber: '', // Hidden internal state for auto-generation
    name: '',
    idNumber: '',
    age: '', 
    gender: '',
    smoker: false,
    coverage: 100000,
    history: 'clean',
    beneficiaryName: '',
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
        if (isNaN(x) || isNaN(S)) throw new Error("Invalid inputs.");

        const assuranceValue = simpsonsRule(assuranceIntegrand, x, n, 100);
        const annuityValue = simpsonsRule((t, x) => annuityIntegrand(t, x, delta), x, n, 100);
        const annuityInValue = simpsonsRule((t, x) => annuityIntegrand(t, x, delta_in), x, n, 100);

        const numerator = (S * assuranceValue) + (annuityInValue * 8000) + 2000;
        let annualPremium = numerator / annuityValue;

        let loading = 1.0;
        if (formData.smoker === true || formData.smoker === 'true') loading += 1.5;
        if (formData.history === 'minor') loading += 0.5;
        if (formData.history === 'major') loading += 2.5;

        const monthly = (annualPremium * loading) / 12;
        
        // Auto-generate policy number internally (removed from UI)
        // If one exists (e.g. re-calculating), keep it. Otherwise make a new one.
        const generatedPolicyNum = formData.policyNumber || `POL-${Math.floor(100000 + Math.random() * 900000)}`;
        setFormData(prev => ({ ...prev, policyNumber: generatedPolicyNum }));

        setQuote({
          premium: monthly.toFixed(2),
          annual: (annualPremium * loading).toFixed(2),
          risk: 'Standard',
          approved: (x + n < ACTUARIAL_CONSTANTS.omega)
        });
      } catch (err) {
        alert(`Calculation Error: ${err.message}`);
      } finally {
        setCalculating(false);
      }
    }, 500);
  };

  // --- PDF FORM FILLING GENERATION ---
  const generatePdfDocument = async () => {
    if (!quote) return;

    try {
      // 1. Load the Form Template
      const existingPdfBytes = await fetch('/Policy_Schedule_Form.pdf').then(res => {
        if (!res.ok) throw new Error("Template 'Policy_Schedule_Form.pdf' not found in public folder.");
        return res.arrayBuffer();
      });

      // 2. Load the PDF
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // 3. Get the Form
      const form = pdfDoc.getForm();

      // 4. Fill Fields by Name
      try {
          const setTextIfFieldExists = (fieldName, text) => {
             try {
                const field = form.getTextField(fieldName);
                if (field) field.setText(String(text || ''));
             } catch (e) {
                console.warn(`Field '${fieldName}' not found in PDF template.`);
             }
          };

          // Use the auto-generated number from state
          setTextIfFieldExists('PolicyNumber', formData.policyNumber);
          
          setTextIfFieldExists('ApplicantName', formData.name);
          setTextIfFieldExists('IDNumber', formData.idNumber);
          setTextIfFieldExists('Age', formData.age);
          setTextIfFieldExists('Gender', formData.gender);
          setTextIfFieldExists('Smoker', formData.smoker ? 'Yes' : 'No');
          
          setTextIfFieldExists('BeneficiaryName', formData.beneficiaryName);
          setTextIfFieldExists('BeneficiaryID', formData.beneficiaryId);
          setTextIfFieldExists('BeneficiaryContact', `${formData.beneficiaryPhone} / ${formData.beneficiaryEmail}`);
          
          setTextIfFieldExists('CoverAmount', `R ${parseFloat(formData.coverage).toLocaleString()}`);
          setTextIfFieldExists('Premium', `R ${quote.premium}`);
          setTextIfFieldExists('Date', new Date().toLocaleDateString());
          
      } catch (fieldError) {
          console.warn("Error filling PDF fields:", fieldError);
      }

      // 5. Flatten
      form.flatten();

      // 6. Save and Download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Policy_Schedule_${formData.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF: " + error.message);
    }
  };

  const handleIssuePolicy = () => {
    const newPolicy = {
      policyNumber: formData.policyNumber, // Use the generated number
      name: formData.name,
      idNumber: formData.idNumber,
      age: formData.age,
      gender: formData.gender, 
      type: `Term Life (${ACTUARIAL_CONSTANTS.n} Yr)`,
      coverage: formData.coverage,
      premium: quote.premium,
      status: 'Pending Doc',
      inceptionDate: new Date().toISOString().split('T')[0],
      paidUntil: null, 
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
      policyNumber: '', name: '', idNumber: '', age: '', gender: '', smoker: false, coverage: 100000, history: 'clean',
      beneficiaryName: '', beneficiaryId: '', beneficiaryPhone: '', beneficiaryEmail: '' 
    });
  };

  const handleGenerateQuote = async () => {
    await generatePdfDocument();
    handleIssuePolicy();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center text-slate-800">
        <Calculator className="mr-2 text-blue-600" /> Actuarial Underwriting
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 border border-blue-200">
             <strong>Model parameters:</strong> Term (n)=15.
             <br/>i=5% (Base), i=2.439% (Expense).
             <br/>Using Gompertz-Makeham Mortality.
          </div>

          <h3 className="font-bold text-slate-700 border-b pb-1">Applicant Details</h3>
          
          {/* Policy Number Input REMOVED from UI */}

          <div>
            <label className="block text-sm font-medium text-slate-700">Applicant Name</label>
            <input className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">ID Number (SA 13-Digit)</label>
            <input className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.idNumber} onChange={handleIdChange} placeholder="e.g. 9001015009087" maxLength={13} />
          </div>

          <div className="flex space-x-4">
            <div className="flex-1"><label className="block text-sm font-medium text-slate-700">Age (Auto)</label><input type="text" className="mt-1 w-full border rounded-md p-2 bg-slate-100 text-slate-500" value={formData.age} readOnly placeholder="-" /></div>
            <div className="flex-1"><label className="block text-sm font-medium text-slate-700">Gender (Auto)</label><input type="text" className="mt-1 w-full border rounded-md p-2 bg-slate-100 text-slate-500" value={formData.gender} readOnly placeholder="-" /></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700">Smoker?</label><select className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.smoker} onChange={e => setFormData({...formData, smoker: e.target.value === 'true'})}><option value="false">No</option><option value="true">Yes</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700">Medical History</label><select className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})}><option value="clean">Clean History</option><option value="minor">Minor Issues</option><option value="major">Major Issues</option></select></div>
          </div>

          <div><label className="block text-sm font-medium text-slate-700">Coverage Amount (S)</label><input type="number" className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.coverage} onChange={e => setFormData({...formData, coverage: parseInt(e.target.value)})} /></div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <div className="bg-slate-50 p-6 rounded-lg border flex flex-col justify-center items-center h-40">
            {!quote ? (
                <div className="text-center text-slate-400"><Calculator className="w-12 h-12 mx-auto mb-2 opacity-20" /><p>Enter details to view premium breakdown.</p></div>
            ) : (
                <div className="w-full text-center">
                    <p className="text-sm text-slate-500 uppercase tracking-wide">Monthly Premium</p>
                    <p className="text-4xl font-bold text-blue-600">R {quote.premium}</p>
                    <div className="text-xs text-slate-400 mt-1">Annual: R {quote.annual} | Risk: {quote.risk}</div>
                </div>
            )}
          </div>

          <h3 className="font-bold text-slate-700 border-b pb-1 pt-4">Beneficiary Details</h3>
          <div><label className="block text-sm font-medium text-slate-700">Beneficiary Name</label><input type="text" className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.beneficiaryName} onChange={e => setFormData({...formData, beneficiaryName: e.target.value})} /></div>
          <div><label className="block text-sm font-medium text-slate-700">Beneficiary ID Number</label><input type="text" className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.beneficiaryId} onChange={e => setFormData({...formData, beneficiaryId: e.target.value})} /></div>
          <div className="flex space-x-4">
             <div className="flex-1"><label className="block text-sm font-medium text-slate-700">Phone</label><input type="text" className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.beneficiaryPhone} onChange={e => setFormData({...formData, beneficiaryPhone: e.target.value})} /></div>
             <div className="flex-1"><label className="block text-sm font-medium text-slate-700">Email</label><input type="email" className="mt-1 w-full border rounded-md p-2 bg-white" value={formData.beneficiaryEmail} onChange={e => setFormData({...formData, beneficiaryEmail: e.target.value})} /></div>
          </div>

          <div className="pt-4 border-t mt-4">
              {!quote ? (
                  <button onClick={calculateActuarialPremium} disabled={calculating} className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition flex justify-center items-center font-bold">
                    {calculating ? 'Integrating...' : 'Calculate Premium'}
                  </button>
              ) : (
                  <button onClick={handleGenerateQuote} className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 flex items-center justify-center shadow-md font-bold text-lg">
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