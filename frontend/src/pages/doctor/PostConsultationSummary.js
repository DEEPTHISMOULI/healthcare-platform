import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Clock,
  Save,
  CheckCircle,
  Stethoscope,
  Pill,
  AlertTriangle,
  ClipboardList,
  Heart,
  Activity
} from 'lucide-react';

const PostConsultationSummary = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [existingSummary, setExistingSummary] = useState(null);
  const [preConsultForm, setPreConsultForm] = useState(null);

  const [formData, setFormData] = useState({
    diagnosis: '',
    symptoms_presented: '',
    examination_findings: '',
    treatment_plan: '',
    medications_prescribed: '',
    lifestyle_recommendations: '',
    follow_up_required: false,
    follow_up_date: '',
    follow_up_notes: '',
    referral_required: false,
    referral_specialty: '',
    referral_notes: '',
    red_flags: '',
    additional_notes: '',
    patient_education: ''
  });

  useEffect(() => {
    if (user && appointmentId) {
      fetchData();
    }
  }, [user, appointmentId]);

  const fetchData = async () => {
    try {
      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (aptError) throw aptError;
      setAppointment(apt);

      if (apt?.patient_id) {
        const { data: patient } = await supabase
          .from('patients')
          .select('id, user_id')
          .eq('id', apt.patient_id)
          .single();

        if (patient?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', patient.user_id)
            .single();
          setPatientInfo(profile);
        }
      }

      const { data: preForm } = await supabase
        .from('pre_consultation_forms')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();
      
      if (preForm) setPreConsultForm(preForm);

      const { data: existingSummaryData } = await supabase
        .from('consultation_summaries')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (existingSummaryData) {
        setExistingSummary(existingSummaryData);
        setFormData({
          diagnosis: existingSummaryData.diagnosis || '',
          symptoms_presented: existingSummaryData.symptoms_presented || '',
          examination_findings: existingSummaryData.examination_findings || '',
          treatment_plan: existingSummaryData.treatment_plan || '',
          medications_prescribed: existingSummaryData.medications_prescribed || '',
          lifestyle_recommendations: existingSummaryData.lifestyle_recommendations || '',
          follow_up_required: existingSummaryData.follow_up_required || false,
          follow_up_date: existingSummaryData.follow_up_date || '',
          follow_up_notes: existingSummaryData.follow_up_notes || '',
          referral_required: existingSummaryData.referral_required || false,
          referral_specialty: existingSummaryData.referral_specialty || '',
          referral_notes: existingSummaryData.referral_notes || '',
          red_flags: existingSummaryData.red_flags || '',
          additional_notes: existingSummaryData.additional_notes || '',
          patient_education: existingSummaryData.patient_education || ''
        });
      } else if (preForm) {
        setFormData(prev => ({
          ...prev,
          symptoms_presented: preForm.chief_complaint + (preForm.current_symptoms ? '\n' + preForm.current_symptoms : '')
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.diagnosis.trim()) { toast.error('Please enter a diagnosis'); return; }
    if (!formData.treatment_plan.trim()) { toast.error('Please enter a treatment plan'); return; }

    setSaving(true);
    try {
      const { data: doctor } = await supabase.from('doctors').select('id').eq('user_id', user.id).single();
      if (!doctor) { toast.error('Doctor record not found'); return; }

      const summaryPayload = {
        appointment_id: appointmentId,
        doctor_id: doctor.id,
        patient_id: appointment.patient_id,
        diagnosis: formData.diagnosis,
        symptoms_presented: formData.symptoms_presented,
        examination_findings: formData.examination_findings,
        treatment_plan: formData.treatment_plan,
        medications_prescribed: formData.medications_prescribed,
        lifestyle_recommendations: formData.lifestyle_recommendations,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date || null,
        follow_up_notes: formData.follow_up_notes,
        referral_required: formData.referral_required,
        referral_specialty: formData.referral_specialty,
        referral_notes: formData.referral_notes,
        red_flags: formData.red_flags,
        additional_notes: formData.additional_notes,
        patient_education: formData.patient_education,
        consultation_date: appointment.scheduled_date,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingSummary) {
        const { error: updateError } = await supabase.from('consultation_summaries').update(summaryPayload).eq('id', existingSummary.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('consultation_summaries').insert(summaryPayload);
        error = insertError;
      }
      if (error) throw error;

      if (appointment.status !== 'completed') {
        await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId);
      }

      toast.success('Consultation summary saved!');
      navigate('/doctor/appointments');
    } catch (error) {
      console.error('Error saving summary:', error);
      toast.error('Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formatTime = (timeStr) => { if (!timeStr) return ''; const [hours, minutes] = timeStr.split(':'); const hour = parseInt(hours); return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`; };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}><div className="spinner" style={{ width: '40px', height: '40px' }}></div></div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/doctor/appointments" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none' }}><ArrowLeft size={20} /> Back to Appointments</Link>
          {existingSummary && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}><CheckCircle size={14} /> Summary Created</span>}
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ backgroundColor: '#eff6ff', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}><FileText size={20} color="#3b82f6" /><h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e40af' }}>Post-Consultation Summary</h2></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>{patientInfo?.full_name?.charAt(0) || 'P'}</div>
            <div><p style={{ fontWeight: 600, color: '#1e40af' }}>{patientInfo?.full_name || 'Patient'}</p><p style={{ fontSize: '0.875rem', color: '#3b82f6' }}>{patientInfo?.email}</p></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.875rem', color: '#3b82f6' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={16} /> {formatDate(appointment?.scheduled_date)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={16} /> {formatTime(appointment?.scheduled_time)}</span>
          </div>
        </div>

        {preConsultForm && (
          <div style={{ backgroundColor: '#fefce8', borderRadius: '0.75rem', padding: '1rem 1.5rem', marginBottom: '1.5rem', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: '0.875rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClipboardList size={16} /><strong>Chief Complaint:</strong> {preConsultForm.chief_complaint}</p>
            {preConsultForm.allergies && <p style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /><strong>Allergies:</strong> {preConsultForm.allergies}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Stethoscope size={20} color="#dc2626" /><h3 style={{ fontWeight: 600, color: '#1e293b' }}>Diagnosis <span style={{ color: '#dc2626' }}>*</span></h3></div>
            <textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange} placeholder="Enter primary and secondary diagnoses..." rows={3} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} />
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Activity size={20} color="#f59e0b" /><h3 style={{ fontWeight: 600, color: '#1e293b' }}>Clinical Findings</h3></div>
            <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Symptoms Presented</label><textarea name="symptoms_presented" value={formData.symptoms_presented} onChange={handleChange} placeholder="Describe symptoms..." rows={2} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} /></div>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Examination Findings</label><textarea name="examination_findings" value={formData.examination_findings} onChange={handleChange} placeholder="Clinical observations..." rows={2} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} /></div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Heart size={20} color="#ec4899" /><h3 style={{ fontWeight: 600, color: '#1e293b' }}>Treatment Plan <span style={{ color: '#dc2626' }}>*</span></h3></div>
            <textarea name="treatment_plan" value={formData.treatment_plan} onChange={handleChange} placeholder="Describe treatment plan..." rows={3} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} />
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Pill size={20} color="#8b5cf6" /><h3 style={{ fontWeight: 600, color: '#1e293b' }}>Medications Prescribed</h3></div>
            <textarea name="medications_prescribed" value={formData.medications_prescribed} onChange={handleChange} placeholder="List medications..." rows={3} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} />
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Lifestyle & Patient Education</h3>
            <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Lifestyle Recommendations</label><textarea name="lifestyle_recommendations" value={formData.lifestyle_recommendations} onChange={handleChange} placeholder="Diet, exercise advice..." rows={2} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} /></div>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Patient Education</label><textarea name="patient_education" value={formData.patient_education} onChange={handleChange} placeholder="Key points discussed..." rows={2} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} /></div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Follow-up</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}><input type="checkbox" name="follow_up_required" checked={formData.follow_up_required} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} /><span style={{ fontWeight: 500 }}>Follow-up appointment required</span></label>
            {formData.follow_up_required && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Recommended Date</label><input type="date" name="follow_up_date" value={formData.follow_up_date} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Follow-up Notes</label><input type="text" name="follow_up_notes" value={formData.follow_up_notes} onChange={handleChange} placeholder="e.g., Review results" style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }} /></div>
              </div>
            )}
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Referral</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}><input type="checkbox" name="referral_required" checked={formData.referral_required} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} /><span style={{ fontWeight: 500 }}>Referral to specialist required</span></label>
            {formData.referral_required && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Specialty</label><select name="referral_specialty" value={formData.referral_specialty} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', backgroundColor: 'white' }}><option value="">Select specialty</option><option value="Cardiology">Cardiology</option><option value="Dermatology">Dermatology</option><option value="Endocrinology">Endocrinology</option><option value="Gastroenterology">Gastroenterology</option><option value="Neurology">Neurology</option><option value="Oncology">Oncology</option><option value="Ophthalmology">Ophthalmology</option><option value="Orthopaedics">Orthopaedics</option><option value="Psychiatry">Psychiatry</option><option value="Pulmonology">Pulmonology</option><option value="Rheumatology">Rheumatology</option><option value="Urology">Urology</option><option value="Other">Other</option></select></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Referral Reason</label><input type="text" name="referral_notes" value={formData.referral_notes} onChange={handleChange} placeholder="Reason for referral..." style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }} /></div>
              </div>
            )}
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '1rem' }}><label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: '#dc2626' }}><AlertTriangle size={16} /> Red Flags / Warning Signs</label><textarea name="red_flags" value={formData.red_flags} onChange={handleChange} placeholder="Symptoms requiring immediate attention..." rows={2} style={{ width: '100%', padding: '0.75rem', border: '1px solid #fecaca', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', backgroundColor: '#fef2f2' }} /></div>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Additional Notes</label><textarea name="additional_notes" value={formData.additional_notes} onChange={handleChange} placeholder="Any other information..." rows={2} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} /></div>
          </div>

          <button type="submit" disabled={saving} style={{ width: '100%', padding: '1rem', backgroundColor: saving ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {saving ? <><span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>Saving...</> : <><Save size={20} />{existingSummary ? 'Update Summary' : 'Save Summary'}</>}
          </button>
        </form>
      </main>
    </div>
  );
};

export default PostConsultationSummary;
