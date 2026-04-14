import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LifeBuoy, 
  Send, 
  Loader2, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Star,
  ChevronRight,
  ArrowLeft,
  User,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Camera,
  X,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, storage, ref, uploadBytesResumable, getDownloadURL } from '../firebase';
import { UserProfile, SupportTicket } from '../types';
import { sendNotification } from '../lib/notifications';
import { CameraCapture } from './CameraCapture';

interface SupportPanelProps {
  user: UserProfile;
  onNavigate: (page: any) => void;
}

export function SupportPanel({ user, onNavigate }: SupportPanelProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [issueType, setIssueType] = useState<'Bug' | 'Payment' | 'Account' | 'Other'>('Bug');
  const [description, setDescription] = useState('');

  // Media State
  const [attachments, setAttachments] = useState<{ file: File | string, type: string, preview: string, name: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    console.log("Fetching support tickets for user...");
    const q = query(
      collection(db, 'supportTickets'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("User fetched support tickets successfully, count:", snapshot.docs.length);
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
    }, (error) => {
      console.error("Error fetching support tickets for user:", error);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      // Validation
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isDoc = file.type === 'application/pdf' || file.type === 'text/plain';

      if (!isImage && !isVideo && !isDoc) {
        alert(`Invalid file type: ${file.name} ❌`);
        return;
      }

      const maxSize = isImage ? 5 * 1024 * 1024 : isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File too large: ${file.name} ❌ (Max ${isImage ? '5MB' : isVideo ? '20MB' : '5MB'})`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments(prev => [...prev, {
          file,
          type: isImage ? 'image' : isVideo ? 'video' : 'file',
          preview: e.target?.result as string,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraCapture = (imageData: string) => {
    setAttachments(prev => [...prev, {
      file: imageData,
      type: 'image',
      preview: imageData,
      name: `camera-capture-${Date.now()}.jpg`
    }]);
    setShowCamera(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<{ urls: string[], types: string[] }> => {
    const urls: string[] = [];
    const types: string[] = [];

    for (const attachment of attachments) {
      let fileToUpload: Blob | File;
      
      if (typeof attachment.file === 'string') {
        // Convert base64 to blob
        const res = await fetch(attachment.file);
        fileToUpload = await res.blob();
      } else {
        fileToUpload = attachment.file;
      }

      const storageRef = ref(storage, `support/${user.uid}/${Date.now()}-${attachment.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [attachment.name]: progress }));
          },
          (error) => {
            console.error("Upload failed:", error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            urls.push(downloadURL);
            types.push(attachment.type);
            resolve();
          }
        );
      });
    }

    return { urls, types };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submit clicked");
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      console.log("Uploading attachments...");
      const { urls, types } = await uploadFiles();

      console.log("Submitting ticket...");
      await addDoc(collection(db, 'supportTickets'), {
        userId: user.uid,
        email: user.email || 'unknown@example.com',
        subject,
        issueType,
        description,
        mediaUrl: urls,
        mediaType: types,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log("Ticket saved successfully");
      
      // Notify Admin
      await sendNotification('admin', `New support ticket received 📩: ${subject}`, 'support');

      setSubject('');
      setDescription('');
      setAttachments([]);
      setUploadProgress({});
      setShowForm(false);
      alert("Ticket submitted ✅");
    } catch (error) {
      console.error("Error submitting ticket:", error);
      alert("Error occurred ❌. Check file sizes and types.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFeedback = async (ticketId: string) => {
    if (feedbackRating === 0) return;
    setIsSubmittingFeedback(true);
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        feedback: {
          rating: feedbackRating,
          comment: feedbackComment
        },
        updatedAt: serverTimestamp()
      });
      setFeedbackRating(0);
      setFeedbackComment('');
      setSelectedTicket(null);
      alert("Update successful");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Error occurred ❌");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'pending': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'resolved': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'denied': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'resolved': return <CheckCircle2 className="w-4 h-4" />;
      case 'denied': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto pb-24 space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors group"
            title="Back to Settings"
          >
            <ArrowLeft className="w-6 h-6 text-zinc-500 group-hover:text-white" />
          </button>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <LifeBuoy className="w-8 h-8 text-blue-500" />
              Support & Care
            </h1>
            <p className="text-zinc-500 text-sm">Get help, report issues, and track your support tickets.</p>
          </div>
        </div>
        {!showForm && !selectedTicket && (
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create Support Ticket</h2>
              <button 
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Issue Type</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Bug">Bug Report</option>
                  <option value="Payment">Billing & Payment</option>
                  <option value="Account">Account Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide as much detail as possible..."
                  rows={5}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-zinc-400">Attachments</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                    >
                      <Paperclip className="w-4 h-4" />
                      Attach File
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                    >
                      <Camera className="w-4 h-4" />
                      Camera
                    </button>
                  </div>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept="image/*,video/*,.pdf,.txt"
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {attachments.map((att, index) => (
                      <div key={index} className="relative group aspect-video bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                        {att.type === 'image' ? (
                          <img src={att.preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : att.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <Video className="w-8 h-8 text-zinc-600" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <FileText className="w-8 h-8 text-zinc-600" />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {uploadProgress[att.name] !== undefined && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress[att.name]}%` }}
                              className="h-full bg-blue-500"
                            />
                          </div>
                        )}

                        <div className="absolute bottom-1 left-1 right-1">
                          <p className="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded truncate">
                            {att.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : selectedTicket ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <button 
              onClick={() => setSelectedTicket(null)}
              className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Tickets
            </button>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-zinc-500">Ticket ID: <span className="font-mono text-zinc-400">{selectedTicket.id.slice(0, 8)}</span></span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-zinc-500">{selectedTicket.issueType}</span>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-bold uppercase tracking-wider w-fit ${getStatusColor(selectedTicket.status)}`}>
                  {getStatusIcon(selectedTicket.status)}
                  {selectedTicket.status}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                    <User className="w-4 h-4" />
                    You
                  </div>
                  <p className="text-zinc-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Attachments View */}
                {selectedTicket.mediaUrl && selectedTicket.mediaUrl.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Attachments</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedTicket.mediaUrl.map((url, i) => {
                        const type = selectedTicket.mediaType?.[i] || 'image';
                        return (
                          <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden group">
                            {type === 'image' ? (
                              <div className="relative aspect-video">
                                <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform">
                                    <ExternalLink className="w-5 h-5" />
                                  </a>
                                </div>
                              </div>
                            ) : type === 'video' ? (
                              <video src={url} controls className="w-full aspect-video bg-black" />
                            ) : (
                              <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-zinc-400" />
                                  </div>
                                  <span className="text-sm font-medium text-zinc-300">Document Attachment</span>
                                </div>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-500 hover:text-white transition-colors">
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedTicket.adminReply && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 space-y-3 ml-4 sm:ml-8"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                      <LifeBuoy className="w-4 h-4" />
                      Support Team
                    </div>
                    <p className="text-zinc-200 whitespace-pre-wrap">{selectedTicket.adminReply}</p>
                  </motion.div>
                )}
              </div>

              {selectedTicket.status === 'resolved' && !selectedTicket.feedback && (
                <div className="pt-8 border-t border-zinc-800 space-y-4">
                  <h3 className="text-lg font-bold text-white">How did we do?</h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star className={`w-8 h-8 ${feedbackRating >= star ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`} />
                      </button>
                    ))}
                  </div>
                  {feedbackRating > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4"
                    >
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Optional: Tell us more about your experience..."
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                      <button
                        onClick={() => handleSubmitFeedback(selectedTicket.id)}
                        disabled={isSubmittingFeedback}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit Feedback
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {selectedTicket.feedback && (
                <div className="pt-8 border-t border-zinc-800 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-400">Your Feedback</h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-4 h-4 ${selectedTicket.feedback!.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
                    ))}
                  </div>
                  {selectedTicket.feedback.comment && (
                    <p className="text-zinc-500 text-sm italic">"{selectedTicket.feedback.comment}"</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {tickets.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800/50 rounded-3xl">
                <LifeBuoy className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No Support Tickets</h3>
                <p className="text-zinc-500 text-sm">You haven't submitted any support requests yet.</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{ticket.subject}</h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="font-mono">{ticket.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{ticket.issueType}</span>
                      <span>•</span>
                      <span>{ticket.createdAt?.toDate?.().toLocaleDateString() || 'Just now'}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-bold uppercase tracking-wider shrink-0 w-fit ${getStatusColor(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCamera && (
          <CameraCapture 
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}


