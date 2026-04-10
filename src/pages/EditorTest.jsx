import React, { useState } from 'react';
import LexicalEditor from '../components/LexicalEditor/LexicalEditor';

export default function EditorTest() {
  const [htmlContent, setHtmlContent] = useState('');

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800">Lexical Editor Test</h1>
          <p className="text-slate-500 font-medium">실시간 리치 텍스트 편집 및 HTML 출력 테스트</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            Editor
          </h2>
          <LexicalEditor 
            onChange={(html) => setHtmlContent(html)} 
            initialHtml="<p><b>Hello Lexical!</b> 에디터를 테스트해보세요.</p>"
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full"></span>
            HTML Output (Saved State)
          </h2>
          <pre className="p-4 bg-slate-800 text-slate-200 rounded-xl overflow-x-auto text-sm font-mono border border-slate-700 shadow-inner">
            {htmlContent || '에디터에 글을 입력하면 HTML 코드가 여기에 표시됩니다...'}
          </pre>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Preview (Prose Rendering)
          </h2>
          <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm prose prose-slate max-w-none">
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </section>
      </div>
    </div>
  );
}
