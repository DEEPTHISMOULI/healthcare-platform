import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  Eye,
  X,
  Plus,
  FolderOpen
} from 'lucide-react';

const PatientDocuments = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('report');
  const [description, setDescription] = useState('');
  const [patientId, setPatientId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPatientAndDocuments();
    }
  }, [user]);

  const fetchPatientAndDocuments = async () => {
    try {
      // Get patient ID
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patient) {
        setPatientId(patient.id);
      }

      // Fetch documents
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          uploaded_by: user.id,
          patient_id: patientId,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          file_url: filePath,
          document_type: documentType,
          description: description
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully!');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDescription('');
      setDocumentType('report');
      fetchPatientAndDocuments();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await supabase.storage.from('medical-documents').remove([doc.file_url]);
      
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;

      toast.success('Document deleted');
      fetchPatientAndDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-documents')
        .download(doc.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleView = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-documents')
        .createSignedUrl(doc.file_url, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('View error:', error);
      toast.error('Failed to open document');
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <Image size={24} color="#8b5cf6" />;
    if (fileType?.includes('pdf')) return <FileText size={24} color="#ef4444" />;
    return <File size={24} color="#3b82f6" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getDocumentTypeBadge = (type) => {
    const colors = {
      report: { bg: '#dbeafe', color: '#2563eb' },
      prescription: { bg: '#d1fae5', color: '#059669' },
      image: { bg: '#ede9fe', color: '#7c3aed' },
      other: { bg: '#f3f4f6', color: '#6b7280' }
    };
    const style = colors[type] || colors.other;
    return (
      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: style.bg, color: style.color, textTransform: 'capitalize' }}>
        {type || 'Other'}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/patient/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none' }}>
            <ArrowLeft size={20} /> Back to Dashboard
          </Link>
          <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
            <Upload size={18} /> Upload Document
          </button>
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }} />
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>My Documents</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Upload and manage your medical documents, reports, and prescriptions</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div></div>
        ) : documents.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <FolderOpen size={64} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#64748b', marginBottom: '0.5rem', fontSize: '1.25rem' }}>No documents yet</h3>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Upload medical records, prescriptions, or test results</p>
            <button onClick={() => fileInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
              <Plus size={18} /> Upload Your First Document
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '0.5rem', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {getDocumentTypeBadge(doc.document_type)}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleView(doc)} style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }} title="View"><Eye size={16} color="#64748b" /></button>
                    <button onClick={() => handleDownload(doc)} style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }} title="Download"><Download size={16} color="#64748b" /></button>
                    <button onClick={() => handleDelete(doc)} style={{ padding: '0.5rem', backgroundColor: '#fee2e2', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }} title="Delete"><Trash2 size={16} color="#dc2626" /></button>
                  </div>
                </div>
                {doc.description && <p style={{ fontSize: '0.875rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>{doc.description}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      {showUploadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Upload Document</h2>
              <button onClick={() => { setShowUploadModal(false); setSelectedFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {getFileIcon(selectedFile?.type)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile?.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatFileSize(selectedFile?.size)}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Document Type</label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', backgroundColor: 'white' }}>
                <option value="report">Medical Report</option>
                <option value="prescription">Prescription</option>
                <option value="image">Medical Image (X-ray, Scan)</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a note about this document..." rows={3} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => { setShowUploadModal(false); setSelectedFile(null); }} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading} style={{ flex: 1, padding: '0.75rem', backgroundColor: uploading ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {uploading ? (<><span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>Uploading...</>) : (<><Upload size={18} />Upload</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;