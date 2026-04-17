import React, { useState } from 'react';
import { Check, Copy, Play, Share2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock = React.memo(({ language, value }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(value);
    alert('Code copied to clipboard for sharing!');
  };

  const isPreviewable = ['html', 'javascript', 'js'].includes(language.toLowerCase());

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-400 uppercase">{language || 'text'}</span>
        <div className="flex items-center gap-2">
          {isPreviewable && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Preview
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
      <div className="p-4 overflow-x-auto text-sm">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: 0, background: 'transparent' }}
          wrapLines={true}
        >
          {value}
        </SyntaxHighlighter>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-400" />
                Live Preview
              </h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-zinc-400 hover:text-white transition-colors text-sm font-medium px-3 py-1 rounded-lg hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                srcDoc={
                  language.toLowerCase() === 'html' 
                    ? value 
                    : `<!DOCTYPE html><html><body><script>${value}</script></body></html>`
                }
                className="w-full h-full border-none"
                sandbox="allow-scripts"
                title="Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
