import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, RotateCcw, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera access denied ❌\n\nIf you are in the preview window, please click the 'Open in New Tab' button (↗️) at the top right to use the camera.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found ❌");
      } else {
        setError("Camera not supported or error occurred. Try opening in a new tab.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Flash effect
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // If front camera, flip horizontally
      if (facingMode === 'user') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black flex flex-col overflow-hidden"
    >
      {/* Flash Overlay */}
      <AnimatePresence>
        {isFlashActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-[10001]"
          />
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        {!capturedImage && !error && (
          <button 
            onClick={switchCamera}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex items-center justify-center">
        {error ? (
          <div className="text-center space-y-4 px-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="text-xl font-bold text-white whitespace-pre-wrap max-w-md mx-auto leading-relaxed">
              {error}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-8 py-3 bg-zinc-100 text-zinc-950 rounded-2xl font-bold hover:bg-white transition-all flex items-center gap-2"
              >
                Open in New Tab <ExternalLink className="w-4 h-4" />
              </button>
              <button 
                onClick={startCamera}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
              >
                Try Again
              </button>
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold border border-zinc-800 hover:bg-zinc-800 transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}

        {/* Focus Indicator (Visual only) */}
        {!capturedImage && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-24 h-24 border border-white/30 rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-12 flex items-center justify-center z-50 bg-gradient-to-t from-black/60 to-transparent">
        {capturedImage ? (
          <div className="flex items-center gap-8">
            <button 
              onClick={handleRetake}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 bg-zinc-900/80 backdrop-blur-md rounded-full flex items-center justify-center border border-zinc-800 group-hover:bg-zinc-800 transition-all">
                <RotateCcw className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Retake</span>
            </button>

            <button 
              onClick={handleUsePhoto}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-all">
                <Check className="w-10 h-10 text-white" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Use Photo</span>
            </button>
          </div>
        ) : (
          !error && (
            <button 
              onClick={capturePhoto}
              className="group relative"
            >
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all group-active:scale-90">
                <div className="w-16 h-16 bg-white rounded-full transition-all group-hover:scale-95" />
              </div>
              <div className="absolute -inset-4 border border-white/20 rounded-full animate-ping opacity-20" />
            </button>
          )
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
