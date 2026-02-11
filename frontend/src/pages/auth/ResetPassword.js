import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const handlePasswordRecovery = async () => {
      try {
        // Give Supabase time to process the hash
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session) {
            setIsValidLink(true);
          } else {
            // Check if URL has recovery token
            const hash = window.location.hash;
            if (!hash || !hash.includes('type=recovery')) {
              setIsValidLink(false);
            }
          }
          setCheckingSession(false);
        }
      } catch (err) {
        console.error('Session check error:', err);
        if (mounted) {
          setIsValidLink(false);
          setCheckingSession(false);
        }
      }
    };

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        if (event === 'PASSWORD_RECOVERY' && mounted) {
          setIsValidLink(true);
          setCheckingSession(false);
        }
      }
    );

    handlePasswordRecovery();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error(error.message || 'Failed to reset password');
        return;
      }

      setIsSuccess(true);
      toast.success('Password updated successfully!');
      
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Reset password error:', err);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center">
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--gray-600)' }}>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValidLink) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center">
          <AlertCircle size={64} style={{ color: 'var(--error)', margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Invalid or Expired Link
          </h1>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/forgot-password')}>
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center">
          <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Password Reset Successful!
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
            Set New Password
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                className="form-input"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;