import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Clock,
  Download,
  Printer,
  Building2,
  Stethoscope,
  AlertTriangle,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

const PatientReferrals = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (user) fetchReferrals();
  }, [user]);

  const fetchReferrals = async () => {
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

      // Fetch referrals
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('patient_id', patient.id)
        .in('status', ['sent', 'accepted', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch doctor names for each referral
      const referralsWithDoctors = await Promise.all(
        (data || []).map(async (referral) => {
          let doctorName = 'Unknown Doctor';
          if (referral.doctor_id) {
            const { data: doctor } = await supabase
              .from('doctors')
              .select('user_id')
              .eq('id', referral.doctor_id)
              .single();

            if (doctor?.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', doctor.user_id)
                .single();
              doctorName = profile?.full_name || 'Unknown Doctor';
            }
          }
          return { ...referral, doctor_name: doctorName };
        })
      );

      setReferrals(referralsWithDoctors);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const getUrgencyBadge = (urgency) => {
    const styles = {
      routine: { bg: '#dcfce7', color: '#16a34a', label: 'Routine' },
      urgent: { bg: '#fef3c7', color: '#d97706', label: 'Urgent' },
      emergency: { bg: '#fee2e2', color: '#dc2626', label: 'Emergency' }
    };
    const s = styles[urgency] || styles.routine;
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color
      }}>
        {s.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: { bg: '#dbeafe', color: '#2563eb', label: 'Issued' },
      accepted: { bg: '#dcfce7', color: '#16a34a', label: 'Accepted' },
      completed: { bg: '#f3e8ff', color: '#9333ea', label: 'Completed' }
    };
    const s = styles[status] || styles.sent;
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color
      }}>
        {s.label}
      </span>
    );
  };

  const handlePrint = (referral) => {
    const printContent = `
      <html>
      <head>
        <title>Referral Letter - Dr. Naren Clinic</title>
        <style>
          body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
          .header p { color: #666; margin: 5px 0; font-size: 14px; }
          .urgency { display: inline-block; padding: 4px 16px; border-radius: 20px; font-weight: bold; font-size: 13px; margin-top: 10px; }
          .urgency-routine { background: #dcfce7; color: #16a34a; }
          .urgency-urgent { background: #fef3c7; color: #d97706; }
          .urgency-emergency { background: #fee2e2; color: #dc2626; }
          .date-line { text-align: right; color: #666; margin-bottom: 20px; font-size: 14px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; color: #2563eb; font-size: 15px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .content { white-space: pre-wrap; font-size: 14px; }
          .two-col { display: flex; gap: 30px; }
          .two-col > div { flex: 1; }
          .info-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
          .info-value { font-size: 14px; margin-bottom: 8px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #666; font-size: 12px; }
          .signature { margin-top: 40px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dr. Naren Clinic</h1>
          <p>Referral Letter</p>
          <span class="urgency urgency-${referral.urgency}">${referral.urgency?.toUpperCase()} REFERRAL</span>
        </div>
        <div class="date-line">Date: ${formatDate(referral.referral_date || referral.created_at)}</div>
        
        ${referral.referred_to_name || referral.referred_to_hospital ? `
        <div class="section">
          <div class="section-title">Referred To</div>
          ${referral.referred_to_name ? `<div class="info-value"><strong>${referral.referred_to_name}</strong></div>` : ''}
          ${referral.referred_to_specialty ? `<div class="info-value">${referral.referred_to_specialty}</div>` : ''}
          ${referral.referred_to_hospital ? `<div class="info-value">${referral.referred_to_hospital}</div>` : ''}
          ${referral.referred_to_address ? `<div class="info-value">${referral.referred_to_address}</div>` : ''}
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Reason for Referral</div>
          <div class="content">${referral.reason_for_referral || 'N/A'}</div>
        </div>

        ${referral.current_diagnosis ? `
        <div class="section">
          <div class="section-title">Current Diagnosis</div>
          <div class="content">${referral.current_diagnosis}</div>
        </div>` : ''}

        ${referral.clinical_summary ? `
        <div class="section">
          <div class="section-title">Clinical Summary</div>
          <div class="content">${referral.clinical_summary}</div>
        </div>` : ''}

        ${referral.relevant_history ? `
        <div class="section">
          <div class="section-title">Relevant Medical History</div>
          <div class="content">${referral.relevant_history}</div>
        </div>` : ''}

        ${referral.current_medications ? `
        <div class="section">
          <div class="section-title">Current Medications</div>
          <div class="content">${referral.current_medications}</div>
        </div>` : ''}

        ${referral.investigations_done ? `
        <div class="section">
          <div class="section-title">Investigations Performed</div>
          <div class="content">${referral.investigations_done}</div>
        </div>` : ''}

        ${referral.investigation_results ? `
        <div class="section">
          <div class="section-title">Investigation Results</div>
          <div class="content">${referral.investigation_results}</div>
        </div>` : ''}

        ${referral.specific_questions ? `
        <div class="section">
          <div class="section-title">Specific Questions</div>
          <div class="content">${referral.specific_questions}</div>
        </div>` : ''}

        ${referral.additional_notes ? `
        <div class="section">
          <div class="section-title">Additional Notes</div>
          <div class="content">${referral.additional_notes}</div>
        </div>` : ''}

        <div class="signature">
          <p>Yours sincerely,</p>
          <br/>
          <p><strong>Dr. ${referral.doctor_name || 'Unknown'}</strong></p>
          <p>Dr. Naren Clinic</p>
        </div>

        <div class="footer">
          <p>This referral letter was generated through Dr. Naren Clinic's telemedicine platform.</p>
          <p>For emergencies, please call emergency services or visit A&E.</p>
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Styles
  const pageStyle = { minHeight: '100vh', backgroundColor: '#f8fafc' };
  const headerStyle = { backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 };
  const backLinkStyle = { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem' };
  const mainStyle = { maxWidth: '900px', margin: '0 auto', padding: '2rem' };
  const cardStyle = { backgroundColor: 'white', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' };
  const cardHeaderStyle = { padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const detailSectionStyle = { marginBottom: '1rem' };
  const detailLabelStyle = { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' };
  const detailValueStyle = { fontSize: '0.875rem', color: '#1e293b', whiteSpace: 'pre-wrap' };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ color: '#64748b' }}>Loading referrals...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Link to="/patient/dashboard" style={backLinkStyle}>
            <ArrowLeft size={20} /> Back to Dashboard
          </Link>
        </div>
      </header>

      <main style={mainStyle}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          My Referral Letters
        </h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          View referral letters issued by your doctor for specialist consultations
        </p>

        {referrals.length === 0 ? (
          <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#64748b', fontWeight: 500 }}>No Referral Letters</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              You don't have any referral letters yet. Your doctor will create one if a specialist consultation is needed.
            </p>
          </div>
        ) : (
          referrals.map((referral) => (
            <div key={referral.id} style={cardStyle}>
              {/* Card Header - always visible */}
              <div
                style={cardHeaderStyle}
                onClick={() => setExpandedId(expandedId === referral.id ? null : referral.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FileText size={22} style={{ color: '#2563eb' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>
                        {referral.referred_to_specialty || 'Specialist'} Referral
                      </p>
                      {getUrgencyBadge(referral.urgency)}
                      {getStatusBadge(referral.status)}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Referred by Dr. {referral.doctor_name} · {formatDate(referral.referral_date || referral.created_at)}
                      {referral.referred_to_hospital && ` · ${referral.referred_to_hospital}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrint(referral); }}
                    style={{
                      padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px',
                      backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      gap: '0.375rem', fontSize: '0.8rem', color: '#374151'
                    }}
                  >
                    <Printer size={14} /> Print
                  </button>
                  {expandedId === referral.id ? <ChevronUp size={20} style={{ color: '#94a3b8' }} /> : <ChevronDown size={20} style={{ color: '#94a3b8' }} />}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === referral.id && (
                <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                  {/* Referred To Info */}
                  {(referral.referred_to_name || referral.referred_to_hospital) && (
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Referred To</p>
                      {referral.referred_to_name && <p style={{ fontWeight: 600, color: '#1e293b' }}>{referral.referred_to_name}</p>}
                      {referral.referred_to_specialty && <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{referral.referred_to_specialty}</p>}
                      {referral.referred_to_hospital && (
                        <p style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Building2 size={14} /> {referral.referred_to_hospital}
                        </p>
                      )}
                      {referral.referred_to_address && (
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{referral.referred_to_address}</p>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        {referral.referred_to_phone && (
                          <p style={{ fontSize: '0.8rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={12} /> {referral.referred_to_phone}
                          </p>
                        )}
                        {referral.referred_to_email && (
                          <p style={{ fontSize: '0.8rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Mail size={12} /> {referral.referred_to_email}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Clinical Details */}
                  <div style={{ marginTop: '1rem' }}>
                    {referral.reason_for_referral && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Reason for Referral</p>
                        <p style={detailValueStyle}>{referral.reason_for_referral}</p>
                      </div>
                    )}
                    {referral.current_diagnosis && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Current Diagnosis</p>
                        <p style={detailValueStyle}>{referral.current_diagnosis}</p>
                      </div>
                    )}
                    {referral.clinical_summary && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Clinical Summary</p>
                        <p style={detailValueStyle}>{referral.clinical_summary}</p>
                      </div>
                    )}
                    {referral.relevant_history && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Relevant Medical History</p>
                        <p style={detailValueStyle}>{referral.relevant_history}</p>
                      </div>
                    )}
                    {referral.current_medications && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Current Medications</p>
                        <p style={detailValueStyle}>{referral.current_medications}</p>
                      </div>
                    )}
                    {referral.investigations_done && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Investigations Done</p>
                        <p style={detailValueStyle}>{referral.investigations_done}</p>
                      </div>
                    )}
                    {referral.investigation_results && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Investigation Results</p>
                        <p style={detailValueStyle}>{referral.investigation_results}</p>
                      </div>
                    )}
                    {referral.specific_questions && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Specific Questions for Specialist</p>
                        <p style={detailValueStyle}>{referral.specific_questions}</p>
                      </div>
                    )}
                    {referral.additional_notes && (
                      <div style={detailSectionStyle}>
                        <p style={detailLabelStyle}>Additional Notes</p>
                        <p style={detailValueStyle}>{referral.additional_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default PatientReferrals;
