import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Save,
  CheckCircle,
  Send,
  Stethoscope,
  Building2,
  Phone,
  Mail,
  AlertTriangle,
  ClipboardList,
  Plus,
  Trash2
} from 'lucide-react';

const CreateReferral = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [existingReferral, setExistingReferral] = useState(null);

  const [formData, setFormData] = useState({
    referral_type: 'specialist',
    urgency: 'routine',
    referred_to_name: '',
    referred_to_specialty: '',
    referred_to_hospital: '',
    referred_to_address: '',
    referred_to_phone: '',
    referred_to_email: '',
    reason_for_referral: '',
    clinical_summary: '',
    current_diagnosis: '',
    relevant_history: '',
    current_medications: '',
    investigations_done: '',
    investigation_results: '',
    specific_questions: '',
    additional_notes: '',
    patient_aware: true,
    patient_consent: true
  });

  const specialties = [
    'Cardiology', 'Dermatology', 'Endocrinology', 'ENT (Ear, Nose & Throat)',
    'Gastroenterology', 'General Surgery', 'Gynaecology', 'Haematology',
    'Neurology', 'Oncology', 'Ophthalmology', 'Orthopaedics',
    'Paediatrics', 'Psychiatry', 'Pulmonology', 'Radiology',
    'Rheumatology', 'Urology', 'Physiotherapy', 'Other'
  ];

  const urgencyOptions = [
    { value: 'routine', label: 'Routine', color: '#22c55e', desc: 'Within 4-6 weeks' },
    { value: 'urgent', label: 'Urgent', color: '#f59e0b', desc: 'Within 1-2 weeks' },
    { value: 'emergency', label: 'Emergency', color: '#ef4444', desc: 'Immediate / Same day' }
  ];

  useEffect(() => {
    if (user && appointmentId) {
      fetchData();
    }
  }, [user, appointmentId]);

  const fetchData = async () => {
    try {
      // Fetch appointment
      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (aptError) throw aptError;
      setAppointment(apt);

      // Fetch doctor info
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id, user_id, specialisation, license_number')
        .eq('user_id', user.id)
        .single();

      if (doctor) {
        const { data: doctorProfile } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', doctor.user_id)
          .single();

        setDoctorInfo({ ...doctor, ...doctorProfile });
      }

      // Fetch patient info
      if (apt?.patient_id) {
        const { data: patient } = await supabase
          .from('patients')
          .select('id, user_id, date_of_birth, gender, nhs_number, address')
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
      }

      // Check for existing referral
      const { data: existing } = await supabase
        .from('referrals')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (existing) {
        setExistingReferral(existing);
        setFormData({
          referral_type: existing.referral_type || 'specialist',
          urgency: existing.urgency || 'routine',
          referred_to_name: existing.referred_to_name || '',
          referred_to_specialty: existing.referred_to_specialty || '',
          referred_to_hospital: existing.referred_to_hospital || '',
          referred_to_address: existing.referred_to_address || '',
          referred_to_phone: existing.referred_to_phone || '',
          referred_to_email: existing.referred_to_email || '',
          reason_for_referral: existing.reason_for_referral || '',
          clinical_summary: existing.clinical_summary || '',
          current_diagnosis: existing.current_diagnosis || '',
          relevant_history: existing.relevant_history || '',
          current_medications: existing.current_medications || '',
          investigations_done: existing.investigations_done || '',
          investigation_results: existing.investigation_results || '',
          specific_questions: existing.specific_questions || '',
          additional_notes: existing.additional_notes || '',
          patient_aware: existing.patient_aware ?? true,
          patient_consent: existing.patient_consent ?? true
        });
      }

      // Pre-fill from consultation summary if available
      if (!existing) {
        const { data: summary } = await supabase
          .from('consultation_summaries')
          .select('*')
          .eq('appointment_id', appointmentId)
          .maybeSingle();

        if (summary) {
          setFormData(prev => ({
            ...prev,
            current_diagnosis: summary.diagnosis || '',
            clinical_summary: summary.treatment_plan || '',
            current_medications: summary.medications_prescribed || '',
            relevant_history: summary.symptoms_presented || '',
            referred_to_specialty: summary.referral_specialty || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
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

  const handleSubmit = async (e, status = 'draft') => {
    e.preventDefault();

    if (!formData.reason_for_referral.trim()) {
      toast.error('Please enter the reason for referral');
      return;
    }
    if (!formData.referred_to_specialty) {
      toast.error('Please select a specialty');
      return;
    }

    setSaving(true);
    try {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctor) {
        toast.error('Doctor record not found');
        return;
      }

      const referralPayload = {
        appointment_id: appointmentId,
        doctor_id: doctor.id,
        patient_id: appointment.patient_id,
        status: status,
        referral_type: formData.referral_type,
        urgency: formData.urgency,
        referred_to_name: formData.referred_to_name,
        referred_to_specialty: formData.referred_to_specialty,
        referred_to_hospital: formData.referred_to_hospital,
        referred_to_address: formData.referred_to_address,
        referred_to_phone: formData.referred_to_phone,
        referred_to_email: formData.referred_to_email,
        reason_for_referral: formData.reason_for_referral,
        clinical_summary: formData.clinical_summary,
        current_diagnosis: formData.current_diagnosis,
        relevant_history: formData.relevant_history,
        current_medications: formData.current_medications,
        investigations_done: formData.investigations_done,
        investigation_results: formData.investigation_results,
        specific_questions: formData.specific_questions,
        additional_notes: formData.additional_notes,
        patient_aware: formData.patient_aware,
        patient_consent: formData.patient_consent,
        referral_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingReferral) {
        const { error: updateError } = await supabase
          .from('referrals')
          .update(referralPayload)
          .eq('id', existingReferral.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('referrals')
          .insert(referralPayload);
        error = insertError;
      }

      if (error) throw error;

      toast.success(status === 'sent' ? 'Referral letter sent!' : 'Referral saved as draft');
      navigate('/doctor/appointments');
    } catch (error) {
      console.error('Error saving referral:', error);
      toast.error('Failed to save referral: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Styles
  const pageStyle = { minHeight: '100vh', backgroundColor: '#f8fafc' };
  const headerStyle = { backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 };
  const backLinkStyle = { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' };
  const mainStyle = { maxWidth: '900px', margin: '0 auto', padding: '2rem' };
  const cardStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' };
  const sectionTitleStyle = { fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' };
  const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' };
  const inputStyle = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' };
  const textareaStyle = { ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' };
  const selectStyle = { ...inputStyle, backgroundColor: 'white', cursor: 'pointer' };
  const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' };
  const btnPrimaryStyle = { padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' };
  const btnSecondaryStyle = { ...btnPrimaryStyle, backgroundColor: '#64748b' };
  const btnSuccessStyle = { ...btnPrimaryStyle, backgroundColor: '#16a34a' };
  const checkboxContainerStyle = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ color: '#64748b' }}>Loading referral form...</p>
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
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/doctor/appointments" style={backLinkStyle}>
            <ArrowLeft size={20} /> Back to Appointments
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>
              {existingReferral ? 'Edit Referral Letter' : 'New Referral Letter'}
            </span>
          </div>
        </div>
      </header>

      <main style={mainStyle}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          {existingReferral ? 'Edit Referral Letter' : 'Create Referral Letter'}
        </h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Create a professional referral letter for specialist consultation
        </p>

        <form onSubmit={(e) => handleSubmit(e, 'sent')}>
          {/* Patient & Doctor Info Card */}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <User size={20} style={{ color: '#2563eb' }} />
              Patient & Referring Doctor Information
            </div>
            <div style={gridStyle}>
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient</p>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{patientInfo?.full_name || 'Unknown'}</p>
                {patientInfo?.date_of_birth && (
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    DOB: {formatDate(patientInfo.date_of_birth)} (Age: {calculateAge(patientInfo.date_of_birth)})
                  </p>
                )}
                {patientInfo?.gender && (
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Gender: {patientInfo.gender}</p>
                )}
                {patientInfo?.nhs_number && (
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>NHS: {patientInfo.nhs_number}</p>
                )}
                {patientInfo?.address && (
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{patientInfo.address}</p>
                )}
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referring Doctor</p>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Dr. {doctorInfo?.full_name || 'Unknown'}</p>
                {doctorInfo?.specialisation && (
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{doctorInfo.specialisation}</p>
                )}
                {doctorInfo?.license_number && (
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>GMC: {doctorInfo.license_number}</p>
                )}
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>Dr. Naren Clinic</p>
              </div>
            </div>
          </div>

          {/* Referral Details */}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <Send size={20} style={{ color: '#2563eb' }} />
              Referral Details
            </div>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Referral Type *</label>
                <select name="referral_type" value={formData.referral_type} onChange={handleChange} style={selectStyle}>
                  <option value="specialist">Specialist Consultation</option>
                  <option value="investigation">Investigation / Diagnostic</option>
                  <option value="treatment">Treatment / Procedure</option>
                  <option value="second_opinion">Second Opinion</option>
                  <option value="physiotherapy">Physiotherapy</option>
                  <option value="mental_health">Mental Health</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Urgency *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {urgencyOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, urgency: opt.value }))}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: `2px solid ${formData.urgency === opt.value ? opt.color : '#e2e8f0'}`,
                        borderRadius: '8px',
                        backgroundColor: formData.urgency === opt.value ? `${opt.color}15` : 'white',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <p style={{ fontWeight: 600, color: opt.color, fontSize: '0.8rem' }}>{opt.label}</p>
                      <p style={{ fontSize: '0.7rem', color: '#64748b' }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={labelStyle}>Referred To - Specialty *</label>
              <select name="referred_to_specialty" value={formData.referred_to_specialty} onChange={handleChange} style={selectStyle} required>
                <option value="">Select specialty...</option>
                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Referred To Details */}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <Building2 size={20} style={{ color: '#2563eb' }} />
              Referred To (Specialist/Hospital Details)
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Fill in if you have specific specialist details. Leave blank if referring to any available specialist.
            </p>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Specialist Name</label>
                <input type="text" name="referred_to_name" value={formData.referred_to_name} onChange={handleChange} style={inputStyle} placeholder="Dr. / Mr. / Ms." />
              </div>
              <div>
                <label style={labelStyle}>Hospital / Clinic</label>
                <input type="text" name="referred_to_hospital" value={formData.referred_to_hospital} onChange={handleChange} style={inputStyle} placeholder="Hospital or clinic name" />
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={labelStyle}>Address</label>
              <input type="text" name="referred_to_address" value={formData.referred_to_address} onChange={handleChange} style={inputStyle} placeholder="Full address" />
            </div>
            <div style={{ ...gridStyle, marginTop: '1rem' }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" name="referred_to_phone" value={formData.referred_to_phone} onChange={handleChange} style={inputStyle} placeholder="Contact number" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" name="referred_to_email" value={formData.referred_to_email} onChange={handleChange} style={inputStyle} placeholder="Email address" />
              </div>
            </div>
          </div>

          {/* Clinical Information */}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <Stethoscope size={20} style={{ color: '#2563eb' }} />
              Clinical Information
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Reason for Referral *</label>
              <textarea name="reason_for_referral" value={formData.reason_for_referral} onChange={handleChange} style={textareaStyle} placeholder="Clearly state why this referral is being made..." required />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Current Diagnosis</label>
              <textarea name="current_diagnosis" value={formData.current_diagnosis} onChange={handleChange} style={{ ...textareaStyle, minHeight: '80px' }} placeholder="Working diagnosis or confirmed diagnosis..." />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Clinical Summary</label>
              <textarea name="clinical_summary" value={formData.clinical_summary} onChange={handleChange} style={textareaStyle} placeholder="Brief summary of the patient's clinical presentation..." />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Relevant Medical History</label>
              <textarea name="relevant_history" value={formData.relevant_history} onChange={handleChange} style={{ ...textareaStyle, minHeight: '80px' }} placeholder="Past medical history, surgical history, family history relevant to referral..." />
            </div>
            <div>
              <label style={labelStyle}>Current Medications</label>
              <textarea name="current_medications" value={formData.current_medications} onChange={handleChange} style={{ ...textareaStyle, minHeight: '80px' }} placeholder="List all current medications with dosages..." />
            </div>
          </div>

          {/* Investigations */}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <ClipboardList size={20} style={{ color: '#2563eb' }} />
              Investigations & Results
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Investigations Done</label>
              <textarea name="investigations_done" value={formData.investigations_done} onChange={handleChange} style={{ ...textareaStyle, minHeight: '80px' }} placeholder="Blood tests, imaging, ECG, etc. that have been performed..." />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Investigation Results</label>
              <textarea name="investigation_results" value={formData.investigation_results} onChange={handleChange} style={{ ...textareaStyle, minHeight: '80px' }} placeholder="Key findings from investigations..." />
            </div>
            <div>
              <label style={labelStyle}>Specific Questions for Specialist</label>
              <textarea name="specific_questions" value={formData.specific_questions} onChange={handleChange} style={{ ...textareaStyle, minHeight: '80px' }} placeholder="Specific questions or requests for the specialist..." />
            </div>
          </div>

          {/* Additional Notes & Consent */}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
              Additional Information & Consent
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Additional Notes</label>
              <textarea name="additional_notes" value={formData.additional_notes} onChange={handleChange} style={{ ...textareaStyle, minHeight: '80px' }} placeholder="Any other relevant information..." />
            </div>
            <div style={checkboxContainerStyle}>
              <input type="checkbox" id="patient_aware" name="patient_aware" checked={formData.patient_aware} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="patient_aware" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                Patient is aware of this referral
              </label>
            </div>
            <div style={checkboxContainerStyle}>
              <input type="checkbox" id="patient_consent" name="patient_consent" checked={formData.patient_consent} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="patient_consent" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                Patient has given consent for sharing medical information
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={() => navigate('/doctor/appointments')}
              style={{ ...btnSecondaryStyle, backgroundColor: 'white', color: '#64748b', border: '1px solid #d1d5db' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={saving}
              style={btnSecondaryStyle}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="submit"
              disabled={saving}
              style={btnSuccessStyle}
            >
              <Send size={16} />
              {saving ? 'Sending...' : 'Save & Issue Referral'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateReferral;