import { useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi, Post } from '@/api/community-api';

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postData: Partial<Post>) => communityApi.createPost(postData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, postData }: { postId: string; postData: Partial<Post> }) => 
      communityApi.updatePost(postId, postData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
