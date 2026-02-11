import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Clock, 
  Save
} from 'lucide-react';

const DoctorSchedule = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  const [schedule, setSchedule] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' }
  });

  const [slotDuration, setSlotDuration] = useState(30);
  const [breakTime, setBreakTime] = useState({ start: '13:00', end: '14:00' });

  useEffect(() => {
    if (user) {
      fetchDoctorData();
    }
  }, [user]);

  const fetchDoctorData = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Load existing schedule if available
      if (data && data.available_days) {
        const savedSchedule = { ...schedule };
        days.forEach(day => {
          if (data.available_days && typeof data.available_days[day] !== 'undefined') {
            savedSchedule[day] = {
              ...savedSchedule[day],
              enabled: data.available_days[day]
            };
          }
        });
        
        // Load hours if available
        if (data.available_hours) {
          days.forEach(day => {
            savedSchedule[day] = {
              ...savedSchedule[day],
              start: data.available_hours.start || '09:00',
              end: data.available_hours.end || '17:00'
            };
          });
        }
        
        setSchedule(savedSchedule);
      }
    } catch (err) {
      console.error('Error fetching doctor data:', err);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
  };

  const handleTimeChange = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const available_days = {};
      days.forEach(day => {
        available_days[day] = schedule[day].enabled;
      });

      const enabledDays = days.filter(day => schedule[day].enabled);
      const available_hours = enabledDays.length > 0 ? {
        start: schedule[enabledDays[0]].start,
        end: schedule[enabledDays[0]].end
      } : { start: '09:00', end: '17:00' };

      const { error } = await supabase
        .from('doctors')
        .update({
          available_days,
          available_hours
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Schedule saved successfully!');
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const timeOptions = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

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
          <Link
            to="/doctor/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#64748b',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : <><Save size={18} /> Save Schedule</>}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
            Manage Your Schedule
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            Set your available days and working hours for patient appointments
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Weekly Schedule */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.5rem' }}>
              Weekly Availability
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {days.map(day => (
                <div
                  key={day}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: schedule[day].enabled ? '#f0fdf4' : '#f8fafc',
                    borderRadius: '0.75rem',
                    border: `1px solid ${schedule[day].enabled ? '#bbf7d0' : '#e2e8f0'}`
                  }}
                >
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flex: '0 0 150px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={schedule[day].enabled}
                      onChange={() => handleDayToggle(day)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{
                      fontWeight: 500,
                      color: schedule[day].enabled ? '#1e293b' : '#94a3b8'
                    }}>
                      {dayLabels[day]}
                    </span>
                  </label>

                  {schedule[day].enabled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
                      <Clock size={16} color="#64748b" />
                      <select
                        value={schedule[day].start}
                        onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #e2e8f0',
                          backgroundColor: 'white'
                        }}
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <span style={{ color: '#64748b' }}>to</span>
                      <select
                        value={schedule[day].end}
                        onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #e2e8f0',
                          backgroundColor: 'white'
                        }}
                      >
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!schedule[day].enabled && (
                    <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '0.875rem' }}>
                      Not available
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                Appointment Duration
              </h3>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white'
                }}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                Duration of each appointment slot
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                Break Time
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select
                  value={breakTime.start}
                  onChange={(e) => setBreakTime(prev => ({ ...prev, start: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white'
                  }}
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                <span style={{ color: '#64748b' }}>to</span>
                <select
                  value={breakTime.end}
                  onChange={(e) => setBreakTime(prev => ({ ...prev, end: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white'
                  }}
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                No appointments during this time
              </p>
            </div>

            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid #bae6fd'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.75rem' }}>
                Schedule Summary
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#0c4a6e' }}>
                Available on <strong>{days.filter(d => schedule[d].enabled).length} days</strong> per week
              </p>
              <p style={{ fontSize: '0.875rem', color: '#0c4a6e', marginTop: '0.5rem' }}>
                Days: {days.filter(d => schedule[d].enabled).map(d => dayLabels[d].slice(0, 3)).join(', ') || 'None'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorSchedule;