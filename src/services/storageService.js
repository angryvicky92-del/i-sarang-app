import toast from 'react-hot-toast';
import { supabase } from './supabaseClient'

/**
 * 파일을 Supabase Storage에 업로드합니다.
 * @param {string} bucket 버킷 이름 (예: 'verifications')
 * @param {File} file 업로드할 파일 객체
 * @param {string} userId 사용자 ID (경로 구분용)
 */
export const uploadFile = async (bucket, file, userId) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return { url: data.publicUrl, error: null }
  } catch (error) {
    console.error('Error uploading file:', error)
    toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    return { url: null, error }
  }
}
