import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const payload = await req.json();
    const { record, table, type } = payload;

    // Database client with admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (table === 'post_comments' && type === 'INSERT') {
      const { post_id, user_id: commenter_id, content: commentContent } = record;

      // 1. Get the post author
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('user_id, title')
        .eq('id', post_id)
        .single();

      if (postError || !post) throw new Error("Post not found");
      
      // Don't notify if I'm commenting on my own post
      if (post.user_id === commenter_id) {
        return new Response(JSON.stringify({ message: "Self-comment, no push" }), { status: 200 });
      }

      // 2. Get author's push token
      const { data: author, error: authorError } = await supabase
        .from('profiles')
        .select('push_token, notification_settings')
        .eq('id', post.user_id)
        .single();

      if (authorError || !author?.push_token) {
          return new Response(JSON.stringify({ message: "No push token found for author" }), { status: 200 });
      }

      // 3. Check if they have notifications enabled (Optional check if we implement settings)
      // For now, let's just send it if they have a token.

      // 4. Send the push
      const message = {
        to: author.push_token,
        sound: 'default',
        title: '내 게시글에 새로운 댓글이 달렸습니다.',
        body: commentContent,
        data: { post_id: post_id, type: 'comment' },
      };

      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      const pushResult = await res.json();
      return new Response(JSON.stringify(pushResult), { status: 200 });
    }

    return new Response(JSON.stringify({ message: "Unsupported trigger" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
