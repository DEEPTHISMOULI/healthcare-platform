import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ClipboardList,
  AlertCircle,
  Pill,
  Heart,
  Thermometer,
  Clock,
  CheckCircle,
  Save,
  FileText
} from 'lucide-react';

const PreConsultationForm = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [existingForm, setExistingForm] = useState(null);

  const [formData, setFormData] = useState({
    chief_complaint: '',
    current_symptoms: '',
    symptom_duration: '',
    symptom_severity: 'moderate',
    current_medications: '',
    allergies: '',
    medical_history: '',
    family_history: '',
    lifestyle_notes: '',
    additional_notes: '',
    consent_given: false
  });

  useEffect(() => {
    if (user && appointmentId) {
      fetchAppointmentAndForm();
    }
  }, [user, appointmentId]);

  const fetchAppointmentAndForm = async () => {
    try {
      // Fetch appointment details
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (apptError) throw apptError;

      // Get doctor info
      if (appt?.doctor_id) {
        const { data: doctor } = await supabase
          .from('doctors')
          .select('user_id, specialisation')
          .eq('id', appt.doctor_id)
          .single();

        if (doctor?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', doctor.user_id)
            .single();
          
          appt.doctor_name = profile?.full_name || 'Doctor';
          appt.specialisation = doctor.specialisation;
        }
      }

      setAppointment(appt);

      // Check for existing pre-consultation form
      const { data: existingFormData } = await supabase
        .from('pre_consultation_forms')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (existingFormData) {
        setExistingForm(existingFormData);
        setFormData({
          chief_complaint: existingFormData.chief_complaint || '',
          current_symptoms: existingFormData.current_symptoms || '',
          symptom_duration: existingFormData.symptom_duration || '',
          symptom_severity: existingFormData.symptom_severity || 'moderate',
          current_medications: existingFormData.current_medications || '',
          allergies: existingFormData.allergies || '',
          medical_history: existingFormData.medical_history || '',
          family_history: existingFormData.family_history || '',
          lifestyle_notes: existingFormData.lifestyle_notes || '',
          additional_notes: existingFormData.additional_notes || '',
          consent_given: existingFormData.consent_given || false
        });
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

    if (!formData.chief_complaint.trim()) {
      toast.error('Please describe your main concern');
      return;
    }

    if (!formData.consent_given) {
      toast.error('Please accept the consent terms to continue');
      return;
    }

    setSaving(true);
    try {
      // Get patient ID
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patient) {
        toast.error('Patient record not found');
        return;
      }

      const formPayload = {
        appointment_id: appointmentId,
        patient_id: patient.id,
        chief_complaint: formData.chief_complaint,
        current_symptoms: formData.current_symptoms,
        symptom_duration: formData.symptom_duration,
        symptom_severity: formData.symptom_severity,
        current_medications: formData.current_medications,
        allergies: formData.allergies,
        medical_history: formData.medical_history,
        family_history: formData.family_history,
        lifestyle_notes: formData.lifestyle_notes,
        additional_notes: formData.additional_notes,
        consent_given: formData.consent_given,
        consent_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingForm) {
        // Update existing form
        const { error: updateError } = await supabase
          .from('pre_consultation_forms')
          .update(formPayload)
          .eq('id', existingForm.id);
        error = updateError;
      } else {
        // Create new form
        const { error: insertError } = await supabase
          .from('pre_consultation_forms')
          .insert(formPayload);
        error = insertError;
      }

      if (error) throw error;

      toast.success('Pre-consultation form saved successfully!');
      navigate('/patient/appointments');
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <AlertCircle size={64} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Appointment Not Found</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>The appointment you're looking for doesn't exist.</p>
          <Link to="/patient/appointments" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            ← Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/patient/appointments" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none' }}>
            <ArrowLeft size={20} /> Back to Appointments
          </Link>
          {existingForm && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              <CheckCircle size={14} /> Form Submitted
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        {/* Appointment Info Card */}
        <div style={{
          backgroundColor: '#eff6ff',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #bfdbfe'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ClipboardList size={20} color="#3b82f6" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e40af' }}>
              Pre-Consultation Form
            </h2>
          </div>
          <p style={{ color: '#1e40af', marginBottom: '1rem' }}>
            Please complete this form before your appointment with <strong>Dr. {appointment.doctor_name}</strong>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.875rem', color: '#3b82f6' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={16} /> {formatDate(appointment.scheduled_date)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {formatTime(appointment.scheduled_time)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Chief Complaint */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertCircle size={20} color="#dc2626" />
              <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Main Concern <span style={{ color: '#dc2626' }}>*</span></h3>
            </div>
            <textarea
              name="chief_complaint"
              value={formData.chief_complaint}
              onChange={handleChange}
              placeholder="What is the main reason for your visit today? Please describe your primary concern..."
              rows={4}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Current Symptoms */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Thermometer size={20} color="#f59e0b" />
              <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Current Symptoms</h3>
            </div>
            <textarea
              name="current_symptoms"
              value={formData.current_symptoms}
              onChange={handleChange}
              placeholder="Describe your symptoms in detail (e.g., pain location, type, what makes it better or worse)..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                resize: 'vertical',
                marginBottom: '1rem'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  How long have you had these symptoms?
                </label>
                <select
                  name="symptom_duration"
                  value={formData.symptom_duration}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select duration</option>
                  <option value="Today">Today</option>
                  <option value="1-3 days">1-3 days</option>
                  <option value="4-7 days">4-7 days</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="2-4 weeks">2-4 weeks</option>
                  <option value="1-3 months">1-3 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="More than 6 months">More than 6 months</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Symptom Severity
                </label>
                <select
                  name="symptom_severity"
                  value={formData.symptom_severity}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="mild">Mild - Noticeable but manageable</option>
                  <option value="moderate">Moderate - Affecting daily activities</option>
                  <option value="severe">Severe - Significantly limiting</option>
                  <option value="very_severe">Very Severe - Unable to function</option>
                </select>
              </div>
            </div>
          </div>

          {/* Medications & Allergies */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Pill size={20} color="#8b5cf6" />
              <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Medications & Allergies</h3>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Current Medications
              </label>
              <textarea
                name="current_medications"
                value={formData.current_medications}
                onChange={handleChange}
                placeholder="List any medications you are currently taking (including supplements and over-the-counter medicines)..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Known Allergies
              </label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="List any known allergies (medications, food, environmental)..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Medical History */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Heart size={20} color="#ec4899" />
              <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Medical History</h3>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Past Medical Conditions
              </label>
              <textarea
                name="medical_history"
                value={formData.medical_history}
                onChange={handleChange}
                placeholder="List any past medical conditions, surgeries, or hospitalizations..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Family Medical History
              </label>
              <textarea
                name="family_history"
                value={formData.family_history}
                onChange={handleChange}
                placeholder="Any significant medical conditions in your family (parents, siblings)..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Lifestyle Notes
              </label>
              <textarea
                name="lifestyle_notes"
                value={formData.lifestyle_notes}
                onChange={handleChange}
                placeholder="Relevant lifestyle information (smoking, alcohol, exercise habits, diet, occupation)..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <FileText size={20} color="#64748b" />
              <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Additional Information</h3>
            </div>
            <textarea
              name="additional_notes"
              value={formData.additional_notes}
              onChange={handleChange}
              placeholder="Anything else you'd like the doctor to know before your consultation..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Consent */}
          <div style={{
            backgroundColor: '#fffbeb',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #fde68a'
          }}>
            <h3 style={{ fontWeight: 600, color: '#92400e', marginBottom: '1rem' }}>Consent & Agreement</h3>
            <div style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '1rem', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '0.5rem' }}>By submitting this form, I confirm that:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li>The information provided is accurate to the best of my knowledge</li>
                <li>I understand this is a telemedicine consultation</li>
                <li>I consent to my medical information being shared with the consulting doctor</li>
                <li>I understand that in case of emergency, I should call emergency services or visit A&E</li>
              </ul>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="consent_given"
                checked={formData.consent_given}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', accentColor: '#3b82f6' }}
              />
              <span style={{ fontWeight: 500, color: '#92400e' }}>
                I agree to the above terms and consent to the telemedicine consultation <span style={{ color: '#dc2626' }}>*</span>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: saving ? '#93c5fd' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {saving ? (
              <>
                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                {existingForm ? 'Update Form' : 'Submit Form'}
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default PreConsultationForm;
