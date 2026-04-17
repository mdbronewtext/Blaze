import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { 
  Send, 
  Zap, 
  Brain, 
  Flame, 
  Sparkles,
  User,
  Bot,
  Copy,
  Check,
  RotateCcw,
  Crown,
  Paperclip,
  ImageIcon,
  FileText,
  Camera,
  X,
  Loader2,
  FileSearch,
  FileJson,
  FileCode,
  UploadCloud,
  Code2,
  Search,
  MessageSquare,
  ChevronDown,
  Ban,
  Lock,
  Mic,
  Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, AIMode, Plan, Attachment, AIModel, UserProfile } from '../types';
import { CodeBlock } from './CodeBlock';
import { ChatSkeleton } from './Skeleton';
import { NotificationBell } from './NotificationBell';
import { CameraCapture } from './CameraCapture';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const SafeImage = React.memo(({ src, alt }: { src: string, alt: string }) => {
  const [downloading, setDownloading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      // Try to fetch as blob for clean download filename
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blaze-ai-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download balance failed:', error);
      // Fallback for cross-origin issues
      const link = document.createElement('a');
      link.href = src;
      link.target = '_blank';
      link.download = `blaze-ai-image-${Date.now()}.png`;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full group/img my-4 min-h-[100px]">
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/20 group-hover:border-white/20 transition-all p-1 ${!loaded ? 'animate-pulse bg-zinc-900' : ''}`}>
        <img 
          src={src} 
          alt={alt} 
          className={`max-w-full h-auto rounded-xl object-contain select-none pointer-events-none cursor-default transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
          referrerPolicy="no-referrer"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onLoad={() => setLoaded(true)}
        />
        {/* Overlay to block even more interactions */}
        <div 
          className="absolute inset-0 z-10" 
          onContextMenu={(e) => e.preventDefault()}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-xl disabled:opacity-50 shrink-0"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Download Image
      </button>
    </div>
  );
});

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string, attachment?: Attachment) => void;
  currentMode: AIMode;
  selectedAIModel: AIModel;
  onAIModelChange: (model: AIModel) => void;
  setMode: (mode: AIMode) => void;
  onSaveToMemory?: (content: string) => void;
  isTyping: boolean;
  streamingMessage?: string;
  onStopGenerating?: () => void;
  userPlan: Plan;
  privacyMode?: boolean;
  isLoading?: boolean;
  userRole?: string;
  currentUser: UserProfile;
  aiModels: any[];
}

