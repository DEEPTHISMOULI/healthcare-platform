import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import DailyIframe from '@daily-co/daily-js';
import {
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ArrowLeft,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';

const PatientConsultation = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [appointment, setAppointment] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callFrame, setCallFrame] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [waitingForDoctor, setWaitingForDoctor] = useState(false);

  useEffect(() => {
    fetchAppointmentDetails();
    return () => {
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      // Get appointment
      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (aptError) throw aptError;
      setAppointment(apt);

      // Get doctor info
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id, user_id, specialisation')
        .eq('id', apt.doctor_id)
        .single();

      if (doctor) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', doctor.user_id)
          .single();
        
        setDoctorInfo({ ...doctor, ...profile });
      }

    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const joinCall = async () => {
    if (!appointment?.daily_room_url) {
      setWaitingForDoctor(true);
      toast.error('The doctor has not started the call yet. Please wait.');
      
      // Poll for room URL
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from('appointments')
          .select('daily_room_url')
          .eq('id', appointmentId)
          .single();
        
        if (data?.daily_room_url) {
          clearInterval(interval);
          setWaitingForDoctor(false);
          setAppointment(prev => ({ ...prev, daily_room_url: data.daily_room_url }));
          connectToCall(data.daily_room_url);
        }
      }, 5000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(interval), 300000);
      return;
    }

    connectToCall(appointment.daily_room_url);
  };

  const connectToCall = async (url) => {
    try {
      const frame = DailyIframe.createFrame(
        document.getElementById('video-container'),
        {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '12px'
          },
          showLeaveButton: false,
          showFullscreenButton: true
        }
      );

      frame.on('joined-meeting', () => {
        setIsInCall(true);
        toast.success('Connected to video call');
      });

      frame.on('left-meeting', () => {
        setIsInCall(false);
      });

      frame.on('error', (error) => {
        console.error('Daily error:', error);
        toast.error('Video call error');
      });

      await frame.join({ url });
      setCallFrame(frame);

    } catch (error) {
      console.error('Error joining call:', error);
      toast.error('Failed to join video call');
    }
  };

  const leaveCall = async () => {
    if (callFrame) {
      await callFrame.leave();
      callFrame.destroy();
      setCallFrame(null);
      setIsInCall(false);
      toast.success('You have left the call');
    }
  };

  const toggleVideo = () => {
    if (callFrame) {
      callFrame.setLocalVideo(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = () => {
    if (callFrame) {
      callFrame.setLocalAudio(!isAudioOn);
      setIsAudioOn(!isAudioOn);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <div className="spinner" style={{ width: '50px', height: '50px' }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      {/* Header */}
      <header style={{
        padding: '1rem 2rem',
        backgroundColor: '#1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/patient/appointments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#94a3b8',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div style={{ height: '24px', width: '1px', backgroundColor: '#334155' }}></div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Video Consultation</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            {formatDate(appointment?.scheduled_date)} at {formatTime(appointment?.scheduled_time)}
          </span>
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {/* Main Video Area */}
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          {/* Video Container */}
          <div 
            id="video-container"
            style={{
              flex: 1,
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {!isInCall && (
              <div style={{ textAlign: 'center' }}>
                {waitingForDoctor ? (
                  <>
                    <div className="spinner" style={{ width: '50px', height: '50px', margin: '0 auto 1rem' }}></div>
                    <p style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>
                      Waiting for the doctor to start the call...
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                      Please stay on this page. You'll be connected automatically.
                    </p>
                  </>
                ) : (
                  <>
                    <Video size={64} color="#475569" style={{ marginBottom: '1rem' }} />
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                      {appointment?.daily_room_url 
                        ? 'The doctor is ready. Click below to join.'
                        : 'Waiting for the doctor to start the consultation.'
                      }
                    </p>
                    <button
                      onClick={joinCall}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '1rem 2rem',
                        backgroundColor: appointment?.daily_room_url ? '#22c55e' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        margin: '0 auto'
                      }}
                    >
                      <Video size={20} />
                      {appointment?.daily_room_url ? 'Join Call' : 'Check if Doctor is Ready'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Call Controls */}
          {isInCall && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              padding: '1.5rem',
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              marginTop: '1rem'
            }}>
              <button
                onClick={toggleAudio}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: isAudioOn ? '#334155' : '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={isAudioOn ? 'Mute' : 'Unmute'}
              >
                {isAudioOn ? <Mic size={24} /> : <MicOff size={24} />}
              </button>

              <button
                onClick={toggleVideo}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: isVideoOn ? '#334155' : '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>

              <button
                onClick={leaveCall}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Leave call"
              >
                <PhoneOff size={24} />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Doctor Info */}
        <aside style={{
          width: '320px',
          backgroundColor: '#1e293b',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* Doctor Info */}
          <div style={{
            backgroundColor: '#334155',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Your Doctor
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 600
              }}>
                {doctorInfo?.full_name?.charAt(0) || 'D'}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                  Dr. {doctorInfo?.full_name || 'Doctor'}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  {doctorInfo?.specialisation || 'General Practice'}
                </p>
              </div>
            </div>
          </div>

          {/* Appointment Info */}
          <div style={{
            backgroundColor: '#334155',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Appointment Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={16} color="#94a3b8" />
                <span>{formatTime(appointment?.scheduled_time)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Video size={16} color="#94a3b8" />
                <span>{appointment?.type === 'video' ? 'Video Consultation' : 'Audio Consultation'}</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div style={{
            backgroundColor: '#1e3a5f',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid #3b82f6'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#60a5fa', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              Tips for your consultation
            </h3>
            <ul style={{ fontSize: '0.8rem', color: '#94a3b8', paddingLeft: '1rem', margin: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>Find a quiet, well-lit space</li>
              <li style={{ marginBottom: '0.5rem' }}>Test your camera and microphone</li>
              <li style={{ marginBottom: '0.5rem' }}>Have your questions ready</li>
              <li>Keep any relevant documents nearby</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PatientConsultation;