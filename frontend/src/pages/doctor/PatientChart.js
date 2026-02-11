import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  FileText,
  Pill,
  Send,
  FolderOpen,
  Activity,
  Heart,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Video,
  Stethoscope,
  ClipboardList,
  Download,
  Eye
} from 'lucide-react';

const PatientChart = () => {
  const { patientId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patientInfo, setPatientInfo] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [preConsultForms, setPreConsultForms] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (user && patientId) {
      fetchAllData();
    }
  }, [user, patientId]);

  const fetchAllData = async () => {
    try {
      // Fetch patient info
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patient?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', patient.user_id)
          .single();
        setPatientInfo({ ...patient, ...profile });
      }

      // Fetch appointments
      const { data: aptsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('scheduled_date', { ascending: false });
      setAppointments(aptsData || []);

      // Fetch consultation summaries
      const { data: summariesData } = await supabase
        .from('consultation_summaries')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      setSummaries(summariesData || []);

      // Fetch prescriptions
      const { data: prescData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      setPrescriptions(prescData || []);

      // Fetch referrals
      const { data: refsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      setReferrals(refsData || []);

      // Fetch pre-consultation forms
      const appointmentIds = (aptsData || []).map(a => a.id);
      if (appointmentIds.length > 0) {
        const { data: formsData } = await supabase
          .from('pre_consultation_forms')
          .select('*')
          .in('appointment_id', appointmentIds)
          .order('created_at', { ascending: false });
        setPreConsultForms(formsData || []);
      }

      // Fetch documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      setDocuments(docsData || []);

    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
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

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getStatusBadge = (status, type = 'default') => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#d97706' },
      scheduled: { bg: '#dbeafe', color: '#2563eb' },
      confirmed: { bg: '#d1fae5', color: '#059669' },
      completed: { bg: '#d1fae5', color: '#059669' },
      cancelled: { bg: '#fee2e2', color: '#dc2626' },
      draft: { bg: '#f1f5f9', color: '#64748b' },
      sent: { bg: '#dbeafe', color: '#2563eb' },
      accepted: { bg: '#d1fae5', color: '#059669' },
      active: { bg: '#d1fae5', color: '#059669' },
      expired: { bg: '#fee2e2', color: '#dc2626' },
      routine: { bg: '#dcfce7', color: '#16a34a' },
      urgent: { bg: '#fef3c7', color: '#d97706' },
      emergency: { bg: '#fee2e2', color: '#dc2626' }
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{
        padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem',
        fontWeight: 600, backgroundColor: s.bg, color: s.color, textTransform: 'capitalize'
      }}>
        {status}
      </span>
    );
  };

  // Styles
  const pageStyle = { minHeight: '100vh', backgroundColor: '#f8fafc' };
  const headerStyle = { backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 };
  const mainStyle = { maxWidth: '1200px', margin: '0 auto', padding: '2rem' };
  const cardStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' };
  const tabStyle = (isActive) => ({
    padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
    backgroundColor: isActive ? '#2563eb' : 'transparent', color: isActive ? 'white' : '#64748b',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.375rem'
  });
  const sectionHeaderStyle = { fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' };
  const itemCardStyle = { border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '0.75rem', overflow: 'hidden', transition: 'box-shadow 0.2s' };
  const itemHeaderStyle = { padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafbfc' };
  const detailRowStyle = { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' };
  const detailLabelStyle = { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '140px' };
  const detailValueStyle = { fontSize: '0.875rem', color: '#1e293b' };
  const emptyStyle = { textAlign: 'center', padding: '2rem', color: '#94a3b8' };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ color: '#64748b' }}>Loading patient chart...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { id: 'consultations', label: 'Consultations', icon: <Stethoscope size={16} />, count: summaries.length },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill size={16} />, count: prescriptions.length },
    { id: 'referrals', label: 'Referrals', icon: <Send size={16} />, count: referrals.length },
    { id: 'documents', label: 'Documents', icon: <FolderOpen size={16} />, count: documents.length },
    { id: 'forms', label: 'Pre-Consult Forms', icon: <ClipboardList size={16} />, count: preConsultForms.length }
  ];

  // Build timeline for overview
  const timelineItems = [
    ...appointments.map(a => ({ type: 'appointment', date: a.scheduled_date, data: a })),
    ...prescriptions.map(p => ({ type: 'prescription', date: p.created_at, data: p })),
    ...referrals.map(r => ({ type: 'referral', date: r.created_at, data: r }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/doctor/appointments" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' }}>
            <ArrowLeft size={20} /> Back to Appointments
          </Link>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Patient Chart</span>
        </div>
      </header>

      <main style={mainStyle}>
        {/* Patient Info Banner */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem 2rem' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#e0e7ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5',
            fontWeight: 700, fontSize: '1.75rem', flexShrink: 0
          }}>
            {patientInfo?.full_name?.charAt(0) || 'P'}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
              {patientInfo?.full_name || 'Patient'}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
              {patientInfo?.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Mail size={14} /> {patientInfo.email}
                </span>
              )}
              {patientInfo?.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Phone size={14} /> {patientInfo.phone}
                </span>
              )}
              {patientInfo?.date_of_birth && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} /> DOB: {formatDate(patientInfo.date_of_birth)} (Age: {calculateAge(patientInfo.date_of_birth)})
                </span>
              )}
              {patientInfo?.gender && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User size={14} /> {patientInfo.gender}
                </span>
              )}
              {patientInfo?.nhs_number && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  NHS: {patientInfo.nhs_number}
                </span>
              )}
            </div>
          </div>
          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{appointments.length}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Visits</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{prescriptions.length}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Prescriptions</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9333ea' }}>{referrals.length}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Referrals</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(activeTab === tab.id)}>
              {tab.icon} {tab.label}
              {tab.count !== undefined && (
                <span style={{
                  backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
                  padding: '0.1rem 0.4rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            {/* Timeline */}
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <Clock size={18} style={{ color: '#2563eb' }} /> Recent Activity
              </div>
              {timelineItems.length === 0 ? (
                <p style={emptyStyle}>No activity recorded yet</p>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                  <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', backgroundColor: '#e2e8f0' }} />
                  {timelineItems.map((item, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: '1.25rem', paddingLeft: '1rem' }}>
                      <div style={{
                        position: 'absolute', left: '-1.5rem', top: '4px', width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: item.type === 'appointment' ? '#dbeafe' : item.type === 'prescription' ? '#dcfce7' : '#f3e8ff',
                        border: `2px solid ${item.type === 'appointment' ? '#2563eb' : item.type === 'prescription' ? '#16a34a' : '#9333ea'}`,
                        zIndex: 1
                      }} />
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        {formatDate(item.date)}
                      </div>
                      {item.type === 'appointment' && (
                        <div>
                          <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                            {item.data.type === 'video' ? '📹' : '📞'} {item.data.type} Consultation
                          </p>
                          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {formatTime(item.data.scheduled_time)} · {getStatusBadge(item.data.status)}
                          </p>
                        </div>
                      )}
                      {item.type === 'prescription' && (
                        <div>
                          <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                            💊 Prescription issued
                          </p>
                          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {item.data.medication_name || 'Medication prescribed'}
                          </p>
                        </div>
                      )}
                      {item.type === 'referral' && (
                        <div>
                          <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                            📋 Referral — {item.data.referred_to_specialty || 'Specialist'}
                          </p>
                          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {getStatusBadge(item.data.urgency)} {item.data.referred_to_hospital || ''}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Summary */}
            <div>
              {/* Latest Diagnosis */}
              {summaries.length > 0 && (
                <div style={{ ...cardStyle, borderLeft: '3px solid #2563eb' }}>
                  <div style={sectionHeaderStyle}>
                    <Stethoscope size={18} style={{ color: '#2563eb' }} /> Latest Diagnosis
                  </div>
                  <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                    {summaries[0].diagnosis}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    {formatDate(summaries[0].consultation_date || summaries[0].created_at)}
                  </p>
                  {summaries[0].treatment_plan && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Treatment Plan</p>
                      <p style={{ fontSize: '0.85rem', color: '#1e293b' }}>{summaries[0].treatment_plan}</p>
                    </div>
                  )}
                  {summaries[0].follow_up_required && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertTriangle size={14} style={{ color: '#d97706' }} />
                      <span style={{ fontSize: '0.8rem', color: '#92400e' }}>
                        Follow-up: {summaries[0].follow_up_date ? formatDate(summaries[0].follow_up_date) : 'Required'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Current Medications */}
              {summaries.length > 0 && summaries[0].medications_prescribed && (
                <div style={{ ...cardStyle, borderLeft: '3px solid #16a34a' }}>
                  <div style={sectionHeaderStyle}>
                    <Pill size={18} style={{ color: '#16a34a' }} /> Current Medications
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                    {summaries[0].medications_prescribed}
                  </p>
                </div>
              )}

              {/* Red Flags */}
              {summaries.length > 0 && summaries[0].red_flags && (
                <div style={{ ...cardStyle, borderLeft: '3px solid #dc2626', backgroundColor: '#fef2f2' }}>
                  <div style={sectionHeaderStyle}>
                    <AlertTriangle size={18} style={{ color: '#dc2626' }} /> Warning Signs
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#991b1b', whiteSpace: 'pre-wrap' }}>
                    {summaries[0].red_flags}
                  </p>
                </div>
              )}

              {/* Allergies from latest pre-consult form */}
              {preConsultForms.length > 0 && preConsultForms[0].allergies && (
                <div style={{ ...cardStyle, borderLeft: '3px solid #f59e0b', backgroundColor: '#fffbeb' }}>
                  <div style={sectionHeaderStyle}>
                    <AlertTriangle size={18} style={{ color: '#f59e0b' }} /> Known Allergies
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                    {preConsultForms[0].allergies}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Consultations Tab */}
        {activeTab === 'consultations' && (
          <div>
            <div style={sectionHeaderStyle}>
              <Stethoscope size={18} style={{ color: '#2563eb' }} /> Consultation Summaries ({summaries.length})
            </div>
            {summaries.length === 0 ? (
              <div style={{ ...cardStyle, ...emptyStyle }}>
                <Stethoscope size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                <p>No consultation summaries recorded</p>
              </div>
            ) : (
              summaries.map(summary => (
                <div key={summary.id} style={itemCardStyle}>
                  <div style={itemHeaderStyle} onClick={() => toggleExpand(`summary-${summary.id}`)}>
                    <div>
                      <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                        {summary.diagnosis || 'Consultation'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {formatDate(summary.consultation_date || summary.created_at)}
                        {summary.follow_up_required && ' · Follow-up required'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {summary.follow_up_required && getStatusBadge('urgent')}
                      {expandedItems[`summary-${summary.id}`] ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                    </div>
                  </div>
                  {expandedItems[`summary-${summary.id}`] && (
                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
                      {summary.symptoms_presented && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Symptoms</span><span style={detailValueStyle}>{summary.symptoms_presented}</span></div>
                      )}
                      {summary.examination_findings && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Examination</span><span style={detailValueStyle}>{summary.examination_findings}</span></div>
                      )}
                      {summary.treatment_plan && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Treatment Plan</span><span style={detailValueStyle}>{summary.treatment_plan}</span></div>
                      )}
                      {summary.medications_prescribed && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Medications</span><span style={detailValueStyle}>{summary.medications_prescribed}</span></div>
                      )}
                      {summary.lifestyle_recommendations && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Lifestyle</span><span style={detailValueStyle}>{summary.lifestyle_recommendations}</span></div>
                      )}
                      {summary.patient_education && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Patient Education</span><span style={detailValueStyle}>{summary.patient_education}</span></div>
                      )}
                      {summary.follow_up_date && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Follow-up Date</span><span style={detailValueStyle}>{formatDate(summary.follow_up_date)}</span></div>
                      )}
                      {summary.follow_up_notes && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Follow-up Notes</span><span style={detailValueStyle}>{summary.follow_up_notes}</span></div>
                      )}
                      {summary.referral_required && summary.referral_specialty && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Referral</span><span style={detailValueStyle}>{summary.referral_specialty} — {summary.referral_notes || ''}</span></div>
                      )}
                      {summary.red_flags && (
                        <div style={{ ...detailRowStyle, backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                          <span style={{ ...detailLabelStyle, color: '#dc2626' }}>⚠️ Warning Signs</span>
                          <span style={{ ...detailValueStyle, color: '#991b1b' }}>{summary.red_flags}</span>
                        </div>
                      )}
                      {summary.additional_notes && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Additional Notes</span><span style={detailValueStyle}>{summary.additional_notes}</span></div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div>
            <div style={sectionHeaderStyle}>
              <Pill size={18} style={{ color: '#16a34a' }} /> Prescriptions ({prescriptions.length})
            </div>
            {prescriptions.length === 0 ? (
              <div style={{ ...cardStyle, ...emptyStyle }}>
                <Pill size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                <p>No prescriptions issued</p>
              </div>
            ) : (
              prescriptions.map(presc => (
                <div key={presc.id} style={itemCardStyle}>
                  <div style={itemHeaderStyle} onClick={() => toggleExpand(`presc-${presc.id}`)}>
                    <div>
                      <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                        {presc.medication_name || 'Prescription'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {formatDate(presc.created_at)}
                        {presc.dosage && ` · ${presc.dosage}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getStatusBadge(presc.status || 'active')}
                      {expandedItems[`presc-${presc.id}`] ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                    </div>
                  </div>
                  {expandedItems[`presc-${presc.id}`] && (
                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
                      {presc.medication_name && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Medication</span><span style={detailValueStyle}>{presc.medication_name}</span></div>
                      )}
                      {presc.dosage && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Dosage</span><span style={detailValueStyle}>{presc.dosage}</span></div>
                      )}
                      {presc.frequency && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Frequency</span><span style={detailValueStyle}>{presc.frequency}</span></div>
                      )}
                      {presc.duration && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Duration</span><span style={detailValueStyle}>{presc.duration}</span></div>
                      )}
                      {presc.instructions && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Instructions</span><span style={detailValueStyle}>{presc.instructions}</span></div>
                      )}
                      {presc.notes && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Notes</span><span style={detailValueStyle}>{presc.notes}</span></div>
                      )}
                      {presc.valid_until && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Valid Until</span><span style={detailValueStyle}>{formatDate(presc.valid_until)}</span></div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div>
            <div style={sectionHeaderStyle}>
              <Send size={18} style={{ color: '#9333ea' }} /> Referrals ({referrals.length})
            </div>
            {referrals.length === 0 ? (
              <div style={{ ...cardStyle, ...emptyStyle }}>
                <Send size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                <p>No referrals issued</p>
              </div>
            ) : (
              referrals.map(ref => (
                <div key={ref.id} style={itemCardStyle}>
                  <div style={itemHeaderStyle} onClick={() => toggleExpand(`ref-${ref.id}`)}>
                    <div>
                      <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                        {ref.referred_to_specialty || 'Specialist'} Referral
                        {ref.referred_to_hospital && ` — ${ref.referred_to_hospital}`}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {formatDate(ref.referral_date || ref.created_at)}
                        {ref.referred_to_name && ` · ${ref.referred_to_name}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getStatusBadge(ref.urgency)}
                      {getStatusBadge(ref.status)}
                      {expandedItems[`ref-${ref.id}`] ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                    </div>
                  </div>
                  {expandedItems[`ref-${ref.id}`] && (
                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
                      {ref.reason_for_referral && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Reason</span><span style={detailValueStyle}>{ref.reason_for_referral}</span></div>
                      )}
                      {ref.current_diagnosis && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Diagnosis</span><span style={detailValueStyle}>{ref.current_diagnosis}</span></div>
                      )}
                      {ref.clinical_summary && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Clinical Summary</span><span style={detailValueStyle}>{ref.clinical_summary}</span></div>
                      )}
                      {ref.current_medications && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Medications</span><span style={detailValueStyle}>{ref.current_medications}</span></div>
                      )}
                      {ref.investigations_done && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Investigations</span><span style={detailValueStyle}>{ref.investigations_done}</span></div>
                      )}
                      {ref.investigation_results && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Results</span><span style={detailValueStyle}>{ref.investigation_results}</span></div>
                      )}
                      {ref.specific_questions && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Questions</span><span style={detailValueStyle}>{ref.specific_questions}</span></div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            <div style={sectionHeaderStyle}>
              <FolderOpen size={18} style={{ color: '#f59e0b' }} /> Medical Documents ({documents.length})
            </div>
            {documents.length === 0 ? (
              <div style={{ ...cardStyle, ...emptyStyle }}>
                <FolderOpen size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                <p>No documents uploaded</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ ...cardStyle, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '8px', backgroundColor: '#fef3c7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <FileText size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.file_name || 'Document'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {formatDate(doc.created_at)} · {doc.document_type || doc.file_type || 'File'}
                        {doc.description && ` · ${doc.description}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pre-Consultation Forms Tab */}
        {activeTab === 'forms' && (
          <div>
            <div style={sectionHeaderStyle}>
              <ClipboardList size={18} style={{ color: '#6366f1' }} /> Pre-Consultation Forms ({preConsultForms.length})
            </div>
            {preConsultForms.length === 0 ? (
              <div style={{ ...cardStyle, ...emptyStyle }}>
                <ClipboardList size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
                <p>No pre-consultation forms submitted</p>
              </div>
            ) : (
              preConsultForms.map(form => (
                <div key={form.id} style={itemCardStyle}>
                  <div style={itemHeaderStyle} onClick={() => toggleExpand(`form-${form.id}`)}>
                    <div>
                      <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                        {form.chief_complaint || 'Pre-Consultation Form'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Submitted: {formatDateTime(form.created_at)}
                        {form.symptom_severity && ` · Severity: ${form.symptom_severity}`}
                      </p>
                    </div>
                    {expandedItems[`form-${form.id}`] ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                  </div>
                  {expandedItems[`form-${form.id}`] && (
                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
                      {form.chief_complaint && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Chief Complaint</span><span style={detailValueStyle}>{form.chief_complaint}</span></div>
                      )}
                      {form.current_symptoms && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Symptoms</span><span style={detailValueStyle}>{form.current_symptoms}</span></div>
                      )}
                      {form.symptom_duration && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Duration</span><span style={detailValueStyle}>{form.symptom_duration}</span></div>
                      )}
                      {form.current_medications && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Medications</span><span style={detailValueStyle}>{form.current_medications}</span></div>
                      )}
                      {form.allergies && (
                        <div style={{ ...detailRowStyle, backgroundColor: '#fef3c7', padding: '0.5rem', borderRadius: '6px' }}>
                          <span style={{ ...detailLabelStyle, color: '#92400e' }}>Allergies</span>
                          <span style={{ ...detailValueStyle, color: '#92400e', fontWeight: 500 }}>{form.allergies}</span>
                        </div>
                      )}
                      {form.medical_history && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Medical History</span><span style={detailValueStyle}>{form.medical_history}</span></div>
                      )}
                      {form.family_history && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Family History</span><span style={detailValueStyle}>{form.family_history}</span></div>
                      )}
                      {form.lifestyle_notes && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Lifestyle</span><span style={detailValueStyle}>{form.lifestyle_notes}</span></div>
                      )}
                      {form.additional_notes && (
                        <div style={detailRowStyle}><span style={detailLabelStyle}>Additional Notes</span><span style={detailValueStyle}>{form.additional_notes}</span></div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientChart;