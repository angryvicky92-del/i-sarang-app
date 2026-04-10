import { supabase } from '../services/supabaseClient';

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  user_id: string;
  created_at: string;
  views: number;
  image_url?: string;
  image_urls?: string[];
  type?: string;
  is_notice?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_nickname: string;
  content: string;
  created_at: string;
}

class CommunityApi {
  async getPost(postId: string): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();
    if (error) throw error;
    return data;
  }

  async getComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  async createPost(postData: Partial<Post>): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .insert([postData]);
    if (error) throw error;
  }

  async updatePost(postId: string, postData: Partial<Post>): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .update(postData)
      .eq('id', postId);
    if (error) throw error;
  }

  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    if (error) throw error;
  }

  async createComment(commentData: Partial<Comment>): Promise<void> {
    const { error } = await supabase
      .from('post_comments')
      .insert([commentData]);
    if (error) throw error;
  }

  async updateComment(commentId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('post_comments')
      .update({ content })
      .eq('id', commentId);
    if (error) throw error;
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);
    if (error) throw error;
  }

  async incrementViewCount(postId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_post_view', { post_id: postId });
    
    // Fallback if RPC is not available
    if (error) {
      const { data: currentPost, error: fetchError } = await supabase
        .from('posts')
        .select('views')
        .eq('id', postId)
        .single();
      
      if (!fetchError && currentPost) {
        await supabase
          .from('posts')
          .update({ views: (currentPost.views || 0) + 1 })
          .eq('id', postId);
      }
    }
  }
}

export const communityApi = new CommunityApi();
