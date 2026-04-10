import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $generateHtmlFromNodes } from '@lexical/html';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import theme from './LexicalTheme';

const Placeholder = ({ text }) => (
  <div className="absolute top-[72px] left-4 text-slate-400 pointer-events-none select-none text-base italic">
    {text || '따뜻한 이야기를 남겨주세요...'}
  </div>
);

import { $generateNodesFromHtml } from '@lexical/html';
import { $getRoot, $getSelection } from 'lexical';

export default function LexicalEditor({ onChange, initialHtml }) {
  const initialConfig = {
    namespace: 'CommunityEditor',
    theme,
    onError: (error) => {
      console.error('Lexical Error:', error);
    },
    // Add logic to handle initial HTML
    editorState: (editor) => {
      if (initialHtml) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialHtml, 'text/html');
        const nodes = $generateNodesFromHtml(editor, dom);
        $getRoot().append(...nodes);
      }
    }
  };

  const handleChange = (editorState, editor) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editor);
      if (onChange) {
        onChange(html);
      }
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative flex flex-col w-full border border-slate-200 rounded-xl focus-within:border-primary transition-all duration-300 shadow-sm bg-white overflow-hidden">
        <ToolbarPlugin />
        
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="min-h-[200px] p-4 outline-none text-base text-slate-700 prose max-w-none" 
              />
            }
            placeholder={<Placeholder />}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <OnChangePlugin onChange={handleChange} />
        </div>
      </div>
    </LexicalComposer>
  );
}
