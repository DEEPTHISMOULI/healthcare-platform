import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import DailyIframe from '@daily-co/daily-js';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  FileText,
  ArrowLeft,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';

const DoctorConsultation = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [appointment, setAppointment] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callFrame, setCallFrame] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [roomUrl, setRoomUrl] = useState(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

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

      // Get patient info
      const { data: patient } = await supabase
        .from('patients')
        .select('id, user_id')
        .eq('id', apt.patient_id)
        .single();

      if (patient) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', patient.user_id)
          .single();
        
        setPatientInfo(profile);
      }

      // Check if room URL exists
      if (apt.daily_room_url) {
        setRoomUrl(apt.daily_room_url);
      }

    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const createDailyRoom = async () => {
    try {
      const roomName = `consultation-${appointmentId.slice(0, 8)}-${Date.now()}`;
      
      const response = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_DAILY_API_KEY}`
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const room = await response.json();
      
      // Save room URL to appointment
      await supabase
        .from('appointments')
        .update({ daily_room_url: room.url })
        .eq('id', appointmentId);

      setRoomUrl(room.url);
      return room.url;
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create video room');
      return null;
    }
  };

  const startCall = async () => {
    try {
      let url = roomUrl;
      
      if (!url) {
        url = await createDailyRoom();
        if (!url) return;
      }

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

      // Update appointment status
      await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', appointmentId);

    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start video call');
    }
  };

  const endCall = async () => {
    if (callFrame) {
      await callFrame.leave();
      callFrame.destroy();
      setCallFrame(null);
      setIsInCall(false);

      // Update appointment status
      await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      toast.success('Consultation ended');
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

  const saveNotes = async () => {
    try {
      await supabase
        .from('appointments')
        .update({ doctor_notes: notes })
        .eq('id', appointmentId);
      
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
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
            onClick={() => navigate('/doctor/dashboard')}
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
                <Video size={64} color="#475569" style={{ marginBottom: '1rem' }} />
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                  Click "Start Call" to begin the consultation
                </p>
                <button
                  onClick={startCall}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem 2rem',
                    backgroundColor: '#22c55e',
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
                  Start Call
                </button>
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
                onClick={endCall}
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
                title="End call"
              >
                <PhoneOff size={24} />
              </button>

              <button
                onClick={() => setShowNotes(!showNotes)}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: showNotes ? '#3b82f6' : '#334155',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Notes"
              >
                <FileText size={24} />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Patient Info & Notes */}
        <aside style={{
          width: '320px',
          backgroundColor: '#1e293b',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* Patient Info */}
          <div style={{
            backgroundColor: '#334155',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Patient Information
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 600
              }}>
                {patientInfo?.full_name?.charAt(0) || 'P'}
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{patientInfo?.full_name || 'Patient'}</p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{patientInfo?.email}</p>
              </div>
            </div>
            {patientInfo?.phone && (
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                📞 {patientInfo.phone}
              </p>
            )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Type</span>
                <span>{appointment?.type === 'video' ? '📹 Video' : '📞 Audio'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Status</span>
                <span style={{ 
                  color: appointment?.status === 'in_progress' ? '#22c55e' : '#f59e0b'
                }}>
                  {appointment?.status === 'in_progress' ? 'In Progress' : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div style={{
            flex: 1,
            backgroundColor: '#334155',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Consultation Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this consultation..."
              style={{
                flex: 1,
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                padding: '1rem',
                color: 'white',
                fontSize: '0.875rem',
                resize: 'none',
                minHeight: '150px'
              }}
            />
            <button
              onClick={saveNotes}
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Save Notes
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DoctorConsultation;