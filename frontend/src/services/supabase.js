import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions
export const authService = {
  // Sign up new user
  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // { full_name, role, phone }
      }
    });
    return { data, error };
  },

  // Sign in existing user
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Reset password
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  },

  // Update password
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  }
};

// Database helper functions
export const dbService = {
  // Get user profile
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Update user profile
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Get patient details
  async getPatient(userId) {
    const { data, error } = await supabase
      .from('patients')
      .select('*, profiles(*)')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  // Get doctor details
  async getDoctor(userId) {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, profiles(*)')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  // Get all doctors (for patient to book)
  async getAllDoctors() {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, profiles(full_name, email, phone, avatar_url)');
    return { data, error };
  },

  // Get appointments for a user
  async getAppointments(userId, role) {
    const column = role === 'patient' ? 'patient_id' : 'doctor_id';
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients(*, profiles(full_name, email)),
        doctors(*, profiles(full_name, email))
      `)
      .eq(column, userId)
      .order('scheduled_date', { ascending: true });
    return { data, error };
  },

  // Create new appointment
  async createAppointment(appointmentData) {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();
    return { data, error };
  },

  // Update appointment status
  async updateAppointment(appointmentId, updates) {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId)
      .select()
      .single();
    return { data, error };
  }
};

// Storage helper functions
export const storageService = {
  // Upload file
  async uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    return { data, error };
  },

  // Get file URL
  getFileUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  // Delete file
  async deleteFile(bucket, path) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    return { error };
  }
};

export default supabase;
