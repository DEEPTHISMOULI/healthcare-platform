import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  FileText,
  User,
  Calendar,
  Pill,
  X,
  Save,
  Trash2,
  Eye,
  Search,
  Clock,
  Upload,
  File,
  Download,
  Paperclip
} from 'lucide-react';

const DoctorPrescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // File upload states
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    diagnosis: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
    instructions: '',
    notes: '',
    valid_until: ''
  });

  useEffect(() => {
    if (user) {
      fetchDoctorAndData();
    }
  }, [user]);

  const fetchDoctorAndData = async () => {
    try {
      // Get doctor ID
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (doctor) {
        setDoctorId(doctor.id);
        await fetchPrescriptions(doctor.id);
        await fetchPatients(doctor.id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async (docId) => {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('doctor_id', docId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prescriptions:', error);
      return;
    }

    // Fetch patient names
    if (data && data.length > 0) {
      const patientIds = [...new Set(data.map(p => p.patient_id))];
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, user_id')
        .in('id', patientIds);

      const userIds = patientsData?.map(p => p.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const prescriptionsWithPatients = data.map(prescription => {
        const patient = patientsData?.find(p => p.id === prescription.patient_id);
        const profile = profilesData?.find(pr => pr.id === patient?.user_id);
        return {
          ...prescription,
          patient_name: profile?.full_name || 'Unknown',
          patient_email: profile?.email || ''
        };
      });

      setPrescriptions(prescriptionsWithPatients);
    } else {
      setPrescriptions([]);
    }
  };

  const fetchPatients = async (docId) => {
    // Get patients who have appointments with this doctor
    const { data: appointments } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', docId);

    if (appointments && appointments.length > 0) {
      const patientIds = [...new Set(appointments.map(a => a.patient_id))];
      
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, user_id')
        .in('id', patientIds);

      const userIds = patientsData?.map(p => p.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const patientsWithNames = patientsData?.map(patient => {
        const profile = profilesData?.find(p => p.id === patient.user_id);
        return {
          ...patient,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || ''
        };
      }) || [];

      setPatients(patientsWithNames);
    }
  };

  const handleAddMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '' }]
    }));
  };

  const handleRemoveMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  // File upload handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max size is 10MB.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} has an unsupported file type.`);
        return false;
      }
      return true;
    });

    setAttachedFiles(prev => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (prescriptionId, patientId) => {
    if (attachedFiles.length === 0) return [];

    const uploadedFiles = [];

    for (const file of attachedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `prescriptions/${patientId}/${prescriptionId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(filePath);

      // Save file reference to documents table
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          patient_id: patientId,
          uploaded_by: user.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: filePath,
          document_type: 'prescription_attachment',
          description: `Attachment for prescription ${prescriptionId}`
        });

      if (!docError) {
        uploadedFiles.push({
          name: file.name,
          url: filePath,
          type: file.type,
          size: file.size
        });
      }
    }

    return uploadedFiles;
  };

  const handleSubmit = async () => {
    if (!formData.patient_id || !formData.diagnosis || formData.medications[0].name === '') {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    setUploading(attachedFiles.length > 0);

    try {
      const validUntil = formData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // First create the prescription
      const { data: prescription, error } = await supabase
        .from('prescriptions')
        .insert({
          doctor_id: doctorId,
          patient_id: formData.patient_id,
          diagnosis: formData.diagnosis,
          medications: formData.medications,
          instructions: formData.instructions,
          notes: formData.notes,
          valid_until: validUntil,
          issue_date: new Date().toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Upload attached files
      if (attachedFiles.length > 0) {
        const uploadedFiles = await uploadFiles(prescription.id, formData.patient_id);
        
        // Update prescription with attachment info
        if (uploadedFiles.length > 0) {
          await supabase
            .from('prescriptions')
            .update({ attachments: uploadedFiles })
            .eq('id', prescription.id);
        }
      }

      toast.success('Prescription created successfully!');
      setShowModal(false);
      resetForm();
      fetchPrescriptions(doctorId);
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      diagnosis: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
      instructions: '',
      notes: '',
      valid_until: ''
    });
    setAttachedFiles([]);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    return '📎';
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
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
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const filteredPrescriptions = prescriptions.filter(p =>
    p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/doctor/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none' }}>
            <ArrowLeft size={20} /> Back to Dashboard
          </Link>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <Plus size={18} /> New Prescription
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          Prescriptions
        </h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Create and manage patient prescriptions
        </p>

        {/* Search */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by patient or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {/* Prescriptions List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <FileText size={64} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No prescriptions yet</h3>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Create your first prescription for a patient</p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <Plus size={18} /> Create Prescription
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredPrescriptions.map(prescription => (
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
                      <User size={24} color="#3b82f6" />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                        {prescription.patient_name}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        {prescription.diagnosis}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={14} /> Issued: {formatDate(prescription.issue_date || prescription.created_at)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} /> Valid until: {formatDate(prescription.valid_until)}
                        </span>
                        {prescription.attachments?.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Paperclip size={14} /> {prescription.attachments.length} file(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: prescription.status === 'active' ? '#dcfce7' : '#f3f4f6',
                      color: prescription.status === 'active' ? '#166534' : '#6b7280'
                    }}>
                      {prescription.status}
                    </span>
                    <button
                      onClick={() => setSelectedPrescription(prescription)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#f1f5f9',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={18} color="#64748b" />
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
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Prescription Modal */}
      {showModal && (
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>New Prescription</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#64748b" />
              </button>
            </div>

            {/* Patient Selection */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Patient <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.patient_id}
                onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', backgroundColor: 'white' }}
              >
                <option value="">Select patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.full_name} ({patient.email})</option>
                ))}
              </select>
            </div>

            {/* Diagnosis */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Diagnosis <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.diagnosis}
                onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Enter diagnosis"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }}
              />
            </div>

            {/* Medications */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontWeight: 500 }}>Medications <span style={{ color: '#ef4444' }}>*</span></label>
                <button
                  onClick={handleAddMedication}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#eff6ff',
                    color: '#3b82f6',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
              
              {formData.medications.map((med, index) => (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem'
                }}>
                  <input
                    type="text"
                    placeholder="Medication name"
                    value={med.name}
                    onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Duration"
                    value={med.duration}
                    onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                  {formData.medications.length > 1 && (
                    <button
                      onClick={() => handleRemoveMedication(index)}
                      style={{ padding: '0.5rem', backgroundColor: '#fee2e2', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} color="#dc2626" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="General instructions for the patient..."
                rows={3}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
              />
            </div>

            {/* Valid Until */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Default: 30 days from today</p>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={2}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
              />
            </div>

            {/* File Attachments Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                <Paperclip size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Attachments
              </label>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                Attach lab results, reports, or other relevant documents (PDF, Images, Word - Max 10MB each)
              </p>

              {/* File Drop Zone */}
              <div
                style={{
                  border: '2px dashed #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onClick={() => document.getElementById('file-input').click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  const files = Array.from(e.dataTransfer.files);
                  handleFileSelect({ target: { files } });
                }}
              >
                <Upload size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ color: '#64748b', marginBottom: '0.25rem' }}>
                  Drag and drop files here, or click to browse
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  PDF, JPG, PNG, DOC, DOCX
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{getFileIcon(file.type)}</span>
                        <div>
                          <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{file.name}</p>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        style={{
                          padding: '0.375rem',
                          backgroundColor: '#fee2e2',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={16} color="#dc2626" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: saving ? '#93c5fd' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {saving ? (uploading ? 'Uploading files...' : 'Creating...') : <><Save size={18} /> Create Prescription</>}
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{selectedPrescription.patient_name}</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{selectedPrescription.patient_email}</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Diagnosis</p>
              <p style={{ fontWeight: 500, color: '#1e293b' }}>{selectedPrescription.diagnosis}</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Medications</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(selectedPrescription.medications || []).map((med, i) => (
                  <div key={i} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                    <p style={{ fontWeight: 500, color: '#1e293b' }}>{med.name}</p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {med.dosage} • {med.frequency} • {med.duration}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {selectedPrescription.instructions && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Instructions</p>
                <p style={{ color: '#1e293b' }}>{selectedPrescription.instructions}</p>
              </div>
            )}

            {/* Attachments Section in View Modal */}
            {selectedPrescription.attachments && selectedPrescription.attachments.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  <Paperclip size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  Attachments ({selectedPrescription.attachments.length})
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
                        backgroundColor: '#f8fafc',
                        borderRadius: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{getFileIcon(attachment.type)}</span>
                        <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>{attachment.name}</span>
                      </div>
                      <button
                        onClick={() => handleDownloadAttachment(attachment)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.375rem 0.75rem',
                          backgroundColor: '#eff6ff',
                          color: '#3b82f6',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#64748b' }}>
              <span>Issued: {formatDate(selectedPrescription.issue_date || selectedPrescription.created_at)}</span>
              <span>Valid until: {formatDate(selectedPrescription.valid_until)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPrescriptions;