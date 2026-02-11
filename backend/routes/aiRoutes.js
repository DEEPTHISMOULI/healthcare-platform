const express = require('express');
const router = express.Router();

// Mock AI Summary Generator - produces realistic clinical summaries
// Replace with real Claude API later by uncommenting the section at the bottom
const generateMockSummary = (data) => {
  const {
    doctorNotes,
    patientName,
    patientAge,
    patientGender,
    chiefComplaint,
    currentSymptoms,
    currentMedications,
    allergies,
    medicalHistory,
    consultationType
  } = data;

  const notes = doctorNotes.toLowerCase();
  
  // Detect conditions from notes
  const conditions = {
    headache: notes.includes('headache') || notes.includes('head pain') || notes.includes('migraine'),
    bp: notes.includes('bp') || notes.includes('blood pressure') || notes.includes('hypertension'),
    diabetes: notes.includes('diabetes') || notes.includes('blood sugar') || notes.includes('glucose'),
    respiratory: notes.includes('cough') || notes.includes('breathing') || notes.includes('asthma') || notes.includes('wheez'),
    skin: notes.includes('rash') || notes.includes('skin') || notes.includes('eczema'),
    mental: notes.includes('anxiety') || notes.includes('depression') || notes.includes('stress') || notes.includes('sleep'),
    gastro: notes.includes('stomach') || notes.includes('nausea') || notes.includes('bowel') || notes.includes('abdomen'),
    musculo: notes.includes('pain') || notes.includes('back') || notes.includes('joint') || notes.includes('muscle'),
    infection: notes.includes('infection') || notes.includes('fever') || notes.includes('temperature') || notes.includes('antibiotic')
  };

  let diagnosis = 'Clinical assessment based on presenting symptoms';
  let symptoms = chiefComplaint || 'As described in consultation';
  let examination = 'General examination conducted via ' + (consultationType || 'video') + ' consultation.';
  let treatment = 'Treatment plan discussed with patient.';
  let medications = currentMedications || 'As prescribed';
  let lifestyle = 'General health and wellbeing advice provided.';
  let education = 'Patient informed about their condition and management plan.';
  let followUp = true;
  let followUpNotes = 'Review in 2 weeks to assess progress.';
  let referralRequired = false;
  let referralSpecialty = '';
  let referralNotes = '';
  let redFlags = '';
  let additional = '';

  if (conditions.headache) {
    diagnosis = 'Tension-type headache / Cephalgia under investigation';
    symptoms = (currentSymptoms || '') + ' Patient reports headaches as described. Duration and pattern noted.';
    examination += ' Neurological assessment: no focal deficits observed. Cranial nerves grossly intact.';
    treatment = '1. Analgesic therapy as prescribed\n2. Headache diary to track frequency, triggers, and severity\n3. Lifestyle modifications including stress management and adequate hydration';
    medications = 'Paracetamol 1g QDS PRN (max 4g/24hrs). Consider Ibuprofen 400mg TDS with food if paracetamol insufficient.';
    lifestyle = 'Maintain regular sleep schedule (7-8 hours). Stay well hydrated (2L water daily). Regular breaks from screen work. Consider relaxation techniques.';
    education = 'Headaches can have multiple triggers including stress, dehydration, poor posture, and eye strain. Keeping a headache diary will help identify patterns.';
    followUpNotes = 'Review in 2 weeks with headache diary. If headaches worsen or are accompanied by visual changes, seek urgent attention.';
    redFlags = 'Seek immediate attention if: sudden severe headache, headache with fever and neck stiffness, visual disturbances, weakness or numbness, confusion.';
    if (notes.includes('refer') || notes.includes('neuro')) {
      referralRequired = true;
      referralSpecialty = 'Neurology';
      referralNotes = 'For specialist assessment if symptoms persist despite initial management.';
    }
  }

  if (conditions.bp) {
    diagnosis = 'Hypertension - ' + (notes.includes('140') || notes.includes('high') ? 'Stage 1' : 'Under review');
    symptoms += ' Elevated blood pressure readings noted.';
    examination += ' Blood pressure measured and recorded.';
    treatment = '1. Lifestyle modifications as first-line\n2. Home BP diary\n3. Consider pharmacological intervention if insufficient after 3 months';
    medications += '\nConsider Amlodipine 5mg OD or Ramipril 2.5mg OD if BP remains elevated.';
    lifestyle = 'Reduce sodium (<6g/day). Regular exercise (150 mins/week). Maintain healthy BMI. Limit alcohol. DASH diet recommended.';
    education = 'High blood pressure usually has no symptoms but increases risk of heart disease and stroke. Regular monitoring is essential.';
    followUpNotes = 'Review in 2-4 weeks with home BP diary. Fasting bloods if not done recently.';
    redFlags = 'Seek urgent attention if: severe headache with BP >180/120, chest pain, visual disturbance, breathlessness.';
  }

  if (conditions.respiratory) {
    diagnosis = 'Respiratory symptoms - possible ' + (notes.includes('asthma') ? 'asthma exacerbation' : 'respiratory tract condition');
    symptoms += ' Respiratory symptoms including cough and/or breathing difficulty.';
    examination += ' Respiratory assessment conducted. Auscultation findings noted.';
    treatment = '1. Bronchodilator therapy if indicated\n2. Monitor symptoms and peak flow\n3. Smoking cessation if applicable';
    medications = notes.includes('inhaler') ? 'Salbutamol inhaler 100mcg 2 puffs PRN via spacer.' : 'Respiratory medication as discussed.';
    lifestyle = 'Avoid known triggers. Good ventilation. Annual flu vaccination. Smoking cessation if applicable.';
    redFlags = 'Seek emergency care if: severe breathlessness, unable to complete sentences, blue lips, chest pain, or peak flow <50%.';
  }

  if (conditions.mental) {
    diagnosis = notes.includes('anxiety') ? 'Generalised Anxiety Disorder (assessment)' : 'Low mood / Depression screen';
    symptoms += ' Psychological symptoms affecting daily functioning.';
    examination += ' Mental state examination conducted. Appearance and behaviour appropriate.';
    treatment = '1. Consider CBT referral via IAPT\n2. Self-help resources provided\n3. Medication review if symptoms persist';
    medications = notes.includes('sertraline') ? 'Sertraline 50mg OD. Review in 2 weeks.' : 'Non-pharmacological approaches first line.';
    lifestyle = 'Regular physical activity. Maintain social connections. Limit alcohol/caffeine. Sleep hygiene. Mindfulness techniques.';
    education = 'Mental health conditions are common and treatable. NHS IAPT services available for talking therapies.';
    followUpNotes = 'Review in 2 weeks to assess mood. PHQ-9/GAD-7 to be repeated.';
    redFlags = 'If experiencing thoughts of self-harm, contact NHS 111, Samaritans (116 123), or attend A&E.';
    referralRequired = true;
    referralSpecialty = 'IAPT / Psychological Services';
    referralNotes = 'For CBT or counselling as appropriate.';
  }

  if (conditions.infection) {
    diagnosis = 'Infection - likely ' + (notes.includes('uti') ? 'urinary tract infection' : notes.includes('throat') ? 'pharyngitis' : 'infection under assessment');
    symptoms += ' Signs of infection as described.';
    examination += ' Temperature noted. Relevant examination conducted.';
    treatment = '1. Antibiotic therapy if bacterial\n2. Adequate hydration and rest\n3. Symptomatic relief';
    medications = 'Antibiotic as prescribed - complete full course. Paracetamol for fever/pain.';
    followUpNotes = 'Review if not improving within 48-72 hours, or sooner if deteriorating.';
    redFlags = 'Seek urgent attention if: fever >39°C not responding to paracetamol, rash, confusion, severe pain.';
  }

  if (conditions.gastro) {
    diagnosis = 'Gastrointestinal symptoms under investigation';
    symptoms += ' GI symptoms as described.';
    examination += ' Abdominal assessment conducted.';
    treatment = '1. Dietary modifications\n2. Symptomatic relief\n3. Further investigation if persistent';
    medications = 'Antacid/PPI as appropriate. Anti-emetic if nausea persists.';
    lifestyle = 'Regular balanced meals. Avoid trigger foods. Adequate hydration. Stress management.';
    redFlags = 'Seek urgent attention if: severe abdominal pain, vomiting blood, black tarry stools, persistent vomiting.';
  }

  if (conditions.musculo) {
    diagnosis = 'Musculoskeletal ' + (notes.includes('back') ? 'back pain' : notes.includes('joint') ? 'joint pain' : 'pain') + ' - mechanical/non-specific';
    symptoms += ' Pain as described. Onset, character, and aggravating factors noted.';
    examination += ' Musculoskeletal assessment conducted. Range of movement noted.';
    treatment = '1. Analgesia as prescribed\n2. Physiotherapy referral if appropriate\n3. Activity modification advice';
    medications = 'Paracetamol 1g QDS. Ibuprofen 400mg TDS with food. Consider topical NSAIDs.';
    lifestyle = 'Stay active within comfort limits. Gentle stretching and exercises. Good posture. Ergonomic workplace setup.';
    redFlags = 'Seek urgent attention if: loss of bladder/bowel control, progressive weakness, unexplained weight loss, night pain.';
  }

  // Fallback if no specific condition detected
  if (!Object.values(conditions).some(v => v)) {
    diagnosis = 'Clinical assessment - ' + (chiefComplaint || 'symptoms as described');
    symptoms = currentSymptoms || doctorNotes.substring(0, 200);
    treatment = 'Management plan as discussed. ' + doctorNotes.substring(0, 300);
    followUpNotes = 'Review as clinically indicated.';
    redFlags = 'Return or seek urgent care if symptoms worsen or new concerning symptoms develop.';
  }

  additional = `Summary generated from ${consultationType || 'video'} consultation. ${allergies && allergies !== 'None reported' ? 'Known allergies: ' + allergies + '.' : 'NKDA.'}`;

  return {
    diagnosis,
    symptoms_presented: symptoms.trim(),
    examination_findings: examination.trim(),
    treatment_plan: treatment.trim(),
    medications_prescribed: medications.trim(),
    lifestyle_recommendations: lifestyle.trim(),
    patient_education: education.trim(),
    follow_up_required: followUp,
    follow_up_notes: followUpNotes,
    follow_up_timeframe: '2 weeks',
    referral_required: referralRequired,
    referral_specialty: referralSpecialty,
    referral_notes: referralNotes,
    red_flags: redFlags,
    additional_notes: additional.trim()
  };
};

router.post('/generate-summary', async (req, res) => {
  try {
    const { doctorNotes } = req.body;

    if (!doctorNotes) {
      return res.status(400).json({ error: 'Doctor notes are required' });
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    const summary = generateMockSummary(req.body);
    res.json({ summary });

    // --- REAL CLAUDE API (uncomment when you have an API key) ---
    /*
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    const summary = JSON.parse(message.content[0].text);
    res.json({ summary });
    */

  } catch (error) {
    console.error('AI Summary Error:', error);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

module.exports = router;