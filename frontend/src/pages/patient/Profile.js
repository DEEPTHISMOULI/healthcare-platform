import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  Phone,
  Shield,
  Save
} from 'lucide-react';

const PatientProfile = () => {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_type: '',
    allergies: '',
    medical_conditions: ''
  });
  const [patientData, setPatientData] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchProfile();
  }, [user, authLoading]);

  const fetchProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        if (authProfile) {
          setProfile(prev => ({
            ...prev,
            full_name: authProfile.full_name || '',
            email: authProfile.email || user.email || '',
            phone: authProfile.phone || ''
          }));
        }
        setLoading(false);
        return;
      }

      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile({
        full_name: profileData?.full_name || '',
        email: profileData?.email || user.email || '',
        phone: profileData?.phone || '',
        date_of_birth: patient?.date_of_birth || '',
        gender: patient?.gender || '',
        address: patient?.address || '',
        emergency_contact_name: patient?.emergency_contact_name || '',
        emergency_contact_phone: patient?.emergency_contact_phone || '',
        blood_type: patient?.blood_type || '',
        allergies: patient?.allergies || '',
        medical_conditions: patient?.medical_conditions || ''
      });

      setPatientData(patient);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      const patientUpdate = {
        user_id: user.id,
        date_of_birth: profile.date_of_birth || null,
        gender: profile.gender || null,
        address: profile.address || null,
        emergency_contact_name: profile.emergency_contact_name || null,
        emergency_contact_phone: profile.emergency_contact_phone || null,
        blood_type: profile.blood_type || null,
        allergies: profile.allergies || null,
        medical_conditions: profile.medical_conditions || null
      };

      if (patientData?.id) {
        await supabase.from('patients').update(patientUpdate).eq('id', patientData.id);
      } else {
        const { data } = await supabase.from('patients').insert(patientUpdate).select().single();
        if (data) setPatientData(data);
      }

      toast.success('Profile updated!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/patient/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none' }}>
            <ArrowLeft size={20} /> Back to Dashboard
          </Link>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: saving ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>My Profile</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Manage your personal information</p>

        {/* Profile Header */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontSize: '2.5rem', fontWeight: 600 }}>
              {profile.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>{profile.full_name || 'Your Name'}</h2>
              <p style={{ color: '#64748b' }}>{profile.email}</p>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={20} /> Personal Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Full Name</label>
              <input type="text" name="full_name" value={profile.full_name} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Email</label>
              <input type="email" value={profile.email} disabled style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', backgroundColor: '#f8fafc', color: '#64748b' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Phone</label>
              <input type="tel" name="phone" value={profile.phone} onChange={handleChange} placeholder="+44 7123 456789" style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Date of Birth</label>
              <input type="date" name="date_of_birth" value={profile.date_of_birth} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Gender</label>
              <select name="gender" value={profile.gender} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', backgroundColor: 'white' }}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Blood Type</label>
              <select name="blood_type" value={profile.blood_type} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', backgroundColor: 'white' }}>
                <option value="">Select</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Address</label>
            <textarea name="address" value={profile.address} onChange={handleChange} placeholder="Your address" rows={2} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} />
          </div>
        </div>

        {/* Emergency Contact */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={20} /> Emergency Contact</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Contact Name</label>
              <input type="text" name="emergency_contact_name" value={profile.emergency_contact_name} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Contact Phone</label>
              <input type="tel" name="emergency_contact_phone" value={profile.emergency_contact_phone} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }} />
            </div>
          </div>
        </div>

        {/* Medical Info */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={20} /> Medical Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Allergies</label>
              <textarea name="allergies" value={profile.allergies} onChange={handleChange} placeholder="List any allergies" rows={2} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>Medical Conditions</label>
              <textarea name="medical_conditions" value={profile.medical_conditions} onChange={handleChange} placeholder="List any conditions" rows={3} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: saving ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '1rem' }}>
          <Save size={20} /> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </main>
    </div>
  );
};

export default PatientProfile;