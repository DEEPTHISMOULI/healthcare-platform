import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Download,
  Eye,
  X,
  Stethoscope,
  Pill,
  Heart,
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react';

const PatientConsultationSummaries = () => {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState(null);

  useEffect(() => {
    if (user) fetchSummaries();
  }, [user]);

  const fetchSummaries = async () => {
    try {
      const { data: patient } = await supabase.from('patients').select('id').eq('user_id', user.id).single();
      if (!patient) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('consultation_summaries')
        .select('*')
        .eq('patient_id', patient.id)
        .order('consultation_date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const doctorIds = [...new Set(data.map(s => s.doctor_id))];
        const { data: doctorsData } = await supabase.from('doctors').select('id, user_id').in('id', doctorIds);
        const userIds = doctorsData?.map(d => d.user_id) || [];
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', userIds);

        const summariesWithDoctors = data.map(summary => {
          const doctor = doctorsData?.find(d => d.id === summary.doctor_id);
          const profile = profilesData?.find(p => p.id === doctor?.user_id);
          return { ...summary, doctor_name: profile?.full_name || 'Doctor' };
        });
        setSummaries(summariesWithDoctors);
      } else {
        setSummaries([]);
      }
    } catch (error) {
      console.error('Error fetching summaries:', error);
      toast.error('Failed to load summaries');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const handlePrint = (summary) => {
    const printContent = `
      <html><head><title>Consultation Summary - Dr. Naren Clinic</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #3b82f6; margin: 0; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .content { background: #f8f9fa; padding: 10px; border-radius: 5px; }
          .red-flag { background: #fee2e2; border-left: 3px solid #dc2626; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head><body>
        <div class="header"><h1>🏥 Dr. Naren Clinic</h1><p>Consultation Summary</p></div>
        <div class="section"><div class="section-title">Consultation Date</div><p>${formatDate(summary.consultation_date)}</p></div>
        <div class="section"><div class="section-title">Doctor</div><p>Dr. ${summary.doctor_name}</p></div>
        <div class="section"><div class="section-title">Diagnosis</div><div class="content">${summary.diagnosis || 'N/A'}</div></div>
        ${summary.symptoms_presented ? `<div class="section"><div class="section-title">Symptoms Presented</div><div class="content">${summary.symptoms_presented}</div></div>` : ''}
        ${summary.examination_findings ? `<div class="section"><div class="section-title">Examination Findings</div><div class="content">${summary.examination_findings}</div></div>` : ''}
        <div class="section"><div class="section-title">Treatment Plan</div><div class="content">${summary.treatment_plan || 'N/A'}</div></div>
        ${summary.medications_prescribed ? `<div class="section"><div class="section-title">Medications Prescribed</div><div class="content">${summary.medications_prescribed}</div></div>` : ''}
        ${summary.lifestyle_recommendations ? `<div class="section"><div class="section-title">Lifestyle Recommendations</div><div class="content">${summary.lifestyle_recommendations}</div></div>` : ''}
        ${summary.patient_education ? `<div class="section"><div class="section-title">Patient Education</div><div class="content">${summary.patient_education}</div></div>` : ''}
        ${summary.follow_up_required ? `<div class="section"><div class="section-title">Follow-up</div><div class="content">Required${summary.follow_up_date ? ` - Recommended: ${formatDate(summary.follow_up_date)}` : ''}${summary.follow_up_notes ? ` - ${summary.follow_up_notes}` : ''}</div></div>` : ''}
        ${summary.referral_required ? `<div class="section"><div class="section-title">Referral</div><div class="content">${summary.referral_specialty || 'Specialist'}${summary.referral_notes ? ` - ${summary.referral_notes}` : ''}</div></div>` : ''}
        ${summary.red_flags ? `<div class="section"><div class="section-title">⚠️ Warning Signs</div><div class="content red-flag">${summary.red_flags}</div></div>` : ''}
        <div class="footer"><p>This summary was generated through Dr. Naren Clinic's telemedicine platform.</p><p>For emergencies, please call emergency services or visit A&E.</p></div>
      </body></html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <Link to="/patient/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none' }}><ArrowLeft size={20} /> Back to Dashboard</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Consultation Summaries</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>View summaries from your consultations with doctors</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div></div>
        ) : summaries.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <FileText size={64} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No summaries yet</h3>
            <p style={{ color: '#94a3b8' }}>Consultation summaries will appear here after your appointments</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {summaries.map(summary => (
              <div key={summary.id} style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Stethoscope size={24} color="#3b82f6" /></div>
                    <div>
                      <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{summary.diagnosis}</h3>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14} /> Dr. {summary.doctor_name}</p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {formatDate(summary.consultation_date)}</span>
                        {summary.follow_up_required && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b' }}><Clock size={14} /> Follow-up needed</span>}
                        {summary.referral_required && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#8b5cf6' }}><CheckCircle size={14} /> Referral: {summary.referral_specialty}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setSelectedSummary(summary)} style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }} title="View"><Eye size={18} color="#64748b" /></button>
                    <button onClick={() => handlePrint(summary)} style={{ padding: '0.5rem', backgroundColor: '#dbeafe', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }} title="Download"><Download size={18} color="#3b82f6" /></button>
                  </div>
                </div>
                {summary.red_flags && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', borderLeft: '3px solid #dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <span style={{ fontSize: '0.875rem', color: '#dc2626' }}><strong>Warning:</strong> {summary.red_flags}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedSummary && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Consultation Summary</h2>
              <button onClick={() => setSelectedSummary(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Consultation Date</p>
              <p style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(selectedSummary.consultation_date)} • Dr. {selectedSummary.doctor_name}</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Stethoscope size={18} color="#dc2626" /><p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Diagnosis</p></div>
              <p style={{ fontWeight: 500, color: '#1e293b', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '0.5rem' }}>{selectedSummary.diagnosis}</p>
            </div>

            {selectedSummary.symptoms_presented && <div style={{ marginBottom: '1rem' }}><p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Symptoms Presented</p><p style={{ color: '#1e293b' }}>{selectedSummary.symptoms_presented}</p></div>}
            {selectedSummary.examination_findings && <div style={{ marginBottom: '1rem' }}><p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Examination Findings</p><p style={{ color: '#1e293b' }}>{selectedSummary.examination_findings}</p></div>}

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Heart size={18} color="#ec4899" /><p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Treatment Plan</p></div>
              <p style={{ color: '#1e293b', backgroundColor: '#fdf4ff', padding: '0.75rem', borderRadius: '0.5rem' }}>{selectedSummary.treatment_plan}</p>
            </div>

            {selectedSummary.medications_prescribed && <div style={{ marginBottom: '1rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Pill size={18} color="#8b5cf6" /><p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Medications</p></div><p style={{ color: '#1e293b', backgroundColor: '#f5f3ff', padding: '0.75rem', borderRadius: '0.5rem' }}>{selectedSummary.medications_prescribed}</p></div>}
            {selectedSummary.lifestyle_recommendations && <div style={{ marginBottom: '1rem' }}><p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Lifestyle Recommendations</p><p style={{ color: '#1e293b' }}>{selectedSummary.lifestyle_recommendations}</p></div>}
            {selectedSummary.patient_education && <div style={{ marginBottom: '1rem' }}><p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Patient Education</p><p style={{ color: '#1e293b' }}>{selectedSummary.patient_education}</p></div>}

            {selectedSummary.follow_up_required && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '0.5rem', border: '1px solid #fde68a' }}><p style={{ fontWeight: 500, color: '#92400e' }}>📅 Follow-up Required{selectedSummary.follow_up_date ? ` - ${formatDate(selectedSummary.follow_up_date)}` : ''}</p>{selectedSummary.follow_up_notes && <p style={{ fontSize: '0.875rem', color: '#78350f', marginTop: '0.25rem' }}>{selectedSummary.follow_up_notes}</p>}</div>}
            {selectedSummary.referral_required && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f5f3ff', borderRadius: '0.5rem', border: '1px solid #ddd6fe' }}><p style={{ fontWeight: 500, color: '#6d28d9' }}>🔗 Referral: {selectedSummary.referral_specialty}</p>{selectedSummary.referral_notes && <p style={{ fontSize: '0.875rem', color: '#5b21b6', marginTop: '0.25rem' }}>{selectedSummary.referral_notes}</p>}</div>}
            {selectedSummary.red_flags && <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}><p style={{ fontWeight: 500, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /> Warning Signs to Watch</p><p style={{ fontSize: '0.875rem', color: '#991b1b', marginTop: '0.25rem' }}>{selectedSummary.red_flags}</p></div>}

            <button onClick={() => handlePrint(selectedSummary)} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Download size={18} /> Download / Print Summary</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientConsultationSummaries;
