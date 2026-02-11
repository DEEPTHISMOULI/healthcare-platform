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
  Pill,
  Download,
  Eye,
  X,
  User,
  Paperclip
} from 'lucide-react';

const PatientPrescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPrescriptions();
    }
  }, [user]);

  const fetchPrescriptions = async () => {
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

      // Fetch prescriptions
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch doctor names
      if (data && data.length > 0) {
        const doctorIds = [...new Set(data.map(p => p.doctor_id))];
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('id, user_id')
          .in('id', doctorIds);

        const userIds = doctorsData?.map(d => d.user_id) || [];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const prescriptionsWithDoctors = data.map(prescription => {
          const doctor = doctorsData?.find(d => d.id === prescription.doctor_id);
          const profile = profilesData?.find(p => p.id === doctor?.user_id);
          return {
            ...prescription,
            doctor_name: profile?.full_name || 'Doctor'
          };
        });

        setPrescriptions(prescriptionsWithDoctors);
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isExpired = (validUntil) => {
    return new Date(validUntil) < new Date();
  };

  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      toast.loading('Downloading...', { id: 'download' });
      
      const { data, error } = await supabase.storage
        .from('medical-documents')
        .download(attachment.url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Download complete', { id: 'download' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file', { id: 'download' });
    }
  };

  const handlePrint = (prescription) => {
    const printContent = `
      <html>
        <head>
          <title>Prescription - Dr. Naren Clinic</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #3b82f6; margin: 0; }
            .header p { color: #666; margin: 5px 0; }
            .patient-info { margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .medication { background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
            .medication-name { font-weight: bold; color: #333; }
            .medication-details { color: #666; font-size: 14px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            .dates { display: flex; justify-content: space-between; margin-top: 30px; font-size: 14px; }
            .attachments { margin-top: 20px; padding: 10px; background: #f0f9ff; border-radius: 5px; }
            .attachments-title { font-weight: bold; color: #0369a1; margin-bottom: 5px; }
            .attachment-item { font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏥 Dr. Naren Clinic</h1>
            <p>Telemedicine Healthcare Platform</p>
          </div>
          
          <div class="section">
            <div class="section-title">Prescribed by</div>
            <p>Dr. ${prescription.doctor_name}</p>
          </div>

          <div class="section">
            <div class="section-title">Diagnosis</div>
            <p>${prescription.diagnosis || 'N/A'}</p>
          </div>

          <div class="section">
            <div class="section-title">Medications</div>
            ${(prescription.medications || []).map(med => `
              <div class="medication">
                <div class="medication-name">${med.name}</div>
                <div class="medication-details">
                  Dosage: ${med.dosage || 'As directed'} | 
                  Frequency: ${med.frequency || 'As directed'} | 
                  Duration: ${med.duration || 'As directed'}
                </div>
              </div>
            `).join('')}
          </div>

          ${prescription.instructions ? `
            <div class="section">
              <div class="section-title">Instructions</div>
              <p>${prescription.instructions}</p>
            </div>
          ` : ''}

          ${prescription.notes ? `
            <div class="section">
              <div class="section-title">Additional Notes</div>
              <p>${prescription.notes}</p>
            </div>
          ` : ''}

          ${prescription.attachments && prescription.attachments.length > 0 ? `
            <div class="attachments">
              <div class="attachments-title">📎 Attachments (${prescription.attachments.length} file(s))</div>
              ${prescription.attachments.map(att => `
                <div class="attachment-item">• ${att.name}</div>
              `).join('')}
              <p style="font-size: 12px; color: #666; margin-top: 10px;">
                Note: Please download attachments from the online portal.
              </p>
            </div>
          ` : ''}

          <div class="dates">
            <span>Issue Date: ${formatDate(prescription.issue_date || prescription.created_at)}</span>
            <span>Valid Until: ${formatDate(prescription.valid_until)}</span>
          </div>

          <div class="footer">
            <p>This is a digital prescription issued through Dr. Naren Clinic's telemedicine platform.</p>
            <p>For emergencies, please visit your nearest hospital.</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <Link to="/patient/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none' }}>
            <ArrowLeft size={20} /> Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          My Prescriptions
        </h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          View and download your prescriptions from doctors
        </p>

        {/* Prescriptions List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
          </div>
        ) : prescriptions.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <FileText size={64} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No prescriptions yet</h3>
            <p style={{ color: '#94a3b8' }}>Your prescriptions will appear here after consultations</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {prescriptions.map(prescription => (
              <div
                key={prescription.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText size={24} color="#3b82f6" />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                        {prescription.diagnosis || 'Prescription'}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={14} /> Dr. {prescription.doctor_name}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} /> {formatDate(prescription.issue_date || prescription.created_at)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} /> Valid until: {formatDate(prescription.valid_until)}
                        </span>
                        {prescription.attachments?.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6' }}>
                            <Paperclip size={14} /> {prescription.attachments.length} file(s) attached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isExpired(prescription.valid_until) ? (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#fee2e2',
                        color: '#dc2626'
                      }}>
                        Expired
                      </span>
                    ) : (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#dcfce7',
                        color: '#166534'
                      }}>
                        Active
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedPrescription(prescription)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#f1f5f9',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                      title="View"
                    >
                      <Eye size={18} color="#64748b" />
                    </button>
                    <button
                      onClick={() => handlePrint(prescription)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#dbeafe',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                      title="Download/Print"
                    >
                      <Download size={18} color="#3b82f6" />
                    </button>
                  </div>
                </div>

                {/* Medications Preview */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Medications:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(prescription.medications || []).map((med, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#eff6ff',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          color: '#3b82f6'
                        }}
                      >
                        <Pill size={12} /> {med.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Attachments Preview */}
                {prescription.attachments?.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                      <Paperclip size={12} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                      Attached Documents:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {prescription.attachments.map((attachment, i) => (
                        <button
                          key={i}
                          onClick={() => handleDownloadAttachment(attachment)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            color: '#0369a1',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{getFileIcon(attachment.type)}</span>
                          {attachment.name.length > 25 ? attachment.name.substring(0, 25) + '...' : attachment.name}
                          <Download size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* View Prescription Modal */}
      {selectedPrescription && (
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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Prescription Details</h2>
              <button onClick={() => setSelectedPrescription(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#64748b" />
              </button>
            </div>

            {/* Doctor Info */}
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Prescribed by</p>
              <p style={{ fontWeight: 600, color: '#1e293b' }}>Dr. {selectedPrescription.doctor_name}</p>
            </div>

            {/* Diagnosis */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Diagnosis</p>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>{selectedPrescription.diagnosis}</p>
            </div>

            {/* Medications */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Medications</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(selectedPrescription.medications || []).map((med, i) => (
                  <div key={i} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                    <p style={{ fontWeight: 500, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Pill size={16} color="#3b82f6" /> {med.name}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {med.dosage && `Dosage: ${med.dosage}`}
                      {med.frequency && ` • Frequency: ${med.frequency}`}
                      {med.duration && ` • Duration: ${med.duration}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {selectedPrescription.instructions && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Instructions</p>
                <p style={{ 
                  color: '#1e293b', 
                  backgroundColor: '#fffbeb', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem',
                  borderLeft: '3px solid #f59e0b'
                }}>
                  {selectedPrescription.instructions}
                </p>
              </div>
            )}

            {/* Notes */}
            {selectedPrescription.notes && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Additional Notes</p>
                <p style={{ color: '#1e293b' }}>{selectedPrescription.notes}</p>
              </div>
            )}

            {/* Attachments */}
            {selectedPrescription.attachments && selectedPrescription.attachments.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <Paperclip size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  Attachments ({selectedPrescription.attachments.length} file{selectedPrescription.attachments.length > 1 ? 's' : ''})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedPrescription.attachments.map((attachment, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        backgroundColor: '#f0f9ff',
                        borderRadius: '0.5rem',
                        border: '1px solid #bae6fd'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{getFileIcon(attachment.type)}</span>
                        <div>
                          <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{attachment.name}</p>
                          {attachment.size && (
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatFileSize(attachment.size)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadAttachment(attachment)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}
                      >
                        <Download size={16} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
              <span>Issued: {formatDate(selectedPrescription.issue_date || selectedPrescription.created_at)}</span>
              <span>Valid until: {formatDate(selectedPrescription.valid_until)}</span>
            </div>

            {/* Print Button */}
            <button
              onClick={() => handlePrint(selectedPrescription)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={18} /> Download / Print Prescription
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientPrescriptions;