import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  FileText,
  User,
  LogOut,
  Plus,
  Video,
  Bell,
  ChevronRight,
  Home,
  FolderOpen,
  Send
} from 'lucide-react';

const PatientDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    cancelled: 0
  });

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      // Get patient ID
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patient) {
        setLoading(false);
        return;
      }

      // Fetch appointments
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Get doctor info
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

        const appointmentsWithDoctors = appointmentsData.map(apt => {
          const doctor = doctorsData?.find(d => d.id === apt.doctor_id);
          const doctorProfile = profilesData?.find(p => p.id === doctor?.user_id);
          return {
            ...apt,
            doctor_name: doctorProfile?.full_name || 'Doctor',
            specialisation: doctor?.specialisation || 'General Practice'
          };
        });

        setAppointments(appointmentsWithDoctors);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const upcoming = appointmentsWithDoctors.filter(
          a => a.scheduled_date >= today && !['cancelled', 'completed'].includes(a.status)
        ).length;
        const completed = appointmentsWithDoctors.filter(a => a.status === 'completed').length;
        const cancelled = appointmentsWithDoctors.filter(a => a.status === 'cancelled').length;

        setStats({ upcoming, completed, cancelled });
      }

      // Fetch follow-ups
      const { data: followUpsData } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('status', 'scheduled')
        .gte('follow_up_date', new Date().toISOString().split('T')[0])
        .order('follow_up_date', { ascending: true });

      if (followUpsData && followUpsData.length > 0) {
        // Get doctor names for follow-ups
        const docIds = [...new Set(followUpsData.map(f => f.doctor_id))];
        const { data: docs } = await supabase.from('doctors').select('id, user_id').in('id', docIds);
        const uIds = docs?.map(d => d.user_id) || [];
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', uIds);
        
        const enriched = followUpsData.map(f => {
          const doc = docs?.find(d => d.id === f.doctor_id);
          const prof = profs?.find(p => p.id === doc?.user_id);
          return { ...f, doctor_name: prof?.full_name || 'Doctor' };
        });
        setFollowUps(enriched);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
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
      month: 'short'
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#059669';
      case 'scheduled': return '#2563eb';
      case 'pending': return '#d97706';
      case 'completed': return '#059669';
      case 'cancelled': return '#dc2626';
      default: return '#64748b';
    }
  };

  const upcomingAppointments = appointments.filter(
    a => new Date(a.scheduled_date) >= new Date() && !['cancelled', 'completed'].includes(a.status)
  ).slice(0, 3);

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
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Patient Portal</p>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <Link
            to="/patient/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              color: 'white',
              backgroundColor: '#334155',
              borderLeft: '3px solid #3b82f6',
              textDecoration: 'none'
            }}
          >
            <Home size={20} />
            <span>Dashboard</span>
          </Link>
          
          <Link
            to="/patient/book-appointment"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              color: '#94a3b8',
              textDecoration: 'none'
            }}
          >
            <Plus size={20} />
            <span>Book Consultation</span>
          </Link>
          
          <Link
            to="/patient/appointments"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              color: '#94a3b8',
              textDecoration: 'none'
            }}
          >
            <Calendar size={20} />
            <span>My Appointments</span>
          </Link>
          
          <Link
            to="/patient/documents"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              color: '#94a3b8',
              textDecoration: 'none'
            }}
          >
            <FolderOpen size={20} />
            <span>My Documents</span>
          </Link>
          
          <Link
            to="/patient/prescriptions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              color: '#94a3b8',
              textDecoration: 'none'
            }}
          >
            <FileText size={20} />
            <span>My Prescriptions</span>
          </Link>
          
          <Link
            to="/patient/referrals"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              color: '#94a3b8',
              textDecoration: 'none'
            }}
          >
            <Send size={20} />
            <span>Referral Letters</span>
          </Link>
          
          <Link
            to="/patient/consultation-summaries"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              color: '#94a3b8',
              textDecoration: 'none'
            }}
          >
            <Clock size={20} />
            <span>Consultation Summaries</span>
          </Link>
          
          <Link
            to="/patient/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.5rem',
              color: '#94a3b8',
              textDecoration: 'none'
            }}
          >
            <User size={20} />
            <span>My Profile</span>
          </Link>
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
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
              Welcome back, {profile?.full_name || 'Patient'}!
            </h1>
            <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
              Manage your health appointments
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '1.125rem'
            }}>
              {profile?.full_name?.charAt(0) || 'P'}
            </div>
          </div>
        </header>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <Link
            to="/patient/book-appointment"
            style={{
              backgroundColor: '#3b82f6',
              borderRadius: '1rem',
              padding: '1.5rem',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Video size={24} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>Book Consultation</p>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Schedule a video call</p>
            </div>
          </Link>

          <Link
            to="/patient/appointments"
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.75rem',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={24} color="#3b82f6" />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1e293b' }}>My Appointments</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{stats.upcoming} upcoming</p>
            </div>
          </Link>

          <Link
            to="/patient/documents"
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.75rem',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={24} color="#059669" />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1e293b' }}>My Documents</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Medical records</p>
            </div>
          </Link>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Upcoming Appointments */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                Upcoming Appointments
              </h2>
              <Link
                to="/patient/appointments"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                View all <ChevronRight size={16} />
              </Link>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Calendar size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
                <p style={{ color: '#64748b', marginBottom: '1rem' }}>No upcoming appointments</p>
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
                  Book Now
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {upcomingAppointments.map(apt => (
                  <div
                    key={apt.id}
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
                        backgroundColor: '#dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6',
                        fontWeight: 600
                      }}>
                        {apt.doctor_name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b' }}>
                          Dr. {apt.doctor_name}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {apt.specialisation}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                          {formatDate(apt.scheduled_date)} at {formatTime(apt.scheduled_time)}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: getStatusColor(apt.status) + '20',
                      color: getStatusColor(apt.status),
                      textTransform: 'capitalize'
                    }}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Follow-ups */}
          {followUps.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              gridColumn: 'span 2'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="#f59e0b" />
                Upcoming Follow-ups
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {followUps.map(fu => (
                  <div
                    key={fu.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '0.75rem',
                      border: '1px solid #fde68a'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef3c7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#d97706', fontWeight: 600
                      }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b' }}>
                          Follow-up with Dr. {fu.doctor_name}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{fu.reason}</p>
                        <p style={{ fontSize: '0.85rem', color: '#92400e', marginTop: '0.25rem' }}>
                          {new Date(fu.follow_up_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          {fu.follow_up_time ? ` at ${fu.follow_up_time.substring(0, 5)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: fu.priority === 'urgent' ? '#fee2e2' : fu.priority === 'emergency' ? '#fecaca' : '#dcfce7',
                      color: fu.priority === 'urgent' ? '#dc2626' : fu.priority === 'emergency' ? '#991b1b' : '#16a34a',
                      textTransform: 'capitalize'
                    }}>
                      {fu.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Summary */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.5rem' }}>
              Your Profile
            </h2>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
                {profile?.full_name?.charAt(0) || 'P'}
              </div>
              <h3 style={{ fontWeight: 600, color: '#1e293b' }}>{profile?.full_name || 'Patient'}</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{profile?.email}</p>
            </div>

            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Appointments</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{appointments.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Completed</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>{stats.completed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Upcoming</span>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>{stats.upcoming}</span>
              </div>
            </div>

            <Link
              to="/patient/profile"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '0.75rem',
                backgroundColor: '#f1f5f9',
                borderRadius: '0.5rem',
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;