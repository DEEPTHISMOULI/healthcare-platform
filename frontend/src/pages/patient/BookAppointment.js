import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Phone,
  Check,
  ChevronRight,
  ChevronLeft,
  FileText,
  Shield,
  AlertCircle
} from 'lucide-react';

const BookAppointment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [consultationType, setConsultationType] = useState('video');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [consentGiven, setConsentGiven] = useState(false);
  
  // Pre-consultation form
  const [formData, setFormData] = useState({
    chief_complaint: '',
    symptoms_duration: '',
    current_medications: '',
    allergies: '',
    medical_history: '',
    previous_treatments: '',
    additional_notes: ''
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('*');

      if (doctorsError) throw doctorsError;

      if (!doctorsData || doctorsData.length === 0) {
        setDoctors([]);
        setLoading(false);
        return;
      }

      const userIds = doctorsData.map(d => d.user_id);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const doctorsWithProfiles = doctorsData.map(doctor => {
        const profile = profilesData?.find(p => p.id === doctor.user_id);
        return {
          ...doctor,
          full_name: profile?.full_name || 'Doctor',
          email: profile?.email || ''
        };
      });

      setDoctors(doctorsWithProfiles);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (doctorId, date) => {
    try {
      // Check if it's a weekend
      const selectedDate = new Date(date);
      const dayOfWeekNum = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      if (dayOfWeekNum === 0 || dayOfWeekNum === 6) {
        setAvailableSlots([]);
        return;
      }

      // Try to get doctor's schedule
      const { data: schedule } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .single();

      let startTime = '09:00';
      let endTime = '17:00';
      let slotDuration = 30;
      let breakStart = '13:00';
      let breakEnd = '14:00';
      let dayEnabled = true;

      // If schedule exists, use it
      if (schedule) {
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = schedule.weekly_schedule?.[dayOfWeek];

        if (daySchedule) {
          dayEnabled = daySchedule.enabled !== false;
          startTime = daySchedule.start || startTime;
          endTime = daySchedule.end || endTime;
        }
        slotDuration = schedule.slot_duration || slotDuration;
        breakStart = schedule.break_start || breakStart;
        breakEnd = schedule.break_end || breakEnd;
      }

      if (!dayEnabled) {
        setAvailableSlots([]);
        return;
      }

      // Generate time slots
      const slots = [];
      let current = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const breakS = new Date(`2000-01-01T${breakStart}`);
      const breakE = new Date(`2000-01-01T${breakEnd}`);

      while (current < end) {
        const timeStr = current.toTimeString().slice(0, 5);
        // Skip break time
        if (!(current >= breakS && current < breakE)) {
          slots.push(timeStr);
        }
        current = new Date(current.getTime() + slotDuration * 60000);
      }

      // Remove already booked slots
      const { data: existingAppts } = await supabase
        .from('appointments')
        .select('scheduled_time')
        .eq('doctor_id', doctorId)
        .eq('scheduled_date', date)
        .neq('status', 'cancelled');

      const bookedTimes = existingAppts?.map(a => a.scheduled_time?.slice(0, 5)) || [];
      const available = slots.filter(slot => !bookedTimes.includes(slot));
      setAvailableSlots(available);

    } catch (error) {
      console.error('Error fetching slots:', error);
      // On error, still show default slots
      const defaultSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
      setAvailableSlots(defaultSlots);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
    if (selectedDoctor) {
      fetchAvailableSlots(selectedDoctor.id, date);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime || !consentGiven) {
      toast.error('Please complete all steps');
      return;
    }

    if (!formData.chief_complaint) {
      toast.error('Please describe your main concern');
      return;
    }

    setBooking(true);
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let patientId = patient?.id;

      if (!patientId) {
        const { data: newPatient } = await supabase
          .from('patients')
          .insert({ user_id: user.id })
          .select()
          .single();
        patientId = newPatient?.id;
      }

      // Create appointment
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          doctor_id: selectedDoctor.id,
          scheduled_date: selectedDate,
          scheduled_time: selectedTime,
          duration_minutes: 30,
          type: consultationType,
          status: 'confirmed'
        })
        .select()
        .single();

      if (aptError) throw aptError;

      // Save consultation form
      const { error: formError } = await supabase
        .from('consultation_forms')
        .insert({
          appointment_id: appointment.id,
          patient_id: patientId,
          chief_complaint: formData.chief_complaint,
          symptoms_duration: formData.symptoms_duration,
          current_medications: formData.current_medications,
          allergies: formData.allergies,
          medical_history: formData.medical_history,
          previous_treatments: formData.previous_treatments,
          additional_notes: formData.additional_notes,
          consent_given: true,
          consent_timestamp: new Date().toISOString()
        });

      if (formError) console.error('Form save error:', formError);

      toast.success('Appointment booked successfully!');
      navigate('/patient/appointments');

    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const canProceedStep1 = selectedDoctor && consentGiven;
  const canProceedStep2 = selectedDate && selectedTime;
  const canProceedStep3 = formData.chief_complaint.trim() !== '';

  const steps = [
    { num: 1, label: 'Select Doctor' },
    { num: 2, label: 'Date & Time' },
    { num: 3, label: 'Health Info' },
    { num: 4, label: 'Confirm' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem' }}>
          🏥 Dr. Naren Clinic
        </h1>
        
        <Link to="/patient/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', textDecoration: 'none', marginBottom: '2rem' }}>
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem 4rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          Book a Consultation
        </h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Schedule a video or audio consultation with our doctors
        </p>

        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: step >= s.num ? '#3b82f6' : '#e2e8f0',
                  color: step >= s.num ? 'white' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}>
                  {step > s.num ? <Check size={16} /> : s.num}
                </div>
                <span style={{ color: step >= s.num ? '#1e293b' : '#94a3b8', fontWeight: step === s.num ? 600 : 400, fontSize: '0.875rem' }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: '40px', height: '2px', backgroundColor: step > s.num ? '#3b82f6' : '#e2e8f0' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          
          {/* Step 1: Select Doctor + Consent */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Select a Doctor</h2>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner"></div></div>
              ) : doctors.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No doctors available</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  {doctors.map(doctor => (
                    <div
                      key={doctor.id}
                      onClick={() => setSelectedDoctor(doctor)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.5rem',
                        border: `2px solid ${selectedDoctor?.id === doctor.id ? '#3b82f6' : '#e2e8f0'}`,
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        backgroundColor: selectedDoctor?.id === doctor.id ? '#eff6ff' : 'white'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                          {doctor.full_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#1e293b' }}>Dr. {doctor.full_name}</p>
                          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{doctor.specialisation || 'General Practice'}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 600, color: '#059669' }}>£{doctor.consultation_fee || 50}</p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>per consultation</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Consent Section */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <Shield size={24} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Consent & Terms</h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
                      By booking this consultation, you agree to the following:
                    </p>
                  </div>
                </div>
                
                <ul style={{ fontSize: '0.875rem', color: '#64748b', paddingLeft: '2.5rem', marginBottom: '1rem', lineHeight: 1.8 }}>
                  <li>I consent to receive telemedicine services from Dr. Naren Clinic</li>
                  <li>I understand this consultation does not replace emergency medical care</li>
                  <li>I confirm the information I provide is accurate and complete</li>
                  <li>I consent to the storage of my medical information securely</li>
                  <li>I understand the consultation fee and payment terms</li>
                </ul>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', backgroundColor: consentGiven ? '#dcfce7' : 'white', borderRadius: '0.5rem', border: `2px solid ${consentGiven ? '#22c55e' : '#e2e8f0'}` }}>
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#22c55e' }}
                  />
                  <span style={{ fontWeight: 500, color: consentGiven ? '#166534' : '#374151' }}>
                    I have read and agree to the terms and conditions
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: canProceedStep1 ? '#3b82f6' : '#e2e8f0',
                    color: canProceedStep1 ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Select Date & Time</h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Consultation Type</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => setConsultationType('video')}
                    style={{
                      flex: 1, padding: '1rem',
                      border: `2px solid ${consultationType === 'video' ? '#3b82f6' : '#e2e8f0'}`,
                      borderRadius: '0.75rem',
                      backgroundColor: consultationType === 'video' ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                  >
                    <Video size={20} color={consultationType === 'video' ? '#3b82f6' : '#64748b'} />
                    <span style={{ color: consultationType === 'video' ? '#3b82f6' : '#64748b', fontWeight: 500 }}>Video Call</span>
                  </button>
                  <button
                    onClick={() => setConsultationType('audio')}
                    style={{
                      flex: 1, padding: '1rem',
                      border: `2px solid ${consultationType === 'audio' ? '#3b82f6' : '#e2e8f0'}`,
                      borderRadius: '0.75rem',
                      backgroundColor: consultationType === 'audio' ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                  >
                    <Phone size={20} color={consultationType === 'audio' ? '#3b82f6' : '#64748b'} />
                    <span style={{ color: consultationType === 'audio' ? '#3b82f6' : '#64748b', fontWeight: 500 }}>Audio Call</span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={today}
                  max={maxDateStr}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }}
                />
              </div>

              {selectedDate && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Available Time Slots</label>
                  {availableSlots.length === 0 ? (
                    <p style={{ color: '#64748b', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                      No available slots for this date. Please select another date.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          style={{
                            padding: '0.75rem',
                            border: `2px solid ${selectedTime === slot ? '#3b82f6' : '#e2e8f0'}`,
                            borderRadius: '0.5rem',
                            backgroundColor: selectedTime === slot ? '#eff6ff' : 'white',
                            cursor: 'pointer',
                            fontWeight: selectedTime === slot ? 600 : 400,
                            color: selectedTime === slot ? '#3b82f6' : '#1e293b'
                          }}
                        >
                          {formatTime(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ChevronLeft size={18} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: canProceedStep2 ? '#3b82f6' : '#e2e8f0',
                    color: canProceedStep2 ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: canProceedStep2 ? 'pointer' : 'not-allowed',
                    fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}

          {/* Step 3: Pre-consultation Form */}
          {step === 3 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <FileText size={24} color="#3b82f6" />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Pre-Consultation Questionnaire</h2>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Help the doctor understand your condition better</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Main Concern / Reason for Visit <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    name="chief_complaint"
                    value={formData.chief_complaint}
                    onChange={handleFormChange}
                    placeholder="Describe your main health concern or symptoms..."
                    rows={3}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>How long have you had these symptoms?</label>
                  <select
                    name="symptoms_duration"
                    value={formData.symptoms_duration}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', backgroundColor: 'white' }}
                  >
                    <option value="">Select duration</option>
                    <option value="Today">Today</option>
                    <option value="1-3 days">1-3 days</option>
                    <option value="4-7 days">4-7 days</option>
                    <option value="1-2 weeks">1-2 weeks</option>
                    <option value="2-4 weeks">2-4 weeks</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="More than 3 months">More than 3 months</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Current Medications</label>
                  <textarea
                    name="current_medications"
                    value={formData.current_medications}
                    onChange={handleFormChange}
                    placeholder="List any medications you're currently taking..."
                    rows={2}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Known Allergies</label>
                  <input
                    type="text"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleFormChange}
                    placeholder="e.g., Penicillin, Peanuts, None"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Relevant Medical History</label>
                  <textarea
                    name="medical_history"
                    value={formData.medical_history}
                    onChange={handleFormChange}
                    placeholder="Any past surgeries, chronic conditions, or relevant medical history..."
                    rows={2}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Previous Treatments Tried</label>
                  <textarea
                    name="previous_treatments"
                    value={formData.previous_treatments}
                    onChange={handleFormChange}
                    placeholder="Have you tried any treatments for this condition?"
                    rows={2}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Additional Notes</label>
                  <textarea
                    name="additional_notes"
                    value={formData.additional_notes}
                    onChange={handleFormChange}
                    placeholder="Anything else you'd like the doctor to know..."
                    rows={2}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button onClick={() => setStep(2)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ChevronLeft size={18} /> Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!canProceedStep3}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: canProceedStep3 ? '#3b82f6' : '#e2e8f0',
                    color: canProceedStep3 ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: canProceedStep3 ? 'pointer' : 'not-allowed',
                    fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  Review Booking <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Confirm Your Booking</h2>

              <div style={{ backgroundColor: '#f8fafc', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '1.5rem' }}>
                    {selectedDoctor?.full_name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1e293b' }}>Dr. {selectedDoctor?.full_name}</p>
                    <p style={{ color: '#64748b' }}>{selectedDoctor?.specialisation || 'General Practice'}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Calendar size={20} color="#64748b" />
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Date</p>
                      <p style={{ fontWeight: 500, color: '#1e293b' }}>
                        {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock size={20} color="#64748b" />
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Time</p>
                      <p style={{ fontWeight: 500, color: '#1e293b' }}>{formatTime(selectedTime)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {consultationType === 'video' ? <Video size={20} color="#64748b" /> : <Phone size={20} color="#64748b" />}
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Type</p>
                      <p style={{ fontWeight: 500, color: '#1e293b' }}>{consultationType === 'video' ? 'Video' : 'Audio'} Consultation</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>£</div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Fee</p>
                      <p style={{ fontWeight: 500, color: '#059669' }}>£{selectedDoctor?.consultation_fee || 50}</p>
                    </div>
                  </div>
                </div>

                {/* Summary of health info */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} /> Health Information Summary
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    <strong>Main Concern:</strong> {formData.chief_complaint}
                  </p>
                  {formData.symptoms_duration && (
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      <strong>Duration:</strong> {formData.symptoms_duration}
                    </p>
                  )}
                </div>
              </div>

              {/* Consent confirmation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#dcfce7', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <Check size={18} color="#166534" />
                <span style={{ fontSize: '0.875rem', color: '#166534' }}>Terms and conditions accepted</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(3)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ChevronLeft size={18} /> Back
                </button>
                <button
                  onClick={handleBookAppointment}
                  disabled={booking}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: booking ? '#93c5fd' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: booking ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {booking ? (
                    <><span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span> Booking...</>
                  ) : (
                    <><Check size={18} /> Confirm Booking</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BookAppointment;