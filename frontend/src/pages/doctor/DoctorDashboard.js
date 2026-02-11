import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  Users, 
  Video,
  FileText,
  LogOut,
  Bell,
  ChevronRight,
  CheckCircle,
  XCircle,
  User,
  Home,
  MessageSquare
} from 'lucide-react';

const DoctorDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [doctorData, setDoctorData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingAppointments: 0,
    totalPatients: 0,
    completedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (user) {
      fetchDoctorData();
      fetchAppointments();
    }
  }, [user]);

  const fetchDoctorData = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching doctor:', error);
        return;
      }
      setDoctorData(data);
    } catch (err) {
      console.error('Error fetching doctor data:', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      console.log('Fetching appointments for user:', user.id);
      
      // Get doctor ID first
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (doctorError) {
        console.error('Error getting doctor:', doctorError);
        setLoading(false);
        return;
      }

      if (!doctor) {
        console.log('No doctor found for user');
        setLoading(false);
        return;
      }

      console.log('Doctor ID:', doctor.id);

      // Get today's date
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      console.log('Today:', todayStr);

      // Fetch appointments - simple query
      const { data: appointmentsData, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor.id)
        .gte('scheduled_date', todayStr)
        .order('scheduled_date', { ascending: true });

      if (aptError) {
        console.error('Error fetching appointments:', aptError);
        setLoading(false);
        return;
      }

      console.log('Appointments found:', appointmentsData);

      // If we have appointments, fetch patient info separately
      if (appointmentsData && appointmentsData.length > 0) {
        const patientIds = [...new Set(appointmentsData.map(a => a.patient_id))];
        console.log('Patient IDs:', patientIds);
        
        // Get patients
        const { data: patientsData } = await supabase
          .from('patients')
          .select('id, user_id')
          .in('id', patientIds);

        console.log('Patients:', patientsData);

        // Get profiles for those patients
        if (patientsData && patientsData.length > 0) {
          const userIds = patientsData.map(p => p.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .in('id', userIds);

          console.log('Profiles:', profilesData);

          // Merge data
          const appointmentsWithPatients = appointmentsData.map(apt => {
            const patient = patientsData?.find(p => p.id === apt.patient_id);
            const patientProfile = profilesData?.find(pr => pr.id === patient?.user_id);
            return {
              ...apt,
              patient_name: patientProfile?.full_name || 'Patient',
              patient_email: patientProfile?.email || '',
              patient_phone: patientProfile?.phone || ''
            };
          });

          setAppointments(appointmentsWithPatients);
        } else {
          setAppointments(appointmentsData);
        }
      } else {
        setAppointments([]);
      }

      // Calculate stats
      const todayAppts = appointmentsData?.filter(a => a.scheduled_date === todayStr) || [];
      const pendingAppts = appointmentsData?.filter(a => 
        a.status === 'pending' || a.status === 'confirmed' || a.status === 'scheduled'
      ) || [];
      const completedToday = todayAppts.filter(a => a.status === 'completed').length;
      const uniquePatients = new Set(appointmentsData?.map(a => a.patient_id) || []);

      setStats({
        todayAppointments: todayAppts.length,
        pendingAppointments: pendingAppts.length,
        totalPatients: uniquePatients.size,
        completedToday: completedToday
      });

    } catch (err) {
      console.error('Error in fetchAppointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success(`Appointment ${newStatus}`);
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
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
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
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
      pending: { bg: '#fef3c7', color: '#d97706', text: 'Pending' },
      scheduled: { bg: '#dbeafe', color: '#2563eb', text: 'Scheduled' },
      confirmed: { bg: '#dbeafe', color: '#2563eb', text: 'Confirmed' },
      completed: { bg: '#d1fae5', color: '#059669', text: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#dc2626', text: 'Cancelled' }
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

  const sidebarItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'appointments', icon: Calendar, label: 'Appointments', link: '/doctor/appointments' },
    { id: 'patients', icon: Users, label: 'My Patients', link: '/doctor/patients' },
    { id: 'prescriptions', icon: FileText, label: 'Prescriptions', link: '/doctor/prescriptions' },
    { id: 'schedule', icon: Clock, label: 'My Schedule', link: '/doctor/schedule' },
    { id: 'profile', icon: User, label: 'Profile', link: '/doctor/profile' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: '#1e293b',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏥</span>
            Dr. Naren Clinic
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Doctor Portal</p>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {sidebarItems.map(item => (
            <Link
              key={item.id}
              to={item.link || '#'}
              onClick={(e) => {
                if (!item.link) {
                  e.preventDefault();
                  setActiveTab(item.id);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.5rem',
                color: activeTab === item.id ? 'white' : '#94a3b8',
                backgroundColor: activeTab === item.id ? '#334155' : 'transparent',
                borderLeft: activeTab === item.id ? '3px solid #3b82f6' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #334155' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 0',
              color: '#94a3b8',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              fontSize: '1rem'
            }}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: '260px', padding: '2rem' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
              Welcome back, {profile?.full_name || 'Doctor'}!
            </h1>
            <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
              Here's your schedule for today
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: 'white',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <Bell size={20} color="#64748b" />
              {stats.pendingAppointments > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  fontSize: '0.7rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {stats.pendingAppointments}
                </span>
              )}
            </button>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600
            }}>
              {profile?.full_name?.charAt(0) || 'D'}
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Today's Appointments</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{stats.todayAppointments}</p>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={24} color="#3b82f6" />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Pending Requests</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{stats.pendingAppointments}</p>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} color="#d97706" />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Patients</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{stats.totalPatients}</p>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} color="#059669" />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Completed Today</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{stats.completedToday}</p>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={24} color="#7c3aed" />
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                Upcoming Appointments
              </h2>
              <Link to="/doctor/appointments" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                View all <ChevronRight size={16} />
              </Link>
              <Link to="/doctor/messages"><MessageSquare size={20} /> Messages</Link>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {appointments.slice(0, 5).map(appointment => (
                  <div
                    key={appointment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#e0e7ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4f46e5',
                        fontWeight: 600
                      }}>
                        {appointment.patient_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b' }}>
                          {appointment.patient_name || 'Patient'}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {formatDate(appointment.scheduled_date)} at {formatTime(appointment.scheduled_time)}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          {appointment.type === 'video' ? '📹 Video' : '📞 Audio'} Consultation
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {getStatusBadge(appointment.status)}
                      {(appointment.status === 'pending' || appointment.status === 'scheduled') && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '0.5rem',
                              border: 'none',
                              backgroundColor: '#d1fae5',
                              cursor: 'pointer'
                            }}
                            title="Accept"
                          >
                            <CheckCircle size={18} color="#059669" />
                          </button>
                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '0.5rem',
                              border: 'none',
                              backgroundColor: '#fee2e2',
                              cursor: 'pointer'
                            }}
                            title="Decline"
                          >
                            <XCircle size={18} color="#dc2626" />
                          </button>
                        </div>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Link
                          to={`/doctor/consultation/${appointment.id}`}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Video size={16} />
                          Start
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                Your Profile
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Specialisation</span>
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                    {doctorData?.specialisation || 'General Practice'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>License</span>
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                    {doctorData?.license_number || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Consultation Fee</span>
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                    £{doctorData?.consultation_fee || '50'}
                  </span>
                </div>
              </div>
              <Link
                to="/doctor/profile"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '0.75rem',
                  marginTop: '1rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.5rem',
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Edit Profile
              </Link>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link to="/doctor/schedule" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', textDecoration: 'none', color: '#1e293b' }}>
                  <Clock size={20} color="#3b82f6" />
                  <span style={{ fontSize: '0.875rem' }}>Manage Availability</span>
                </Link>
                <Link to="/doctor/patients" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', textDecoration: 'none', color: '#1e293b' }}>
                  <Users size={20} color="#059669" />
                  <span style={{ fontSize: '0.875rem' }}>View Patients</span>
                </Link>
                <Link to="/doctor/appointments" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', textDecoration: 'none', color: '#1e293b' }}>
                  <FileText size={20} color="#7c3aed" />
                  <span style={{ fontSize: '0.875rem' }}>All Appointments</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;