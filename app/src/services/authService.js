import { supabase } from './supabaseClient';

export const getPendingVerifications = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('verification_status', 'pending')
    .eq('user_type', '선생님');
  return { data, error };
};

export const processVerification = async (userId, status) => {
  // status: 'approved' or 'rejected'
  const isVerified = status === 'approved';
  const { data, error } = await supabase
    .from('profiles')
    .update({
      verification_status: status,
      is_verified: isVerified,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();

  return { data, error };
};

export const requestVerification = async (userId, imageUrl) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      verification_image: imageUrl,
      verification_status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();

  return { data, error };
};
