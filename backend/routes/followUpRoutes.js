const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/follow-ups/check-reminders
// Checks for follow-ups due within 24 hours and marks them for notification
router.get('/check-reminders', async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const todayDate = new Date().toISOString().split('T')[0];

    // Find scheduled follow-ups due today or tomorrow that haven't been reminded
    const { data: dueFollowUps, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('status', 'scheduled')
      .eq('reminder_sent', false)
      .lte('follow_up_date', tomorrowDate)
      .gte('follow_up_date', todayDate);

    if (error) throw error;

    if (!dueFollowUps || dueFollowUps.length === 0) {
      return res.json({ message: 'No reminders to send', count: 0 });
    }

    // Get patient and doctor info for each follow-up
    const reminders = [];
    for (const followUp of dueFollowUps) {
      // Get patient info
      const { data: patient } = await supabase
        .from('patients')
        .select('user_id')
        .eq('id', followUp.patient_id)
        .single();

      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', patient?.user_id)
        .single();

      // Get doctor info
      const { data: doctor } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('id', followUp.doctor_id)
        .single();

      const { data: doctorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', doctor?.user_id)
        .single();

      reminders.push({
        followUpId: followUp.id,
        patientName: patientProfile?.full_name || 'Patient',
        patientEmail: patientProfile?.email || '',
        doctorName: doctorProfile?.full_name || 'Doctor',
        followUpDate: followUp.follow_up_date,
        followUpTime: followUp.follow_up_time,
        reason: followUp.reason,
        priority: followUp.priority
      });

      // Mark reminder as sent
      await supabase
        .from('follow_ups')
        .update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString()
        })
        .eq('id', followUp.id);
    }

    // In production, you would send emails here using a service like SendGrid, SES, etc.
    // For now, just log the reminders
    console.log('Follow-up reminders to send:', reminders);

    res.json({
      message: `${reminders.length} reminder(s) processed`,
      count: reminders.length,
      reminders
    });

  } catch (error) {
    console.error('Reminder check error:', error);
    res.status(500).json({ error: 'Failed to check reminders', details: error.message });
  }
});

// GET /api/follow-ups/upcoming/:patientId
router.get('/upcoming/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const todayDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'scheduled')
      .gte('follow_up_date', todayDate)
      .order('follow_up_date', { ascending: true });

    if (error) throw error;
    res.json({ followUps: data || [] });

  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

module.exports = router;
