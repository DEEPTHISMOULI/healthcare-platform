import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  Users,
  Calendar,
  Activity,
  Settings,
  LogOut,
  Home,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  UserCheck,
  Video
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedToday: 0,
    revenue: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch all patients
      const { data: patients } = await supabase
        .from('patients')
        .select('*');

      // Fetch all doctors
      const { data: doctors } = await supabase
        .from('doctors')
        .select('*');

      // Fetch all appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .order('scheduled_date', { ascending: false });

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const completedToday = appointments?.filter(
        a => a.scheduled_date === today && a.status === 'completed'
      ).length || 0;

      const pendingAppts = appointments?.filter(
        a => a.status === 'pending' || a.status === 'scheduled'
      ).length || 0;

      // Calculate revenue (completed appointments * avg fee)
      const completedAppts = appointments?.filter(a => a.status === 'completed') || [];
      const revenue = completedAppts.length * 50; // Assuming £50 per consultation

      setStats({
        totalPatients: patients?.length || 0,
        totalDoctors: doctors?.length || 0,
        totalAppointments: appointments?.length || 0,
        pendingAppointments: pendingAppts,
        completedToday: completedToday,
        revenue: revenue
      });

      // Merge profiles with role info
      const usersWithRoles = profiles?.map(p => ({
        ...p,
        isDoctor: doctors?.some(d => d.user_id === p.id),
        isPatient: patients?.some(pt => pt.user_id === p.id)
      })) || [];

      setUsers(usersWithRoles);

      // Get recent appointments with user info
      if (appointments && appointments.length > 0) {
        const appointmentsWithInfo = await Promise.all(
          appointments.slice(0, 10).map(async (apt) => {
            // Get patient info
            const patient = patients?.find(p => p.id === apt.patient_id);
            const patientProfile = profiles?.find(pr => pr.id === patient?.user_id);
            
            // Get doctor info
            const doctor = doctors?.find(d => d.id === apt.doctor_id);
            const doctorProfile = profiles?.find(pr => pr.id === doctor?.user_id);

            return {
              ...apt,
              patient_name: patientProfile?.full_name || 'Unknown',
              doctor_name: doctorProfile?.full_name || 'Unknown'
            };
          })
        );
        setRecentAppointments(appointmentsWithInfo);
        setAllAppointments(appointmentsWithInfo);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
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

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' ||
                       (filterRole === 'doctor' && u.isDoctor) ||
                       (filterRole === 'patient' && u.isPatient) ||
                       (filterRole === 'admin' && u.role === 'admin');
    return matchesSearch && matchesRole;
  });

  const sidebarItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'appointments', icon: Calendar, label: 'Appointments' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: '#0f172a',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #1e293b' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏥</span>
            Dr. Naren Clinic
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Admin Portal</p>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.5rem',
                color: activeTab === item.id ? 'white' : '#94a3b8',
                backgroundColor: activeTab === item.id ? '#1e293b' : 'transparent',
                borderLeft: activeTab === item.id ? '3px solid #3b82f6' : '3px solid transparent',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1e293b' }}>
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
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
                Admin Dashboard
              </h1>
              <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
                Overview of your clinic's performance
              </p>
            </header>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Patients</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{stats.totalPatients}</p>
                  </div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} color="#3b82f6" />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Doctors</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{stats.totalDoctors}</p>
                  </div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={24} color="#059669" />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Appointments</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{stats.totalAppointments}</p>
                  </div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={24} color="#d97706" />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Pending Requests</p>
                    <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{stats.pendingAppointments}</p>
                  </div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} color="#dc2626" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Appointments */}
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                  Recent Appointments
                </h2>
                <button
                  onClick={() => setActiveTab('appointments')}
                  style={{
                    color: '#3b82f6',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  View all →
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner"></div>
                </div>
              ) : recentAppointments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                  No appointments yet
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Patient</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Doctor</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Date & Time</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map(apt => (
                      <tr key={apt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#e0e7ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#4f46e5',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}>
                              {apt.patient_name?.charAt(0) || 'P'}
                            </div>
                            <span style={{ fontWeight: 500 }}>{apt.patient_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>Dr. {apt.doctor_name}</td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {formatDate(apt.scheduled_date)} at {formatTime(apt.scheduled_time)}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                            <Video size={14} />
                            {apt.type === 'video' ? 'Video' : 'Audio'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {getStatusBadge(apt.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Users View */}
        {activeTab === 'users' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
                User Management
              </h1>
              <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
                Manage patients, doctors, and administrators
              </p>
            </header>

            {/* Search and Filter */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search users..."
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
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">All Users</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {/* Users Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>User</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Phone</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: u.isDoctor ? '#dbeafe' : u.role === 'admin' ? '#fef3c7' : '#e0e7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: u.isDoctor ? '#3b82f6' : u.role === 'admin' ? '#d97706' : '#4f46e5',
                            fontWeight: 600
                          }}>
                            {u.full_name?.charAt(0) || '?'}
                          </div>
                          <span style={{ fontWeight: 500 }}>{u.full_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: u.isDoctor ? '#dbeafe' : u.role === 'admin' ? '#fef3c7' : '#e0e7ff',
                          color: u.isDoctor ? '#3b82f6' : u.role === 'admin' ? '#d97706' : '#4f46e5'
                        }}>
                          {u.isDoctor ? 'Doctor' : u.role === 'admin' ? 'Admin' : 'Patient'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{u.phone || '-'}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>
                        {u.created_at ? formatDate(u.created_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                  No users found
                </p>
              )}
            </div>
          </>
        )}

        {/* Appointments View */}
        {activeTab === 'appointments' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
                All Appointments
              </h1>
              <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
                View and manage all clinic appointments
              </p>
            </header>

            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {allAppointments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                  No appointments found
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Patient</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Doctor</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Time</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAppointments.map(apt => (
                      <tr key={apt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>{apt.patient_name}</td>
                        <td style={{ padding: '0.75rem' }}>Dr. {apt.doctor_name}</td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>{formatDate(apt.scheduled_date)}</td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>{formatTime(apt.scheduled_time)}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                            <Video size={14} />
                            {apt.type === 'video' ? 'Video' : 'Audio'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {getStatusBadge(apt.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Settings View */}
        {activeTab === 'settings' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
                Settings
              </h1>
              <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
                Manage clinic settings and preferences
              </p>
            </header>

            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Clinic Information</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                    Clinic Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Dr. Naren Clinic"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    defaultValue="contact@drnaren.co.uk"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                    Default Consultation Fee (£)
                  </label>
                  <input
                    type="number"
                    defaultValue="50"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                    Appointment Duration (minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue="30"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem'
                    }}
                  />
                </div>
              </div>

              <button
                style={{
                  marginTop: '2rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Save Settings
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;