import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Eye } from 'lucide-react-native';
import EngagementButtons from '@/components/EngagementButtons';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

interface PostMainContentProps {
  post: any;
  imageAspectRatios: Record<string, number>;
  onNicknameClick: (id: string, nickname: string, type: any) => void;
  userPostVote: number;
  onVoteUpdate: (updated: any) => void;
  userId?: string;
  colors: any;
}

export const PostMainContent: React.FC<PostMainContentProps> = ({ 
  post, 
  imageAspectRatios, 
  onNicknameClick, 
  userPostVote, 
  onVoteUpdate, 
  userId, 
  colors 
}) => {
  const [webViewHeight, setWebViewHeight] = React.useState(200);

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: ${colors.textSecondary};
            padding: 0;
            margin: 0;
            background-color: transparent;
          }
          p { margin: 0 0 16px 0; }
          b, strong { font-weight: 800; color: ${colors.text}; }
          img { max-width: 100%; height: auto; border-radius: 12px; margin: 12px 0; }
        </style>
      </head>
      <body>
        <div id="content">${post.content}</div>
        <script>
          function sendHeight() {
            window.ReactNativeWebView.postMessage(document.getElementById('content').scrollHeight);
          }
          window.onload = sendHeight;
          // Recalculate if content changes (e.g. images load)
          const observer = new ResizeObserver(sendHeight);
          observer.observe(document.getElementById('content'));
        </script>
      </body>
    </html>
  `;

  return (
    <VerticalBox paddingHorizontal={20} style={{ paddingTop: 20 }}>
      <VerticalBox>
        <HorizontalBox style={styles.metaInfo} gap={8} flexWrap="wrap">
          {post.profiles?.user_type === '관리자' ? (
            <VerticalBox style={[styles.adminChip, { backgroundColor: colors.primary }]}>
              <Text style={styles.chipText}>관리자</Text>
            </VerticalBox>
          ) : post.type && (
            <VerticalBox style={[styles.typeChip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.typeChipText, { color: colors.primary }]}>{post.type}</Text>
            </VerticalBox>
          )}
          <TouchableOpacity 
            onPress={() => onNicknameClick(post.user_id, post.author, post.type)} 
            style={styles.authorInfo}
          >
            <Text style={[styles.authorName, { color: colors.text }]}>{post.author}</Text>
          </TouchableOpacity>
          <Text style={[styles.metaTime, { color: colors.textMuted }]}>
            • {new Date(post.created_at).toLocaleDateString()}
          </Text>
          <HorizontalBox style={styles.viewCount} gap={2}>
            <Eye size={12} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {post.views || 0}
            </Text>
          </HorizontalBox>
        </HorizontalBox>

        <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
        
        {(post.image_urls || (post.image_url ? [post.image_url] : [])).map((url: string, idx: number) => (
          <Image 
            key={idx}
            source={{ uri: url }} 
            style={[
              styles.postImage, 
              { 
                aspectRatio: imageAspectRatios[url] || 1.5, 
                backgroundColor: colors.cardSecondary 
              }
            ]} 
            resizeMode="cover" 
          />
        ))}

        <View style={{ height: webViewHeight, marginBottom: 40 }}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlTemplate }}
            scrollEnabled={false}
            onMessage={(event) => {
              const height = parseInt(event.nativeEvent.data);
              if (height > 0) setWebViewHeight(height + 20);
            }}
            style={{ backgroundColor: 'transparent' }}
          />
        </View>
      </VerticalBox>
      
      <HorizontalBox 
        style={[styles.interactionArea, { borderTopColor: colors.border }]}
        paddingVertical={20}
      >
        <EngagementButtons 
          targetType="post" 
          targetId={post.id} 
          item={post} 
          userVote={userPostVote} 
          userId={userId}
          onUpdate={onVoteUpdate}
        />
      </HorizontalBox>
    </VerticalBox>
  );
};

const styles = StyleSheet.create({
  metaInfo: { marginBottom: 20 },
  adminChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  typeChipText: { fontSize: 11, fontWeight: '800' },
  authorInfo: { marginRight: 6 },
  authorName: { fontSize: 14, fontWeight: '700' },
  metaTime: { fontSize: 12 },
  viewCount: { alignItems: 'center' },
  postTitle: { fontSize: 24, fontWeight: '800', marginBottom: 24, lineHeight: 32, letterSpacing: -0.8 },
  postImage: { width: '100%', borderRadius: 16, marginBottom: 12 },
  interactionArea: { borderTopWidth: 0.5, marginBottom: 40 }
});