const MessageItem = React.memo(({ 
  msg, 
  copiedId, 
  handleCopy, 
  onSaveToMemory,
  formatTime,
  formatSize,
  getModelInfo
}: { 
  msg: Message; 
  copiedId: string | null; 
  handleCopy: (id: string, text: string) => void; 
  onSaveToMemory?: (content: string) => void;
  formatTime: (ts: any) => string;
  formatSize: (bytes?: number) => string;
  getModelInfo: (id: string) => any;
}) => (
  <div className="py-4">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 sm:gap-4 group ${msg.sender === 'ai' ? 'max-w-4xl mx-auto' : 'max-w-3xl ml-auto flex-row-reverse'}`}
    >
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center shadow-sm ${
        msg.sender === 'ai' 
          ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' 
          : 'bg-blue-600 text-white'
      }`}>
        {msg.sender === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>
      <div className={`space-y-1.5 min-w-0 w-full flex flex-col ${msg.sender === 'ai' ? 'items-start' : 'items-end'}`}>
        {msg.sender === 'ai' && (
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-300 ml-1">
            <span>{getModelInfo(msg.modelUsed || '').icon}</span>
            <span>{getModelInfo(msg.modelUsed || '').name}</span>
          </div>
        )}
        <div className={`p-4 text-[15px] leading-relaxed break-words overflow-hidden glass-card depth-shadow relative ${
          msg.sender === 'ai' 
            ? 'border border-white/5 text-zinc-200 rounded-2xl rounded-tl-sm w-full' 
            : 'bg-gradient-to-br from-blue-600 to-blue-500 text-white font-medium rounded-2xl rounded-tr-sm border border-blue-400/20'
        }`}>
          {msg.sender === 'ai' && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <button 
                type="button"
                onClick={() => handleCopy(msg.id, msg.message)}
                className="p-1.5 bg-zinc-900/50 backdrop-blur-sm border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all shadow-lg flex items-center gap-1.5 px-2.5"
                title="Copy message"
              >
                {copiedId === msg.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white uppercase tracking-wider">Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
          {msg.attachment && (
            <div className="mb-3">
              {msg.attachment.type === 'image' ? (
                <SafeImage src={msg.attachment.url} alt={msg.attachment.name || "Attachment"} />
              ) : (
                <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    {msg.attachment.mimeType === 'application/pdf' ? <FileSearch className="w-5 h-5 text-red-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{msg.attachment.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{formatSize(msg.attachment.size)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="markdown-body overflow-x-auto">
            <ReactMarkdown
              components={{
                img({ src, alt }: any) {
                  return <SafeImage src={src} alt={alt} />;
                },
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <CodeBlock
                      language={match[1]}
                      value={String(children).replace(/\n$/, '')}
                    />
                  ) : (
                    <code className={`${className} bg-black/20 px-1.5 py-0.5 rounded-md font-mono text-[13px]`} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {msg.message}
            </ReactMarkdown>
          </div>
        </div>
        
        <div className={`flex items-center gap-3 px-1 mt-1 ${msg.sender === 'ai' ? 'flex-row' : 'flex-row-reverse'}`}>
          <span className="text-[11px] text-zinc-500 font-medium">
            {formatTime(msg.timestamp)}
          </span>
          
          {msg.sender === 'ai' && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button 
                type="button"
                onClick={() => onSaveToMemory?.(msg.message)}
                className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-colors"
                title="Save to Memory"
              >
                <Brain className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  </div>
), (prev, next) => {
  return prev.msg.id === next.msg.id && 
         prev.msg.message === next.msg.message && 
         prev.copiedId === next.copiedId;
});

const StreamingMessageItem = React.memo(({ 
  selectedAIModel, 
  streamingMessage,
  getModelInfo,
  handleCopy,
  copiedId
}: { 
  selectedAIModel: AIModel; 
  streamingMessage: string; 
  getModelInfo: (id: string) => any;
  handleCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex gap-3 sm:gap-4 max-w-4xl mx-auto"
  >
    <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 shrink-0 flex items-center justify-center border border-zinc-700 shadow-sm">
      <Bot className="w-5 h-5" />
    </div>
      <div className="flex flex-col items-start gap-1.5 min-w-0 w-full relative group">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-300 ml-1">
          <span>{getModelInfo(selectedAIModel).icon}</span>
          <span>{getModelInfo(selectedAIModel).name}</span>
        </div>
        <div className="flex flex-col gap-3 p-4 glass-card border border-white/5 rounded-2xl rounded-tl-sm depth-shadow max-w-full w-full relative">
          {streamingMessage && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <button 
                type="button"
                onClick={() => handleCopy('streaming', streamingMessage)}
                className="p-1.5 bg-zinc-900/50 backdrop-blur-sm border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all shadow-lg flex items-center gap-1.5 px-2.5"
                title="Copy message"
              >
                {copiedId === 'streaming' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white uppercase tracking-wider">Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
        {streamingMessage ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                img({ src, alt }: any) {
                  return <SafeImage src={src} alt={alt} />;
                },
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <CodeBlock
                      language={match[1]}
                      value={String(children).replace(/\n$/, '')}
                    />
                  ) : (
                    <code className={`${className} bg-black/20 px-1.5 py-0.5 rounded-md font-mono text-[13px]`} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {streamingMessage}
            </ReactMarkdown>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-2 h-4 bg-white ml-1 align-middle"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[15px] text-zinc-400 font-medium">
              {getModelInfo(selectedAIModel).name} is thinking
            </span>
            <div className="flex items-center gap-1">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  </motion.div>
));

export const ChatInterface = React.memo(({ 
  messages, 
  onSendMessage, 
  currentMode, 
  selectedAIModel,
  onAIModelChange,
  setMode, 
  onSaveToMemory,
  isTyping,
  streamingMessage,
  onStopGenerating,
  userPlan,
  privacyMode = false,
  isLoading = false,
  userRole,
  currentUser,
  aiModels
}: ChatInterfaceProps) => {
  const isOwner = userRole === 'owner';
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const selectedModelData = aiModels?.find(m => m.id === selectedAIModel) || aiModels?.[0] || { name: 'Unknown', icon: '💬' };

  const getModelInfo = useCallback((id: string) => {
    return aiModels.find(m => m.id === id) || aiModels[0];
  }, [aiModels]);

  const scrollToBottom = useCallback((force = false) => {
    if (force || atBottom) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length + (isTyping ? 1 : 0),
        behavior: force ? 'auto' : 'smooth',
        align: 'end'
      });
    }
  }, [messages.length, isTyping, atBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isTyping, streamingMessage, scrollToBottom]);

  useEffect(() => {
    const handleResize = () => {
      // Scroll to bottom immediately on resize (e.g., keyboard open)
      virtuosoRef.current?.scrollToIndex({
        index: messages.length + (isTyping ? 1 : 0),
        behavior: 'auto',
        align: 'end'
      });
    };
    
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [messages.length, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && !recognitionRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
          }
        };

        recog.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
            setIsRecording(false);
            isRecordingRef.current = false;
            alert('Microphone access denied ❌. Please allow microphone access in your browser settings or try opening the app in a NEW TAB.');
          } else if (event.error === 'no-speech') {
            // Ignore no-speech errors
          } else {
            setIsRecording(false);
            isRecordingRef.current = false;
          }
        };

        recog.onend = () => {
          if (isRecordingRef.current) {
            try {
              recog.start();
            } catch (e) {
              setIsRecording(false);
              isRecordingRef.current = false;
            }
          } else {
            setIsRecording(false);
          }
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  const toggleRecording = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!recognitionRef.current) {
      alert('Voice not supported on this browser ❌');
      return;
    }

    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      recognitionRef.current.stop();
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert('Voice not supported on this browser ❌. Please open in a new tab.');
          return;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        isRecordingRef.current = true;
        setIsRecording(true);
        recognitionRef.current.start();
      } catch (err: any) {
        isRecordingRef.current = false;
        setIsRecording(false);
        alert('Microphone access denied ❌');
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const finalInput = customPrompt || input.trim();
    if ((finalInput || attachment) && !isTyping && !isProcessing) {
      onSendMessage(finalInput, attachment || undefined);
      setInput('');
      setAttachment(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      e.currentTarget.style.height = 'auto';
    }
  };

  const startCamera = () => {
    setShowCamera(true);
    setShowAttachMenu(false);
  };

  const handleCameraCapture = (imageData: string) => {
    setAttachment({
      type: 'image',
      url: imageData,
      name: `camera_capture_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      size: Math.round((imageData.length * 3) / 4)
    });
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const extractPdfText = async (url: string): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    return fullText;
  };

  const processFile = async (file: File, type: 'file' | 'image') => {
    setIsProcessing(true);
    try {
      let result = '';
      let extractedText = '';

      if (type === 'image') {
        result = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const maxDim = 1024;
              if (width > height && width > maxDim) {
                height *= maxDim / width;
                width = maxDim;
              } else if (height > maxDim) {
                width *= maxDim / height;
                height = maxDim;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
              } else {
                resolve(e.target?.result as string);
              }
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = e.target?.result as string;
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      } else {
        result = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        if (file.type === 'application/pdf') {
          extractedText = await extractPdfText(result);
        } else if (file.type.startsWith('text/') || ['application/json', 'application/javascript'].includes(file.type)) {
          const textReader = new FileReader();
          extractedText = await new Promise<string>((resolve) => {
            textReader.onload = (e) => resolve(e.target?.result as string);
            textReader.readAsText(file);
          });
        }
      }

      setAttachment({
        type,
        url: result,
        name: file.name,
        mimeType: type === 'image' ? 'image/jpeg' : file.type,
        size: file.size,
        extractedText: extractedText || undefined
      });
      setShowAttachMenu(false);
    } catch (err) {
      alert("Error processing file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = e.target.files?.[0];
    if (file) processFile(file, type);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      processFile(file, type);
    }
  };

  const modes: { id: AIMode; label: string; icon: React.ReactNode; color: string; minPlan: Plan }[] = [
    { id: 'lite', label: 'Lite', icon: <Zap className="w-4 h-4" />, color: 'text-blue-400', minPlan: 'FREE' },
    { id: 'smart', label: 'Smart', icon: <Brain className="w-4 h-4" />, color: 'text-purple-400', minPlan: 'PLUS' },
    { id: 'beast', label: 'Beast', icon: <Flame className="w-4 h-4" />, color: 'text-orange-500', minPlan: 'PRO' },
  ];

  const canUseMode = (minPlan: Plan) => {
    if (userPlan === 'OWNER') return true;
    const plans: Plan[] = ['FREE', 'PLUS', 'PRO', 'ELITE'];
    return plans.indexOf(userPlan) >= plans.indexOf(minPlan);
  };

  return (
    <div 
      className={`flex-1 flex flex-col h-full bg-zinc-950 relative overflow-hidden font-sans transition-colors ${isDragging ? 'bg-blue-900/10' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-blue-600/20 backdrop-blur-sm pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4 p-12 border-4 border-dashed border-blue-500 rounded-[3rem] bg-zinc-950/80 shadow-2xl">
              <UploadCloud className="w-20 h-20 text-blue-400 animate-bounce" />
              <h2 className="text-3xl font-black text-white">Drop to Upload</h2>
              <p className="text-zinc-400 font-medium">PDF, Images, Text, Code</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-blue-900/10 blur-[120px] pointer-events-none" />

      {/* Header / Mode Selector */}
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <button 
              type="button"
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-2.5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all group shadow-lg"
            >
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 group-hover:text-white transition-colors">
                  {aiModels.find(m => m.id === selectedAIModel)?.icon || '💬'}
                </span>
                <span className="text-xs font-bold text-white tracking-tight">
                  {aiModels.find(m => m.id === selectedAIModel)?.name || 'Select Model'}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-300 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl"
                >
                  <div className="px-3 py-2 mb-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Select Model</p>
                  </div>
                  <div className="space-y-1">
                    {aiModels.filter(m => m.enabled !== false).map((model) => (
                      <button
                        type="button"
                        key={model.id}
                        onClick={() => {
                          onAIModelChange(model.id as AIModel);
                          setIsModelMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 ${
                          selectedAIModel === model.id 
                            ? 'bg-zinc-800/80 border border-zinc-700 shadow-inner' 
                            : 'hover:bg-zinc-800/40 border border-transparent'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-sm text-lg`}>
                          {model.icon}
                        </div>
                        <div className="text-left">
                          <p className={`text-[11px] font-bold ${selectedAIModel === model.id ? 'text-white' : 'text-zinc-300'}`}>{model.name}</p>
                          <p className="text-[9px] text-zinc-500 font-medium truncate max-w-[120px]">{model.description}</p>
                        </div>
                        {selectedAIModel === model.id && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <NotificationBell user={currentUser} />
        </div>
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/50 shadow-sm">
          {modes.map((mode) => {
            const disabled = !canUseMode(mode.minPlan);
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => !disabled && setMode(mode.id)}
                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentMode === mode.id 
                    ? 'text-white shadow-sm' 
                    : disabled ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {currentMode === mode.id && (
                  <motion.div
                    layoutId="mode-pill"
                    className="absolute inset-0 bg-zinc-800 rounded-lg -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={currentMode === mode.id ? mode.color : ''}>{mode.icon}</span>
                <span>{mode.label}</span>
                {disabled && <CrownIcon />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 relative">
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          initialTopMostItemIndex={messages.length - 1}
          atBottomStateChange={setAtBottom}
          className="scrollbar-hide"
          followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          components={{
            Header: () => (
              <div className="pt-4 sm:pt-6">
                {isLoading ? (
                  <div className="max-w-3xl mx-auto px-4">
                    <ChatSkeleton />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-2xl mx-auto mt-10 px-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-700/50 shadow-2xl shrink-0">
                      <Sparkles className="w-10 h-10 text-blue-400" />
                    </div>
                    <div className="space-y-3 px-4">
                      <h2 className="text-3xl font-semibold text-white tracking-tight">How can I help you today?</h2>
                      <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto">
                        I'm your next-generation AI assistant. Choose a mode and let's build something amazing.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full px-4 mt-8">
                      <QuickAction label="Write a blog post" onClick={() => setInput("Write a blog post about the future of AI")} />
                      <QuickAction label="Debug my code" onClick={() => setInput("Can you help me debug this React component?")} />
                      <QuickAction label="Business ideas" onClick={() => setInput("Give me 5 viral business ideas for 2026")} />
                      <QuickAction label="Prompt enhancer" onClick={() => setInput("Enhance this prompt: 'make a cool logo'")} />
                    </div>
                  </div>
                ) : null}
              </div>
            ),
            Footer: () => (
              <div className="pb-8 px-4 sm:px-6">
                {isTyping && (
                  <div className="py-4">
                    <StreamingMessageItem 
                      selectedAIModel={selectedAIModel}
                      streamingMessage={streamingMessage}
                      getModelInfo={getModelInfo}
                      handleCopy={handleCopy}
                      copiedId={copiedId}
                    />
                  </div>
                )}
                <div className="h-4" />
              </div>
            )
          }}
          itemContent={(_, msg) => (
            <div className="px-4 sm:px-6">
              <MessageItem 
                key={msg.id}
                msg={msg}
                copiedId={copiedId}
                handleCopy={handleCopy}
                onSaveToMemory={onSaveToMemory}
                formatTime={formatTime}
                formatSize={formatSize}
                getModelInfo={getModelInfo}
              />
            </div>
          )}
        />
        
        <AnimatePresence>
          {!atBottom && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-4 right-8 p-3 rounded-full bg-blue-600 text-white shadow-2xl hover:bg-blue-500 transition-all z-50 flex items-center gap-2 border border-blue-400/20 backdrop-blur-md"
            >
              <ChevronDown className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Recent Messages</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 left-0 right-0 px-4 pt-4 pb-4 sm:px-6 sm:pt-6 bg-zinc-950 z-40 border-t border-zinc-800/50 shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
        <div className="absolute top-0 left-0 right-0 h-20 -translate-y-full bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative">
          
          <AnimatePresence>
            {(attachment || isProcessing) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-3 flex flex-col gap-3"
              >
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl inline-flex items-center gap-3 relative shadow-lg self-start">
                  {!isProcessing && (
                    <button 
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  {isProcessing ? (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    </div>
                  ) : attachment?.type === 'image' ? (
                    <img src={attachment.url} alt="Preview" className="w-12 h-12 rounded-lg object-cover bg-black" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                      {attachment?.mimeType === 'application/pdf' ? <FileSearch className="w-6 h-6 text-red-400" /> : <FileText className="w-6 h-6 text-blue-400" />}
                    </div>
                  )}
                  
                  <div className="pr-4 max-w-[200px]">
                    <p className="text-sm font-medium text-white truncate">
                      {isProcessing ? 'Processing file...' : attachment?.name}
                    </p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      {isProcessing ? 'Please wait' : `${attachment?.type} • ${formatSize(attachment?.size)}`}
                    </p>
                  </div>
                </div>

                {!isProcessing && attachment && (
                  <div className="flex flex-wrap gap-2">
                    <button 
                      type="button"
                      onClick={() => handleSubmit(undefined, "Summarize this file.")}
                      className="px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-full text-xs font-bold text-accent"
                    >
                      Summarize
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="relative group shadow-2xl flex items-end gap-2">
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-3.5 bg-zinc-900 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all shadow-sm"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <button
                      type="button"
                      onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
                    >
                      <FileText className="w-4 h-4" /> Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => { photoInputRef.current?.click(); setShowAttachMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
                    >
                      <ImageIcon className="w-4 h-4" /> Upload Photo
                    </button>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
                    >
                      <Camera className="w-4 h-4" /> Camera
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "Listening..." : `Message ${selectedModelData.name}...`}
                rows={1}
                disabled={isTyping}
                className={`w-full glass-panel border border-white/10 text-white rounded-3xl pl-6 pr-24 py-4 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-500 resize-none overflow-hidden min-h-[56px] max-h-[200px] ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ height: 'auto' }}
              />
              <AnimatePresence mode="wait">
                {isTyping ? (
                  <motion.button
                    key="stop-button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    type="button"
                    onClick={onStopGenerating}
                    className="absolute right-2 bottom-2 p-2.5 rounded-full bg-red-500 text-white shadow-lg flex items-center gap-2 px-4"
                  >
                    <div className="w-2 h-2 bg-white rounded-sm animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Stop</span>
                  </motion.button>
                ) : (
                  <div className="absolute right-2 bottom-2 flex items-center gap-2 z-20">
                    <motion.button
                      type="button"
                      onClick={(e) => toggleRecording(e)}
                      className={`p-2.5 rounded-full transition-all ${isRecording ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                    >
                      <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={(e) => handleSubmit(e)}
                      disabled={(!input.trim() && !attachment) || isProcessing}
                      className={`p-2.5 rounded-full transition-all ${(input.trim() || attachment) && !isProcessing ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </motion.button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileSelect(e, 'file')} />
      <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'image')} />
      
      <AnimatePresence>
        {showCamera && (
          <CameraCapture 
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="p-4 glass-card border border-white/5 rounded-2xl text-sm text-zinc-400 hover:bg-white/5 hover:text-white hover:border-white/10 transition-all text-left group"
    >
      <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">
        {label}
      </span>
    </button>
  );
}

function CrownIcon() {
  return (
    <div className="ml-1 text-amber-500">
      <Crown className="w-3 h-3 fill-amber-500" />
    </div>
  );
}
