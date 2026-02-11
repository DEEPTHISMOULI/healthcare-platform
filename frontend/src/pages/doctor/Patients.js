import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  Users,
  ArrowLeft,
  Search,
  Calendar,
  Phone,
  Mail,
  User,
  Clock,
  FileText,
  Video
} from 'lucide-react';

const DoctorPatients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user]);

  const fetchPatients = async () => {
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

      // Get all appointments for this doctor
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor.id);

      if (!appointments || appointments.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      // Get unique patient IDs
      const patientIds = [...new Set(appointments.map(a => a.patient_id))];

      // Get patient records
      const { data: patientsData } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);

      // Get profiles
      const userIds = patientsData?.map(p => p.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      // Combine data and calculate stats
      const patientsWithInfo = patientsData?.map(patient => {
        const profile = profilesData?.find(p => p.id === patient.user_id);
        const patientAppointments = appointments.filter(a => a.patient_id === patient.id);
        const completedAppts = patientAppointments.filter(a => a.status === 'completed');
        const lastAppointment = patientAppointments
          .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
        const upcomingAppts = patientAppointments.filter(
          a => new Date(a.scheduled_date) >= new Date() && 
               (a.status === 'scheduled' || a.status === 'confirmed')
        );

        return {
          ...patient,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          phone: profile?.phone || '',
          total_appointments: patientAppointments.length,
          completed_appointments: completedAppts.length,
          last_visit: lastAppointment?.scheduled_date || null,
          upcoming_appointments: upcomingAppts.length,
          appointments: patientAppointments
        };
      }) || [];

      setPatients(patientsWithInfo);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No visits yet';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
        </div>
      </header>

      <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Main Content */}
        <main style={{ flex: 1, padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
              My Patients
            </h1>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
              {patients.length} patient{patients.length !== 1 ? 's' : ''} in your care
            </p>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search patients..."
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

          {/* Patients Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <Users size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
              <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No patients found</h3>
              <p style={{ color: '#94a3b8' }}>
                {searchTerm ? 'Try a different search term.' : 'You have no patients yet.'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem'
            }}>
              {filteredPatients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    border: selectedPatient?.id === patient.id ? '2px solid #3b82f6' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
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
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}>
                      {patient.full_name?.charAt(0) || 'P'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                        {patient.full_name}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Mail size={14} />
                        {patient.email}
                      </p>
                      {patient.phone && (
                        <p style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Phone size={14} />
                          {patient.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.75rem'
                  }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Visits</p>
                      <p style={{ fontWeight: 600, color: '#1e293b' }}>{patient.total_appointments}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Completed</p>
                      <p style={{ fontWeight: 600, color: '#059669' }}>{patient.completed_appointments}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Last Visit</p>
                      <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{formatDate(patient.last_visit)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Upcoming</p>
                      <p style={{ fontWeight: 600, color: patient.upcoming_appointments > 0 ? '#3b82f6' : '#64748b' }}>
                        {patient.upcoming_appointments}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Patient Details Sidebar */}
        {selectedPatient && (
          <aside style={{
            width: '380px',
            backgroundColor: 'white',
            borderLeft: '1px solid #e2e8f0',
            padding: '2rem',
            position: 'sticky',
            top: '73px',
            height: 'calc(100vh - 73px)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Patient Details</h2>
              <button
                onClick={() => setSelectedPatient(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '1.25rem'
                }}
              >
                ×
              </button>
            </div>

            {/* Patient Info */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
                fontWeight: 600,
                fontSize: '2rem',
                margin: '0 auto 1rem'
              }}>
                {selectedPatient.full_name?.charAt(0) || 'P'}
              </div>
              <h3 style={{ fontWeight: 600, fontSize: '1.25rem', color: '#1e293b' }}>
                {selectedPatient.full_name}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{selectedPatient.email}</p>
            </div>

            {/* Contact Info */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>Contact Information</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                  <Mail size={18} color="#64748b" />
                  <span style={{ fontSize: '0.875rem' }}>{selectedPatient.email}</span>
                </div>
                {selectedPatient.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                    <Phone size={18} color="#64748b" />
                    <span style={{ fontSize: '0.875rem' }}>{selectedPatient.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Appointments */}
            <div>
              <h4 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>Recent Appointments</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedPatient.appointments?.slice(0, 5).map(apt => (
                  <div
                    key={apt.id}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#1e293b' }}>
                        {formatDate(apt.scheduled_date)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {apt.type === 'video' ? 'Video' : 'Audio'} consultation
                      </p>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: apt.status === 'completed' ? '#d1fae5' : apt.status === 'cancelled' ? '#fee2e2' : '#dbeafe',
                      color: apt.status === 'completed' ? '#059669' : apt.status === 'cancelled' ? '#dc2626' : '#2563eb'
                    }}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default DoctorPatients;