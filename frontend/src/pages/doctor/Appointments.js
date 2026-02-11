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
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  ClipboardList,
  X,
  AlertCircle,
  Pill,
  Heart,
  FileText,
  User,
  Send,
  Sparkles
} from 'lucide-react';

const DoctorAppointments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorId, setDoctorId] = useState(null);
  const [formStatuses, setFormStatuses] = useState({});
  
  // Modal state for viewing pre-consultation form
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDoctorAndAppointments();
    }
  }, [user, filter]);

  const fetchDoctorAndAppointments = async () => {
    try {
      // Get doctor ID
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctor) {
        setLoading(false);
        return;
      }

      setDoctorId(doctor.id);

      // Build query
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      // Apply filters
      const today = new Date().toISOString().split('T')[0];
      if (filter === 'upcoming') {
        query = query.gte('scheduled_date', today).in('status', ['scheduled', 'confirmed', 'pending']);
      } else if (filter === 'past') {
        query = query.lt('scheduled_date', today);
      } else if (filter === 'today') {
        query = query.eq('scheduled_date', today);
      } else if (filter === 'pending') {
        query = query.in('status', ['pending', 'scheduled']);
      } else if (filter === 'completed') {
        query = query.eq('status', 'completed');
      } else if (filter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }

      const { data: appointmentsData, error } = await query;

      if (error) throw error;

      // Fetch patient info for each appointment
      if (appointmentsData && appointmentsData.length > 0) {
        const patientIds = [...new Set(appointmentsData.map(a => a.patient_id))];
        const appointmentIds = appointmentsData.map(a => a.id);
        
        const { data: patientsData } = await supabase
          .from('patients')
          .select('id, user_id')
          .in('id', patientIds);

        const userIds = patientsData?.map(p => p.user_id) || [];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', userIds);

        // Check for pre-consultation forms
        const { data: forms } = await supabase
          .from('pre_consultation_forms')
          .select('appointment_id')
          .in('appointment_id', appointmentIds);

        const formStatusMap = {};
        forms?.forEach(form => {
          formStatusMap[form.appointment_id] = true;
        });
        setFormStatuses(formStatusMap);

        const appointmentsWithPatients = appointmentsData.map(apt => {
          const patient = patientsData?.find(p => p.id === apt.patient_id);
          const profile = profilesData?.find(pr => pr.id === patient?.user_id);
          return {
            ...apt,
            patient_name: profile?.full_name || 'Patient',
            patient_email: profile?.email || '',
            patient_phone: profile?.phone || ''
          };
        });

        setAppointments(appointmentsWithPatients);
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

  const viewPreConsultationForm = async (appointmentId, patientName) => {
    setLoadingForm(true);
    setShowFormModal(true);
    
    try {
      const { data, error } = await supabase
        .from('pre_consultation_forms')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (error) throw error;

      setSelectedForm({ ...data, patient_name: patientName });
    } catch (error) {
      console.error('Error fetching form:', error);
      toast.error('Failed to load pre-consultation form');
      setShowFormModal(false);
    } finally {
      setLoadingForm(false);
    }
  };

  const updateStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success(`Appointment ${newStatus}`);
      fetchDoctorAndAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update appointment');
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityBadge = (severity) => {
    const styles = {
      mild: { bg: '#dcfce7', color: '#166534', text: 'Mild' },
      moderate: { bg: '#fef3c7', color: '#d97706', text: 'Moderate' },
      severe: { bg: '#fee2e2', color: '#dc2626', text: 'Severe' },
      very_severe: { bg: '#fecaca', color: '#991b1b', text: 'Very Severe' }
    };
    const style = styles[severity] || styles.moderate;
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#d97706', text: 'Pending' },
      scheduled: { bg: '#dbeafe', color: '#2563eb', text: 'Scheduled' },
      confirmed: { bg: '#d1fae5', color: '#059669', text: 'Confirmed' },
      completed: { bg: '#d1fae5', color: '#059669', text: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#dc2626', text: 'Cancelled' },
      in_progress: { bg: '#e0e7ff', color: '#4f46e5', text: 'In Progress' }
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
  };

  const filteredAppointments = appointments.filter(apt =>
    apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.patient_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

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
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            to="/doctor/dashboard"
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
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
            My Appointments
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            View and manage all your patient appointments
          </p>
        </div>

        {/* Search and Filter */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by patient name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '0.95rem'
              }}
            />
          </div>
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
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: filter === tab.id ? 'white' : 'transparent',
                color: filter === tab.id ? '#1e293b' : '#64748b',
                fontWeight: filter === tab.id ? 500 : 400,
                cursor: 'pointer',
                boxShadow: filter === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <Calendar size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No appointments found</h3>
            <p style={{ color: '#94a3b8' }}>
              {filter === 'all' ? 'You have no appointments yet.' : `No ${filter} appointments.`}
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Patient</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Date & Time</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Form</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(apt => (
                  <tr key={apt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: '#e0e7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4f46e5',
                          fontWeight: 600
                        }}>
                          {apt.patient_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <Link to={`/doctor/patient-chart/${apt.patient_id}`} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none' }}>
                            {apt.patient_name}
                          </Link>
                          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{apt.patient_email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <p style={{ fontWeight: 500, color: '#1e293b' }}>{formatDate(apt.scheduled_date)}</p>
                      <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{formatTime(apt.scheduled_time)}</p>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                        {apt.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                        {apt.type === 'video' ? 'Video' : 'Audio'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {formStatuses[apt.id] ? (
                        <button
                          onClick={() => viewPreConsultationForm(apt.id, apt.patient_name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}
                        >
                          <ClipboardList size={14} />
                          View Form
                        </button>
                      ) : (
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <AlertCircle size={14} />
                          Not submitted
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {getStatusBadge(apt.status)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {(apt.status === 'pending' || apt.status === 'scheduled') && (
                          <>
                            <button
                              onClick={() => updateStatus(apt.id, 'confirmed')}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#d1fae5',
                                color: '#059669',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.875rem'
                              }}
                            >
                              <CheckCircle size={16} />
                              Confirm
                            </button>
                            <button
                              onClick={() => updateStatus(apt.id, 'cancelled')}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.875rem'
                              }}
                            >
                              <XCircle size={16} />
                              Cancel
                            </button>
                          </>
                        )}
                        {apt.status === 'confirmed' && (
                          <Link
                            to={`/doctor/consultation/${apt.id}`}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              borderRadius: '0.375rem',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            <Video size={16} />
                            Start Call
                          </Link>
                        )}
                        {apt.status === 'completed' && (
                          <>
                            <Link
                              to={`/doctor/consultation-summary/${apt.id}`}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                borderRadius: '0.375rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.875rem',
                                border: '1px solid #bbf7d0'
                              }}
                            >
                              <FileText size={16} />
                              Summary
                            </Link>
                            <Link
                              to={`/doctor/referral/${apt.id}`}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                borderRadius: '0.375rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.875rem',
                                border: '1px solid #bfdbfe'
                              }}
                            >
                              <Send size={16} />
                              Referral
                            </Link>
                            <Link
                              to={`/doctor/ai-notes/${apt.id}`}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#f5f3ff',
                                color: '#7c3aed',
                                borderRadius: '0.375rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.875rem',
                                border: '1px solid #ddd6fe'
                              }}
                            >
                              <Sparkles size={16} />
                              AI Notes
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Pre-Consultation Form Modal */}
      {showFormModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={24} color="#3b82f6" />
                Pre-Consultation Form
              </h2>
              <button 
                onClick={() => { setShowFormModal(false); setSelectedForm(null); }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={24} color="#64748b" />
              </button>
            </div>

            {loadingForm ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
              </div>
            ) : selectedForm ? (
              <div>
                {/* Patient Info */}
                <div style={{ 
                  backgroundColor: '#eff6ff', 
                  padding: '1rem', 
                  borderRadius: '0.5rem', 
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <User size={20} color="#3b82f6" />
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e40af' }}>{selectedForm.patient_name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                      Submitted: {formatDateTime(selectedForm.created_at)}
                    </p>
                  </div>
                </div>

                {/* Chief Complaint */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertCircle size={18} color="#dc2626" />
                    <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Chief Complaint</h3>
                  </div>
                  <div style={{ 
                    backgroundColor: '#fef2f2', 
                    padding: '1rem', 
                    borderRadius: '0.5rem',
                    borderLeft: '3px solid #dc2626'
                  }}>
                    <p style={{ color: '#1e293b' }}>{selectedForm.chief_complaint || 'Not provided'}</p>
                  </div>
                </div>

                {/* Current Symptoms */}
                {(selectedForm.current_symptoms || selectedForm.symptom_duration || selectedForm.symptom_severity) && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Current Symptoms</h3>
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                      {selectedForm.current_symptoms && (
                        <p style={{ color: '#1e293b', marginBottom: '0.75rem' }}>{selectedForm.current_symptoms}</p>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {selectedForm.symptom_duration && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Duration: </span>
                            <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedForm.symptom_duration}</span>
                          </div>
                        )}
                        {selectedForm.symptom_severity && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Severity: </span>
                            {getSeverityBadge(selectedForm.symptom_severity)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Medications & Allergies */}
                {(selectedForm.current_medications || selectedForm.allergies) && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Pill size={18} color="#8b5cf6" />
                      <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Medications & Allergies</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Current Medications</p>
                        <p style={{ color: '#1e293b' }}>{selectedForm.current_medications || 'None reported'}</p>
                      </div>
                      <div style={{ 
                        backgroundColor: selectedForm.allergies ? '#fef3c7' : '#f8fafc', 
                        padding: '1rem', 
                        borderRadius: '0.5rem' 
                      }}>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Known Allergies</p>
                        <p style={{ color: selectedForm.allergies ? '#92400e' : '#1e293b', fontWeight: selectedForm.allergies ? 500 : 400 }}>
                          {selectedForm.allergies || 'No known allergies'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Medical History */}
                {(selectedForm.medical_history || selectedForm.family_history || selectedForm.lifestyle_notes) && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Heart size={18} color="#ec4899" />
                      <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Medical History</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedForm.medical_history && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Past Medical Conditions</p>
                          <p style={{ color: '#1e293b' }}>{selectedForm.medical_history}</p>
                        </div>
                      )}
                      {selectedForm.family_history && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Family History</p>
                          <p style={{ color: '#1e293b' }}>{selectedForm.family_history}</p>
                        </div>
                      )}
                      {selectedForm.lifestyle_notes && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Lifestyle Notes</p>
                          <p style={{ color: '#1e293b' }}>{selectedForm.lifestyle_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedForm.additional_notes && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <FileText size={18} color="#64748b" />
                      <h3 style={{ fontWeight: 600, color: '#1e293b' }}>Additional Notes</h3>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                      <p style={{ color: '#1e293b' }}>{selectedForm.additional_notes}</p>
                    </div>
                  </div>
                )}

                {/* Consent */}
                <div style={{ 
                  backgroundColor: selectedForm.consent_given ? '#dcfce7' : '#fee2e2',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {selectedForm.consent_given ? (
                    <>
                      <CheckCircle size={18} color="#166534" />
                      <span style={{ color: '#166534', fontWeight: 500 }}>
                        Consent given on {formatDateTime(selectedForm.consent_timestamp)}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle size={18} color="#dc2626" />
                      <span style={{ color: '#dc2626', fontWeight: 500 }}>Consent not provided</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b', textAlign: 'center' }}>No form data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;