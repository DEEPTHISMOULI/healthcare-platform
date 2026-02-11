import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Mail, Lock, User, Phone, UserPlus, Stethoscope, FileText } from 'lucide-react';

const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('patient');
  const { signUp } = useAuth();
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm();
  
  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await signUp(
        data.email, 
        data.password,
        {
          full_name: data.fullName,
          role: role,
          phone: data.phone,
          // Include doctor-specific data in metadata for trigger
          specialisation: role === 'doctor' ? (data.specialisation || 'General Practice') : null,
          license_number: role === 'doctor' ? (data.licenseNumber || 'PENDING') : null
        }
      );
      
      if (authError) {
        toast.error(authError.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // The trigger should handle profile creation, but let's ensure role-specific tables are populated
      if (authData?.user) {
        // Small delay to let the trigger complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create role-specific record
        if (role === 'patient') {
          const { error: patientError } = await supabase.from('patients').insert({
            user_id: authData.user.id
          });
          if (patientError && !patientError.message.includes('duplicate')) {
            console.error('Patient record creation error:', patientError);
          }
        } else if (role === 'doctor') {
          const { error: doctorError } = await supabase.from('doctors').insert({
            user_id: authData.user.id,
            specialisation: data.specialisation || 'General Practice',
            license_number: data.licenseNumber || 'PENDING',
            consultation_fee: 50.00,
            is_available: true
          });
          if (doctorError && !doctorError.message.includes('duplicate')) {
            console.error('Doctor record creation error:', doctorError);
            // If RLS blocks this, we'll handle it via a database trigger instead
          }
        }
      }
      
      toast.success('Account created! Please check your email to verify.');
      navigate(role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
      
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Join Dr. Naren's Healthcare Platform
          </p>
        </div>

        {/* Role Selector */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setRole('patient')}
            style={{
              flex: 1,
              padding: '1rem',
              border: `2px solid ${role === 'patient' ? 'var(--primary)' : 'var(--gray-200)'}`,
              borderRadius: '0.75rem',
              background: role === 'patient' ? 'var(--primary-light)' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <User size={24} style={{ margin: '0 auto', color: role === 'patient' ? 'var(--primary)' : 'var(--gray-400)' }} />
            <div style={{ marginTop: '0.5rem', fontWeight: 600, color: role === 'patient' ? 'var(--primary)' : 'var(--gray-600)' }}>
              Patient
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setRole('doctor')}
            style={{
              flex: 1,
              padding: '1rem',
              border: `2px solid ${role === 'doctor' ? 'var(--primary)' : 'var(--gray-200)'}`,
              borderRadius: '0.75rem',
              background: role === 'doctor' ? 'var(--primary-light)' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Stethoscope size={24} style={{ margin: '0 auto', color: role === 'doctor' ? 'var(--primary)' : 'var(--gray-400)' }} />
            <div style={{ marginTop: '0.5rem', fontWeight: 600, color: role === 'doctor' ? 'var(--primary)' : 'var(--gray-600)' }}>
              Doctor
            </div>
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-with-icon">
              <User size={18} />
              <input
                type="text"
                className={`form-input ${errors.fullName ? 'error' : ''}`}
                placeholder="Enter your full name"
                {...register('fullName', { 
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
              />
            </div>
            {errors.fullName && <span className="error-text">{errors.fullName.message}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
            </div>
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div className="input-with-icon">
              <Phone size={18} />
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'error' : ''}`}
                placeholder="+44 7123 456789"
                {...register('phone', { 
                  required: 'Phone number is required'
                })}
              />
            </div>
            {errors.phone && <span className="error-text">{errors.phone.message}</span>}
          </div>

          {/* Doctor-specific fields */}
          {role === 'doctor' && (
            <>
              <div className="form-group">
                <label className="form-label">Specialisation</label>
                <div className="input-with-icon">
                  <Stethoscope size={18} />
                  <select
                    className={`form-input ${errors.specialisation ? 'error' : ''}`}
                    {...register('specialisation', { required: 'Specialisation is required' })}
                  >
                    <option value="">Select specialisation</option>
                    <option value="General Practice">General Practice</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Gynecology">Gynecology</option>
                    <option value="ENT">ENT (Ear, Nose, Throat)</option>
                    <option value="Ophthalmology">Ophthalmology</option>
                  </select>
                </div>
                {errors.specialisation && <span className="error-text">{errors.specialisation.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Medical License Number</label>
                <div className="input-with-icon">
                  <FileText size={18} />
                  <input
                    type="text"
                    className={`form-input ${errors.licenseNumber ? 'error' : ''}`}
                    placeholder="e.g., GMC1234567"
                    {...register('licenseNumber', { 
                      required: 'License number is required'
                    })}
                  />
                </div>
                {errors.licenseNumber && <span className="error-text">{errors.licenseNumber.message}</span>}
              </div>
            </>
          )}

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Create a password"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
              />
            </div>
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
              />
            </div>
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword.message}</span>}
          </div>

          {/* Terms */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                {...register('terms', { required: 'You must accept the terms' })}
                style={{ marginTop: '0.25rem' }}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>
              </span>
            </label>
            {errors.terms && <span className="error-text">{errors.terms.message}</span>}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full"
            disabled={isLoading}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              marginTop: '1.5rem'
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                Creating account...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>
        
        <p className="text-center mt-6" style={{ color: 'var(--gray-600)' }}>
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;