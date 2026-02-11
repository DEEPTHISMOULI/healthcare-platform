import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Sparkles,
  Save,
  FileText,
  Loader,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Stethoscope,
  Pill,
  Heart,
  ClipboardList,
  RefreshCw,
  Edit3
} from 'lucide-react';

const AIConsultationNotes = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [preConsultForm, setPreConsultForm] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedSummary, setEditedSummary] = useState(null);
  const [existingSummary, setExistingSummary] = useState(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('09:00');
  const [followUpPriority, setFollowUpPriority] = useState('routine');

  // Backend URL - adjust if different
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const init = async () => {
      // Try getting user from context first
      let userId = user?.id;
      
      // If not available, wait a moment and get from session
      if (!userId) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }
      
      // Still no user? Try one more time after a longer wait
      if (!userId) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }
      
      console.log('Init - userId:', userId, 'appointmentId:', appointmentId);
      
      if (userId && appointmentId) {
        fetchData(userId);
      } else {
        console.error('Missing userId or appointmentId', { userId, appointmentId });
        setLoading(false);
      }
    };
    init();
  }, [user, appointmentId]);

  const fetchData = async (userId) => {
    try {
      console.log('Fetching data for appointment:', appointmentId, 'user:', userId);
      
      // Fetch appointment
      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      console.log('Appointment result:', apt, 'Error:', aptError);
      
      if (aptError || !apt) { 
        console.error('Failed to fetch appointment:', aptError);
        toast.error('Could not load appointment data');
        setLoading(false); 
        return; 
      }
      setAppointment(apt);

      // Fetch patient info
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', apt.patient_id)
        .single();

      if (patient?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', patient.user_id)
          .single();
        setPatientInfo({ ...patient, ...profile });
      }

      // Fetch pre-consultation form
      const { data: form } = await supabase
        .from('pre_consultation_forms')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();
      setPreConsultForm(form);

      // Check for existing summary
      const { data: existing } = await supabase
        .from('consultation_summaries')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();
      
      if (existing) {
        setExistingSummary(existing);
        setAiSummary({
          diagnosis: existing.diagnosis || '',
          symptoms_presented: existing.symptoms_presented || '',
          examination_findings: existing.examination_findings || '',
          treatment_plan: existing.treatment_plan || '',
          medications_prescribed: existing.medications_prescribed || '',
          lifestyle_recommendations: existing.lifestyle_recommendations || '',
          patient_education: existing.patient_education || '',
          follow_up_required: existing.follow_up_required || false,
          follow_up_notes: existing.follow_up_notes || '',
          follow_up_timeframe: '',
          referral_required: existing.referral_required || false,
          referral_specialty: existing.referral_specialty || '',
          referral_notes: existing.referral_notes || '',
          red_flags: existing.red_flags || '',
          additional_notes: existing.additional_notes || ''
        });
        setEditedSummary({
          diagnosis: existing.diagnosis || '',
          symptoms_presented: existing.symptoms_presented || '',
          examination_findings: existing.examination_findings || '',
          treatment_plan: existing.treatment_plan || '',
          medications_prescribed: existing.medications_prescribed || '',
          lifestyle_recommendations: existing.lifestyle_recommendations || '',
          patient_education: existing.patient_education || '',
          follow_up_required: existing.follow_up_required || false,
          follow_up_notes: existing.follow_up_notes || '',
          follow_up_timeframe: '',
          referral_required: existing.referral_required || false,
          referral_specialty: existing.referral_specialty || '',
          referral_notes: existing.referral_notes || '',
          red_flags: existing.red_flags || '',
          additional_notes: existing.additional_notes || ''
        });
      }

      // Load consultation notes if saved
      if (apt.consultation_notes) {
        setDoctorNotes(apt.consultation_notes);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load appointment data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const generateAISummary = async () => {
    if (!doctorNotes.trim()) {
      toast.error('Please enter your consultation notes first');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${API_URL}/ai/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorNotes: doctorNotes.trim(),
          patientName: patientInfo?.full_name || '',
          patientAge: calculateAge(patientInfo?.date_of_birth) || '',
          patientGender: patientInfo?.gender || '',
          chiefComplaint: preConsultForm?.chief_complaint || '',
          currentSymptoms: preConsultForm?.current_symptoms || '',
          currentMedications: preConsultForm?.current_medications || '',
          allergies: preConsultForm?.allergies || '',
          medicalHistory: preConsultForm?.medical_history || '',
          consultationType: appointment?.type || 'video'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();
      setAiSummary(data.summary);
      setEditedSummary({ ...data.summary });
      toast.success('AI summary generated successfully!');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate AI summary');
    } finally {
      setGenerating(false);
    }
  };

  const saveSummary = async () => {
    if (!editedSummary) {
      toast.error('No summary to save');
      return;
    }

    setSaving(true);
    try {
      // Get doctor ID
      let userId = user?.id;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }

      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userId)
        .single();

      const summaryData = {
        appointment_id: appointmentId,
        doctor_id: doctor?.id,
        patient_id: appointment?.patient_id,
        consultation_date: appointment?.scheduled_date,
        diagnosis: editedSummary.diagnosis,
        symptoms_presented: editedSummary.symptoms_presented,
        examination_findings: editedSummary.examination_findings,
        treatment_plan: editedSummary.treatment_plan,
        medications_prescribed: editedSummary.medications_prescribed,
        lifestyle_recommendations: editedSummary.lifestyle_recommendations,
        patient_education: editedSummary.patient_education,
        follow_up_required: editedSummary.follow_up_required,
        follow_up_notes: editedSummary.follow_up_notes,
        referral_required: editedSummary.referral_required,
        referral_specialty: editedSummary.referral_specialty,
        referral_notes: editedSummary.referral_notes,
        red_flags: editedSummary.red_flags,
        additional_notes: editedSummary.additional_notes
      };

      let error;
      if (existingSummary) {
        ({ error } = await supabase
          .from('consultation_summaries')
          .update(summaryData)
          .eq('id', existingSummary.id));
      } else {
        ({ error } = await supabase
          .from('consultation_summaries')
          .insert(summaryData));
      }

      if (error) throw error;

      // Create follow-up if required and date is set
      if (editedSummary.follow_up_required && followUpDate) {
        const { error: followUpError } = await supabase
          .from('follow_ups')
          .insert({
            appointment_id: appointmentId,
            doctor_id: doctor?.id,
            patient_id: appointment?.patient_id,
            follow_up_date: followUpDate,
            follow_up_time: followUpTime || null,
            reason: editedSummary.follow_up_notes || editedSummary.diagnosis || 'Follow-up consultation',
            priority: followUpPriority,
            notes: editedSummary.follow_up_notes,
            status: 'scheduled'
          });
        
        if (followUpError) {
          console.error('Follow-up creation error:', followUpError);
          toast.error('Summary saved but failed to create follow-up');
        }
      }

      // Save doctor notes to appointment
      await supabase
        .from('appointments')
        .update({ consultation_notes: doctorNotes })
        .eq('id', appointmentId);

      toast.success('Consultation summary saved!');
      setEditMode(false);
      navigate('/doctor/appointments');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  const handleEditField = (field, value) => {
    setEditedSummary(prev => ({ ...prev, [field]: value }));
  };

  // Styles
  const pageStyle = { minHeight: '100vh', backgroundColor: '#f8fafc' };
  const headerStyle = { backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 };
  const mainStyle = { maxWidth: '1100px', margin: '0 auto', padding: '2rem' };
  const cardStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' };
  const textareaStyle = { width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' };
  const fieldDisplayStyle = { fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' };
  const sectionTitleStyle = { fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ color: '#64748b' }}>Loading...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/doctor/appointments" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            <ArrowLeft size={20} /> Back to Appointments
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7c3aed' }}>
            <Sparkles size={20} />
            <span style={{ fontWeight: 600 }}>AI Consultation Notes</span>
          </div>
        </div>
      </header>

      <main style={mainStyle}>
        {/* Patient Info */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #7c3aed' }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#e0e7ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5',
            fontWeight: 700, fontSize: '1.25rem', flexShrink: 0
          }}>
            {patientInfo?.full_name?.charAt(0) || 'P'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
              {patientInfo?.full_name || 'Patient'}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
              {patientInfo?.date_of_birth && <span>Age: {calculateAge(patientInfo.date_of_birth)}</span>}
              {patientInfo?.gender && <span>Gender: {patientInfo.gender}</span>}
              <span>Date: {appointment?.scheduled_date ? new Date(appointment.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
              <span>Type: {appointment?.type || 'Video'} Consultation</span>
            </div>
          </div>
          {preConsultForm && (
            <div style={{ padding: '0.375rem 0.75rem', backgroundColor: '#dcfce7', borderRadius: '999px', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
              Pre-consult form available
            </div>
          )}
        </div>

        {/* Pre-consultation info */}
        {preConsultForm && (
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <ClipboardList size={18} style={{ color: '#6366f1' }} /> Pre-Consultation Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {preConsultForm.chief_complaint && (
                <div><span style={labelStyle}>Chief Complaint</span><div style={fieldDisplayStyle}>{preConsultForm.chief_complaint}</div></div>
              )}
              {preConsultForm.current_symptoms && (
                <div><span style={labelStyle}>Current Symptoms</span><div style={fieldDisplayStyle}>{preConsultForm.current_symptoms}</div></div>
              )}
              {preConsultForm.current_medications && (
                <div><span style={labelStyle}>Current Medications</span><div style={fieldDisplayStyle}>{preConsultForm.current_medications}</div></div>
              )}
              {preConsultForm.allergies && (
                <div><span style={labelStyle}>Allergies</span><div style={{ ...fieldDisplayStyle, backgroundColor: '#fef3c7', borderColor: '#fde68a' }}>{preConsultForm.allergies}</div></div>
              )}
              {preConsultForm.medical_history && (
                <div style={{ gridColumn: 'span 2' }}><span style={labelStyle}>Medical History</span><div style={fieldDisplayStyle}>{preConsultForm.medical_history}</div></div>
              )}
            </div>
          </div>
        )}

        {/* Doctor's Notes Input */}
        <div style={{ ...cardStyle, borderLeft: '4px solid #2563eb' }}>
          <div style={sectionTitleStyle}>
            <Edit3 size={18} style={{ color: '#2563eb' }} /> Your Consultation Notes
          </div>
          <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
            Type your brief consultation notes below. Include key observations, symptoms discussed, examination findings, and any decisions made. The AI will expand these into a comprehensive clinical summary.
          </p>
          <textarea
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            placeholder="e.g., Patient presents with persistent headaches for 2 weeks, worse in morning. BP 140/90. No visual disturbance. Prescribed paracetamol 1g QDS. Advised lifestyle changes - reduce salt, increase exercise. Review in 2 weeks with BP diary. Consider referral to neurology if no improvement..."
            rows={8}
            style={{ ...textareaStyle, minHeight: '180px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {doctorNotes.length} characters · {doctorNotes.split(/\s+/).filter(Boolean).length} words
            </span>
            <button
              onClick={generateAISummary}
              disabled={generating || !doctorNotes.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem',
                backgroundColor: generating ? '#94a3b8' : '#7c3aed', color: 'white', border: 'none',
                borderRadius: '8px', cursor: generating ? 'default' : 'pointer', fontWeight: 600,
                fontSize: '0.875rem', transition: 'all 0.2s'
              }}
            >
              {generating ? (
                <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
              ) : (
                <><Sparkles size={18} /> Generate AI Summary</>
              )}
            </button>
          </div>
        </div>

        {/* AI Generated Summary */}
        {(aiSummary || editedSummary) && (
          <div style={{ ...cardStyle, borderLeft: '4px solid #16a34a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={sectionTitleStyle}>
                <CheckCircle size={18} style={{ color: '#16a34a' }} /> 
                {existingSummary ? 'Consultation Summary' : 'AI-Generated Summary'}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setEditMode(!editMode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem',
                    backgroundColor: editMode ? '#fee2e2' : '#f1f5f9', color: editMode ? '#dc2626' : '#64748b',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500
                  }}
                >
                  <Edit3 size={14} /> {editMode ? 'Cancel Edit' : 'Edit'}
                </button>
                {!existingSummary && (
                  <button
                    onClick={generateAISummary}
                    disabled={generating}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem',
                      backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500
                    }}
                  >
                    <RefreshCw size={14} /> Regenerate
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Diagnosis */}
              <div style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Diagnosis</span>
                {editMode ? (
                  <textarea value={editedSummary?.diagnosis || ''} onChange={(e) => handleEditField('diagnosis', e.target.value)} style={textareaStyle} rows={2} />
                ) : (
                  <div style={{ ...fieldDisplayStyle, fontWeight: 500, borderLeft: '3px solid #2563eb' }}>{editedSummary?.diagnosis || 'N/A'}</div>
                )}
              </div>

              {/* Symptoms */}
              <div>
                <span style={labelStyle}>Symptoms Presented</span>
                {editMode ? (
                  <textarea value={editedSummary?.symptoms_presented || ''} onChange={(e) => handleEditField('symptoms_presented', e.target.value)} style={textareaStyle} rows={3} />
                ) : (
                  <div style={fieldDisplayStyle}>{editedSummary?.symptoms_presented || 'N/A'}</div>
                )}
              </div>

              {/* Examination */}
              <div>
                <span style={labelStyle}>Examination Findings</span>
                {editMode ? (
                  <textarea value={editedSummary?.examination_findings || ''} onChange={(e) => handleEditField('examination_findings', e.target.value)} style={textareaStyle} rows={3} />
                ) : (
                  <div style={fieldDisplayStyle}>{editedSummary?.examination_findings || 'N/A'}</div>
                )}
              </div>

              {/* Treatment Plan */}
              <div style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Treatment Plan</span>
                {editMode ? (
                  <textarea value={editedSummary?.treatment_plan || ''} onChange={(e) => handleEditField('treatment_plan', e.target.value)} style={textareaStyle} rows={3} />
                ) : (
                  <div style={{ ...fieldDisplayStyle, borderLeft: '3px solid #16a34a' }}>{editedSummary?.treatment_plan || 'N/A'}</div>
                )}
              </div>

              {/* Medications */}
              <div>
                <span style={labelStyle}>Medications Prescribed</span>
                {editMode ? (
                  <textarea value={editedSummary?.medications_prescribed || ''} onChange={(e) => handleEditField('medications_prescribed', e.target.value)} style={textareaStyle} rows={3} />
                ) : (
                  <div style={fieldDisplayStyle}>{editedSummary?.medications_prescribed || 'None'}</div>
                )}
              </div>

              {/* Lifestyle */}
              <div>
                <span style={labelStyle}>Lifestyle Recommendations</span>
                {editMode ? (
                  <textarea value={editedSummary?.lifestyle_recommendations || ''} onChange={(e) => handleEditField('lifestyle_recommendations', e.target.value)} style={textareaStyle} rows={3} />
                ) : (
                  <div style={fieldDisplayStyle}>{editedSummary?.lifestyle_recommendations || 'None'}</div>
                )}
              </div>

              {/* Patient Education */}
              <div style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Patient Education</span>
                {editMode ? (
                  <textarea value={editedSummary?.patient_education || ''} onChange={(e) => handleEditField('patient_education', e.target.value)} style={textareaStyle} rows={2} />
                ) : (
                  <div style={fieldDisplayStyle}>{editedSummary?.patient_education || 'N/A'}</div>
                )}
              </div>

              {/* Follow-up */}
              <div style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Follow-up</span>
                {editMode ? (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={editedSummary?.follow_up_required || false} onChange={(e) => handleEditField('follow_up_required', e.target.checked)} />
                      <span style={{ fontSize: '0.875rem' }}>Follow-up required</span>
                    </label>
                    {editedSummary?.follow_up_required && (
                      <textarea value={editedSummary?.follow_up_notes || ''} onChange={(e) => handleEditField('follow_up_notes', e.target.value)} placeholder="Follow-up details..." style={textareaStyle} rows={2} />
                    )}
                  </div>
                ) : (
                  <div style={{
                    ...fieldDisplayStyle,
                    backgroundColor: editedSummary?.follow_up_required ? '#fef3c7' : '#f0fdf4',
                    borderColor: editedSummary?.follow_up_required ? '#fde68a' : '#bbf7d0'
                  }}>
                    {editedSummary?.follow_up_required ? (
                      <><strong>Follow-up required:</strong> {editedSummary.follow_up_notes || 'See notes'}</>
                    ) : 'No follow-up required'}
                  </div>
                )}

                {/* Follow-up Scheduling */}
                {editedSummary?.follow_up_required && (
                  <div style={{
                    marginTop: '0.75rem', padding: '1rem', backgroundColor: '#fffbeb',
                    borderRadius: '8px', border: '1px solid #fde68a'
                  }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e', marginBottom: '0.75rem' }}>
                      📅 Schedule Follow-up Appointment
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Date *</label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          style={{
                            width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0',
                            borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Time</label>
                        <input
                          type="time"
                          value={followUpTime}
                          onChange={(e) => setFollowUpTime(e.target.value)}
                          style={{
                            width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0',
                            borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
                        <select
                          value={followUpPriority}
                          onChange={(e) => setFollowUpPriority(e.target.value)}
                          style={{
                            width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0',
                            borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box',
                            backgroundColor: 'white'
                          }}
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                    </div>
                    {!followUpDate && (
                      <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem' }}>
                        Set a follow-up date to automatically schedule the appointment when saving.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Referral */}
              {(editedSummary?.referral_required || editMode) && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={labelStyle}>Referral</span>
                  {editMode ? (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editedSummary?.referral_required || false} onChange={(e) => handleEditField('referral_required', e.target.checked)} />
                        <span style={{ fontSize: '0.875rem' }}>Referral required</span>
                      </label>
                      {editedSummary?.referral_required && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <input value={editedSummary?.referral_specialty || ''} onChange={(e) => handleEditField('referral_specialty', e.target.value)} placeholder="Specialty" style={{ ...textareaStyle, resize: 'none' }} />
                          <input value={editedSummary?.referral_notes || ''} onChange={(e) => handleEditField('referral_notes', e.target.value)} placeholder="Reason for referral" style={{ ...textareaStyle, resize: 'none' }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ ...fieldDisplayStyle, backgroundColor: '#dbeafe', borderColor: '#bfdbfe' }}>
                      <strong>Referral to {editedSummary.referral_specialty}:</strong> {editedSummary.referral_notes || ''}
                    </div>
                  )}
                </div>
              )}

              {/* Red Flags */}
              <div style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>⚠️ Red Flags / Warning Signs</span>
                {editMode ? (
                  <textarea value={editedSummary?.red_flags || ''} onChange={(e) => handleEditField('red_flags', e.target.value)} style={textareaStyle} rows={2} />
                ) : (
                  editedSummary?.red_flags ? (
                    <div style={{ ...fieldDisplayStyle, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderLeft: '3px solid #ef4444' }}>
                      {editedSummary.red_flags}
                    </div>
                  ) : (
                    <div style={fieldDisplayStyle}>None identified</div>
                  )
                )}
              </div>

              {/* Additional Notes */}
              <div style={{ gridColumn: 'span 2' }}>
                <span style={labelStyle}>Additional Notes</span>
                {editMode ? (
                  <textarea value={editedSummary?.additional_notes || ''} onChange={(e) => handleEditField('additional_notes', e.target.value)} style={textareaStyle} rows={2} />
                ) : (
                  <div style={fieldDisplayStyle}>{editedSummary?.additional_notes || 'None'}</div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={() => navigate('/doctor/appointments')}
                style={{
                  padding: '0.75rem 1.5rem', backgroundColor: '#f1f5f9', color: '#64748b',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveSummary}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem',
                  backgroundColor: saving ? '#94a3b8' : '#16a34a', color: 'white', border: 'none',
                  borderRadius: '8px', cursor: saving ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.875rem'
                }}
              >
                {saving ? (
                  <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Consultation Summary</>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AIConsultationNotes;