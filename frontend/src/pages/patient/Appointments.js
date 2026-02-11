import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  User,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ClipboardList
} from 'lucide-react';

const PatientAppointments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [formStatuses, setFormStatuses] = useState({}); // Track which appointments have forms

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, filter]);

  const fetchAppointments = async () => {
    try {
      // First get patient ID
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patient) {
        setLoading(false);
        return;
      }

      // Get appointments
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      const today = new Date().toISOString().split('T')[0];

      if (filter === 'upcoming') {
        query = query.gte('scheduled_date', today);
      } else if (filter === 'past') {
        query = query.lt('scheduled_date', today);
      }

      const { data: appointmentsData, error } = await query;

      if (error) throw error;

      // Get doctor info for each appointment
      if (appointmentsData && appointmentsData.length > 0) {
        const doctorIds = [...new Set(appointmentsData.map(a => a.doctor_id))];
        
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('id, user_id, specialisation')
          .in('id', doctorIds);

        const userIds = doctorsData?.map(d => d.user_id) || [];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        // Check for pre-consultation forms
        const appointmentIds = appointmentsData.map(a => a.id);
        const { data: forms } = await supabase
          .from('pre_consultation_forms')
          .select('appointment_id')
          .in('appointment_id', appointmentIds);

        const formStatusMap = {};
        forms?.forEach(form => {
          formStatusMap[form.appointment_id] = true;
        });
        setFormStatuses(formStatusMap);

        // Merge data
        const appointmentsWithDoctors = appointmentsData.map(apt => {
          const doctor = doctorsData?.find(d => d.id === apt.doctor_id);
          const profile = profilesData?.find(p => p.id === doctor?.user_id);
          return {
            ...apt,
            doctor: {
              ...doctor,
              full_name: profile?.full_name || 'Doctor'
            }
          };
        });

        setAppointments(appointmentsWithDoctors);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
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

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#d97706', icon: AlertCircle, text: 'Pending' },
      confirmed: { bg: '#dbeafe', color: '#2563eb', icon: CheckCircle, text: 'Confirmed' },
      completed: { bg: '#d1fae5', color: '#059669', icon: CheckCircle, text: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#dc2626', icon: XCircle, text: 'Cancelled' }
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color
      }}>
        <Icon size={14} />
        {style.text}
      </span>
    );
  };

  const canJoinCall = (appointment) => {
    if (appointment.status !== 'confirmed') return false;
    
    const now = new Date();
    const aptDate = new Date(appointment.scheduled_date);
    const [hours, minutes] = appointment.scheduled_time.split(':');
    aptDate.setHours(parseInt(hours), parseInt(minutes));
    
    // Allow joining 5 minutes before to 30 minutes after
    const startWindow = new Date(aptDate.getTime() - 5 * 60000);
    const endWindow = new Date(aptDate.getTime() + 30 * 60000);
    
    return now >= startWindow && now <= endWindow;
  };

  const isUpcoming = (appointment) => {
    const today = new Date().toISOString().split('T')[0];
    return appointment.scheduled_date >= today && 
           appointment.status !== 'cancelled' && 
           appointment.status !== 'completed';
  };

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
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              to="/patient/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#64748b',
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </Link>
          </div>
          <Link
            to="/patient/book-appointment"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            <Plus size={18} />
            Book New
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
            My Appointments
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            View and manage your consultations
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1.5rem',
          backgroundColor: '#f1f5f9',
          padding: '0.25rem',
          borderRadius: '0.5rem',
          width: 'fit-content'
        }}>
          {['upcoming', 'past', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: filter === f ? 'white' : 'transparent',
                color: filter === f ? '#1e293b' : '#64748b',
                fontWeight: filter === f ? 500 : 400,
                cursor: 'pointer',
                boxShadow: filter === f ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                textTransform: 'capitalize'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
          </div>
        ) : appointments.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <Calendar size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No appointments found</h3>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              {filter === 'upcoming' 
                ? "You don't have any upcoming appointments." 
                : filter === 'past'
                ? "You don't have any past appointments."
                : "You haven't booked any appointments yet."}
            </p>
            <Link
              to="/patient/book-appointment"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              <Plus size={18} />
              Book a Consultation
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: appointment.status === 'cancelled' ? '1px solid #fecaca' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#e0e7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4f46e5',
                      fontWeight: 600,
                      fontSize: '1.25rem'
                    }}>
                      {appointment.doctor?.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                        Dr. {appointment.doctor?.full_name || 'Unknown'}
                      </h3>
                      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        {appointment.doctor?.specialisation || 'General Practice'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} />
                          {formatDate(appointment.scheduled_date)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} />
                          {formatTime(appointment.scheduled_time)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {appointment.type === 'video' ? <Video size={14} /> : <Phone size={14} />}
                          {appointment.type === 'video' ? 'Video' : 'Audio'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                    {getStatusBadge(appointment.status)}
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* Pre-consultation Form Button */}
                      {isUpcoming(appointment) && (
                        <Link
                          to={`/patient/pre-consultation/${appointment.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: formStatuses[appointment.id] ? '#dcfce7' : '#fef3c7',
                            color: formStatuses[appointment.id] ? '#166534' : '#d97706',
                            borderRadius: '0.375rem',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: formStatuses[appointment.id] ? '1px solid #bbf7d0' : '1px solid #fde68a'
                          }}
                        >
                          <ClipboardList size={16} />
                          {formStatuses[appointment.id] ? 'Form Completed' : 'Fill Form'}
                        </Link>
                      )}

                      {canJoinCall(appointment) && (
                        <Link
                          to={`/patient/consultation/${appointment.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#059669',
                            color: 'white',
                            borderRadius: '0.375rem',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 500
                          }}
                        >
                          <Video size={16} />
                          Join Call
                        </Link>
                      )}
                      
                      {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                        <button
                          onClick={() => cancelAppointment(appointment.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'white',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pre-consultation form reminder for upcoming appointments */}
                {isUpcoming(appointment) && !formStatuses[appointment.id] && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fffbeb',
                    borderRadius: '0.5rem',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertCircle size={16} color="#d97706" />
                    <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
                      Please complete the pre-consultation form before your appointment
                    </span>
                    <Link
                      to={`/patient/pre-consultation/${appointment.id}`}
                      style={{
                        marginLeft: 'auto',
                        color: '#d97706',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        textDecoration: 'none'
                      }}
                    >
                      Fill Now →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientAppointments;