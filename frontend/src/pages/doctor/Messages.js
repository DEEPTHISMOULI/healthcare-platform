import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Search,
  User,
  Clock,
  CheckCheck,
  Check,
  Circle,
  Plus
} from 'lucide-react';

const DoctorMessages = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      if (user) {
        fetchInitialData(user.id);
      } else {
        // Fallback: get user from session directly
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          fetchInitialData(session.user.id);
        } else {
          setLoading(false);
        }
      }
    };
    init();
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
      // Poll for new messages every 5 seconds
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedConversation.id);
        fetchConversations(doctorId);
      }, 5000);
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitialData = async (userId) => {
    try {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!doctor) { setLoading(false); return; }
      setDoctorId(doctor.id);
      await fetchConversations(doctor.id);
      await fetchPatients(doctor.id);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async (docId) => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('doctor_id', docId)
      .order('last_message_at', { ascending: false });

    if (data) {
      // Fetch patient names
      const patientIds = data.map(c => c.patient_id);
      if (patientIds.length > 0) {
        const { data: patientsData } = await supabase
          .from('patients')
          .select('id, user_id')
          .in('id', patientIds);

        const userIds = patientsData?.map(p => p.user_id) || [];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const enriched = data.map(conv => {
          const patient = patientsData?.find(p => p.id === conv.patient_id);
          const profile = profiles?.find(pr => pr.id === patient?.user_id);
          return { ...conv, patient_name: profile?.full_name || 'Patient', patient_user_id: patient?.user_id };
        });
        setConversations(enriched);
      } else {
        setConversations(data);
      }
    }
  };

  const fetchPatients = async (docId) => {
    // Get patients who have appointments with this doctor
    const { data: appointments } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', docId);

    if (appointments) {
      const uniquePatientIds = [...new Set(appointments.map(a => a.patient_id))];
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, user_id')
        .in('id', uniquePatientIds);

      if (patientsData) {
        const userIds = patientsData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const enriched = patientsData.map(p => {
          const profile = profiles?.find(pr => pr.id === p.user_id);
          return { ...p, full_name: profile?.full_name || 'Patient', email: profile?.email || '' };
        });
        setPatients(enriched);
      }
    }
  };

  const fetchMessages = async (conversationId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const markAsRead = async (conversationId) => {
    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('sender_role', 'patient')
      .eq('is_read', false);

    // Reset unread count
    await supabase
      .from('conversations')
      .update({ doctor_unread_count: 0 })
      .eq('id', conversationId);
  };

  const startNewConversation = async (patient) => {
    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('patient_id', patient.id)
        .maybeSingle();

      if (existing) {
        const enriched = { ...existing, patient_name: patient.full_name, patient_user_id: patient.user_id };
        setSelectedConversation(enriched);
        setShowNewChat(false);
        return;
      }

      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          doctor_id: doctorId,
          patient_id: patient.id,
          last_message: '',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const enriched = { ...newConv, patient_name: patient.full_name, patient_user_id: patient.user_id };
      setConversations(prev => [enriched, ...prev]);
      setSelectedConversation(enriched);
      setShowNewChat(false);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    setSending(true);
    try {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_role: 'doctor',
          recipient_id: selectedConversation.patient_user_id || '',
          recipient_role: 'patient',
          content: newMessage.trim()
        });

      if (msgError) throw msgError;

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage.trim().substring(0, 100),
          last_message_at: new Date().toISOString(),
          patient_unread_count: (selectedConversation.patient_unread_count || 0) + 1
        })
        .eq('id', selectedConversation.id);

      setNewMessage('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations(doctorId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatMessageTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (date) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const shouldShowDateSeparator = (msg, idx) => {
    if (idx === 0) return true;
    const prev = new Date(messages[idx - 1].created_at).toDateString();
    const curr = new Date(msg.created_at).toDateString();
    return prev !== curr;
  };

  // Styles
  const containerStyle = { display: 'flex', height: '100vh', backgroundColor: '#f8fafc' };
  const sidebarStyle = { width: '340px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' };
  const chatAreaStyle = { flex: 1, display: 'flex', flexDirection: 'column' };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b' }}>Loading messages...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={containerStyle}>
      {/* Sidebar - Conversations */}
      <div style={sidebarStyle}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/doctor/dashboard" style={{ color: '#64748b', display: 'flex' }}><ArrowLeft size={20} /></Link>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Messages</h2>
            </div>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                backgroundColor: '#2563eb', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* New chat patient search */}
          {showNewChat && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem',
                    outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
              {searchTerm && (
                <div style={{ maxHeight: '200px', overflow: 'auto', marginTop: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  {filteredPatients.map(p => (
                    <div
                      key={p.id}
                      onClick={() => startNewConversation(p)}
                      style={{
                        padding: '0.625rem 0.75rem', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e0e7ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#4f46e5', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0
                      }}>
                        {p.full_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.85rem' }}>{p.full_name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.email}</p>
                      </div>
                    </div>
                  ))}
                  {filteredPatients.length === 0 && (
                    <p style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>No patients found</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <MessageSquare size={40} style={{ color: '#cbd5e1', margin: '0 auto 0.5rem' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No conversations yet</p>
              <p style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Click + to start messaging a patient</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  padding: '0.875rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '0.75rem', borderBottom: '1px solid #f1f5f9',
                  backgroundColor: selectedConversation?.id === conv.id ? '#eff6ff' : 'white',
                  borderLeft: selectedConversation?.id === conv.id ? '3px solid #2563eb' : '3px solid transparent',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => { if (selectedConversation?.id !== conv.id) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={(e) => { if (selectedConversation?.id !== conv.id) e.currentTarget.style.backgroundColor = 'white'; }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#e0e7ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#4f46e5', fontWeight: 600, flexShrink: 0
                  }}>
                    {conv.patient_name?.charAt(0) || 'P'}
                  </div>
                  {conv.doctor_unread_count > 0 && (
                    <div style={{
                      position: 'absolute', top: '-2px', right: '-2px', width: '18px', height: '18px',
                      borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem',
                      fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {conv.doctor_unread_count}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontWeight: conv.doctor_unread_count > 0 ? 700 : 500, color: '#1e293b', fontSize: '0.9rem' }}>
                      {conv.patient_name}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.8rem', color: conv.doctor_unread_count > 0 ? '#1e293b' : '#94a3b8',
                    fontWeight: conv.doctor_unread_count > 0 ? 500 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {conv.last_message || 'No messages yet'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={chatAreaStyle}>
        {!selectedConversation ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <MessageSquare size={64} style={{ color: '#e2e8f0', margin: '0 auto 1rem' }} />
              <h3 style={{ color: '#94a3b8', fontWeight: 500, marginBottom: '0.5rem' }}>Select a conversation</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Choose a patient from the sidebar or start a new chat</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '0.875rem 1.5rem', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e0e7ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4f46e5', fontWeight: 600
              }}>
                {selectedConversation.patient_name?.charAt(0) || 'P'}
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b' }}>{selectedConversation.patient_name}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Patient</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem', backgroundColor: '#f8fafc' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#94a3b8' }}>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <React.Fragment key={msg.id}>
                    {shouldShowDateSeparator(msg, idx) && (
                      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                        <span style={{
                          backgroundColor: '#e2e8f0', padding: '0.25rem 0.75rem', borderRadius: '999px',
                          fontSize: '0.75rem', color: '#64748b'
                        }}>
                          {formatDateSeparator(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex', justifyContent: msg.sender_role === 'doctor' ? 'flex-end' : 'flex-start',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{
                        maxWidth: '70%', padding: '0.625rem 1rem', borderRadius: '12px',
                        backgroundColor: msg.sender_role === 'doctor' ? '#2563eb' : 'white',
                        color: msg.sender_role === 'doctor' ? 'white' : '#1e293b',
                        boxShadow: msg.sender_role === 'patient' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                        borderBottomRightRadius: msg.sender_role === 'doctor' ? '4px' : '12px',
                        borderBottomLeftRadius: msg.sender_role === 'patient' ? '4px' : '12px'
                      }}>
                        <p style={{ fontSize: '0.875rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                          gap: '0.25rem', marginTop: '0.25rem'
                        }}>
                          <span style={{
                            fontSize: '0.65rem',
                            color: msg.sender_role === 'doctor' ? 'rgba(255,255,255,0.7)' : '#94a3b8'
                          }}>
                            {formatMessageTime(msg.created_at)}
                          </span>
                          {msg.sender_role === 'doctor' && (
                            msg.is_read ?
                              <CheckCheck size={12} style={{ color: 'rgba(255,255,255,0.7)' }} /> :
                              <Check size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{
              padding: '1rem 1.5rem', backgroundColor: 'white', borderTop: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'flex-end', gap: '0.75rem'
            }}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
                style={{
                  flex: 1, padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '12px',
                  fontSize: '0.875rem', outline: 'none', resize: 'none', fontFamily: 'inherit',
                  maxHeight: '120px', minHeight: '44px', lineHeight: 1.5
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                  backgroundColor: newMessage.trim() ? '#2563eb' : '#e2e8f0',
                  color: newMessage.trim() ? 'white' : '#94a3b8',
                  cursor: newMessage.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorMessages;