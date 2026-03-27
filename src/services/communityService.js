import { supabase } from './supabaseClient'

export const uploadImage = async (file) => {
  if (!file) return null

  // Ensure unique file name
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `posts/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('community_images')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Error uploading image:', uploadError)
    throw uploadError
  }

  // Get public URL
  const { data } = supabase.storage
    .from('community_images')
    .getPublicUrl(filePath)

  return data.publicUrl
}

export const getPosts = async (category = '학부모') => {
  let query = supabase
    .from('posts')
    .select('*, profiles(is_verified)')
    .eq('category_type', category)
    .order('created_at', { ascending: false })

  const { data, error } = await query
  
  if (error) {
    // 조인 에러(관계 미설정 PGRST200 또는 잘못된 요청 400) 시 일반 쿼리로 폴백
    if (error.code === 'PGRST200' || error.status === 400) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('posts')
        .select('*')
        .eq('category_type', category)
        .order('created_at', { ascending: false })
      
      if (fallbackError) return []
      return fallbackData
    }
    console.error('Error fetching posts:', error)
    return []
  }
  return data
}

export const createPost = async (post) => {
  const { data, error } = await supabase
    .from('posts')
    .insert([post]) // post 객체에 category_type이 포함되어 전달됨
    .select()
    
  if (error) {
    console.error('Error creating post:', error)
    return null
  }
  return data[0]
}

export const deletePost = async (id) => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting post:', error)
    return false
  }
  return true
}

export const updatePost = async (id, post) => {
  const { data, error } = await supabase
    .from('posts')
    .update(post)
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error updating post:', error)
    return null
  }
  return data[0]
}

export const getPostDetail = async (id) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(is_verified)')
    .eq('id', id)
    .single()
    
  if (error) {
    if (error.code === 'PGRST200' || error.status === 400) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()
      if (fallbackError) return null
      return fallbackData
    }
    console.error('Error fetching post detail:', error)
    return null
  }
  return data
}

export const likePost = async (id, currentLikes) => {
  const { data, error } = await supabase
    .from('posts')
    .update({ likes: (currentLikes || 0) + 1 })
    .eq('id', id)
    .select()
    
  if (error) {
    console.error('Error liking post:', error)
    return null
  }
  return data[0]
}

export const getComments = async (postId) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(is_verified)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    
  if (error) {
    if (error.code === 'PGRST200' || error.status === 400) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (fallbackError) return []
      return fallbackData
    }
    console.error('Error fetching comments:', error)
    return []
  }
  return data
}

export const createComment = async (comment) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([comment])
    .select()
    
  if (error) {
    console.error('Error creating comment:', error)
    return null
  }
  return data[0]
}

export const updateComment = async (id, content) => {
  const { data, error } = await supabase
    .from('comments')
    .update({ content })
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error updating comment:', error)
    return null
  }
  return data[0]
}

export const deleteComment = async (id) => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting comment:', error)
    return false
  }
  return true
}

export const getPopularPosts = async (userType = '학부모') => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(is_verified)')
    .eq('category_type', userType)
    .order('likes', { ascending: false })
    .limit(5)
  
  if (error) {
    if (error.code === 'PGRST200') {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('posts')
        .select('*')
        .eq('category_type', userType)
        .order('likes', { ascending: false })
        .limit(5)
      if (fallbackError) return []
      return fallbackData
    }
    console.error('Error fetching popular posts:', error)
    return []
  }
  return data
}

export const incrementViewCount = async (id) => {
  const { data: current } = await supabase
    .from('posts')
    .select('views')
    .eq('id', id)
    .single()
  
  const { data, error } = await supabase
    .from('posts')
    .update({ views: (current?.views || 0) + 1 })
    .eq('id', id)
    .select()
    
  if (error) {
    console.error('Error incrementing view count:', error)
    return null
  }
  return data[0]
}
