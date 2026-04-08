'use client';

import { mono } from '@/lib/fonts';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { intakeApi, type IntakeSourceType } from '@/lib/api/intake';
import {
  ArrowLeft, Camera, X, Smartphone, Monitor, FolderOpen,
  CheckCircle2, AlertCircle, VideoOff, Circle,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_EXT   = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const MAX_MB        = 50;

const SOURCE_OPTIONS: {
  value: IntakeSourceType;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'FileUpload', label: 'File Upload', sub: 'Saved photo or scan', icon: FolderOpen },
  { value: 'Mobile',     label: 'Mobile',      sub: 'Camera photo',        icon: Smartphone },
  { value: 'Webcam',     label: 'Webcam',      sub: 'Desktop camera',      icon: Monitor    },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewIntakePage() {
  const router = useRouter();

  const [file,        setFile]        = useState<File | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [sourceType,  setSourceType]  = useState<IntakeSourceType>('FileUpload');
  const [notes,       setNotes]       = useState('');
  const [fileError,   setFileError]   = useState<string | null>(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Webcam state ──────────────────────────────────────────────────────────
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError,  setWebcamError]  = useState<string | null>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop the stream when the component unmounts
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── File validation ───────────────────────────────────────────────────────

  const validateAndSetFile = useCallback((f: File) => {
    setFileError(null);
    const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
    const isValidType = ALLOWED_TYPES.includes(f.type.toLowerCase()) || ALLOWED_EXT.includes(ext);
    if (!isValidType) {
      setFileError(`Unsupported format. Allowed: ${ALLOWED_EXT.join(', ')}`);
      return;
    }
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > MAX_MB) {
      setFileError(`File too large — maximum is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, [validateAndSetFile]);

  // ── Webcam ────────────────────────────────────────────────────────────────

  async function startWebcam() {
    setWebcamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setWebcamError('Your browser does not support camera access.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setWebcamActive(true);
      // Attach the stream after the video element renders
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError') {
        setWebcamError('Camera permission denied. Allow access in your browser settings and try again.');
      } else if (name === 'NotFoundError') {
        setWebcamError('No camera found. Make sure a webcam is connected.');
      } else {
        setWebcamError('Could not start camera. Try using file upload instead.');
      }
    }
  }

  function stopWebcam() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setWebcamActive(false);
    setWebcamError(null);
  }

  function capturePhoto() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const captured = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopWebcam();
      validateAndSetFile(captured);
      setSourceType('Webcam'); // auto-select to match how the photo was taken
    }, 'image/jpeg', 0.92);
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: () => intakeApi.upload({
      file:        file!,
      sourceType,
      uploadNotes: notes.trim() || undefined,
    }),
    onSuccess: (res) => {
      showToast('Photo uploaded — extraction queued.', true);
      setTimeout(() => router.push(`/admin/intake/${res.data.id}`), 800);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      showToast(msg ?? 'Upload failed. Please try again.', false);
    },
  });

  const canSubmit = !!file && !mutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 border ${
          toast.ok
            ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
            : 'bg-red-400/10 border-red-400/30 text-red-400'
        }`}>
          {toast.ok
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle  className="h-4 w-4 shrink-0" />}
          <span className={`${mono.className} text-[10px] uppercase tracking-[0.15em]`}>
            {toast.msg}
          </span>
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push('/admin/intake')}
        className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-text-muted hover:text-text-primary transition-colors`}
      >
        <ArrowLeft className="h-3 w-3" /> Back to Intake Queue
      </button>

      {/* Header */}
      <h1
        className="font-black tracking-tight leading-[1.1] text-text-primary"
        style={{ fontFamily: 'var(--font-epilogue)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}
      >
        Upload Material Photo
      </h1>

      {/* ── Photo picker ── */}
      <div className="border border-border p-6 space-y-4">
        <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted`}>
          Photo <span className="text-red-500">*</span>
        </p>

        {/* Preview — shown once a file is selected (from file picker or webcam capture) */}
        {preview && file && (
          <div className="space-y-3">
            <div className="relative border border-border bg-surface-alt flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Selected material photo"
                className="max-w-full max-h-[60vh] object-contain"
              />
              {!mutation.isPending && (
                <button
                  onClick={clearFile}
                  className="absolute top-2 right-2 w-7 h-7 bg-surface border border-border flex items-center justify-center text-text-muted hover:text-red-500 hover:border-red-300 transition-colors"
                  title="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className={`${mono.className} text-[9px] text-text-muted`}>
              {file.name} &nbsp;·&nbsp; {(file.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
        )}

        {/* Live webcam view — shown after getUserMedia succeeds, before capture */}
        {webcamActive && !preview && (
          <div className="space-y-3">
            <div className="relative border border-border bg-black aspect-video overflow-hidden">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                onClick={stopWebcam}
                className="absolute top-2 right-2 w-7 h-7 bg-surface border border-border flex items-center justify-center text-text-muted hover:text-red-500 hover:border-red-300 transition-colors"
                title="Stop camera"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={capturePhoto}
              className={`${mono.className} w-full flex items-center justify-center gap-2 h-10 bg-accent text-white border border-accent hover:bg-accent/90 text-[9px] uppercase tracking-[0.18em] transition-colors`}
            >
              <Circle className="h-3.5 w-3.5 fill-current" /> Capture Photo
            </button>
            {/* Hidden canvas used to snapshot the video frame */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Drop zone — shown when no file is selected and webcam is not active */}
        {!preview && !webcamActive && (
          <div className="space-y-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed p-12 text-center cursor-pointer transition-colors
                ${dragOver
                  ? 'border-accent/50 bg-accent-light'
                  : 'border-border hover:border-border-strong hover:bg-surface-alt'
                }
              `}
            >
              <Camera className={`h-8 w-8 mx-auto mb-4 ${dragOver ? 'text-accent/60' : 'text-text-muted'}`} />
              <p className={`${mono.className} text-[11px] text-text-secondary mb-1`}>
                Drag and drop a photo here
              </p>
              <p className={`${mono.className} text-[10px] text-text-muted mb-4`}>
                or click to browse files
              </p>
              <p className={`${mono.className} text-[9px] text-text-muted`}>
                {ALLOWED_EXT.join('  ·  ')} &nbsp;·&nbsp; Max {MAX_MB} MB
              </p>
            </div>

            {/*
              Single file input — no `capture` attribute.
              On mobile, browsers natively offer "Take Photo / Choose from Library".
              On desktop, opens the standard file picker.
            */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ALLOWED_EXT.join(',')}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f); }}
            />

            {/*
              Webcam button — calls getUserMedia so the browser prompts for
              camera permission and streams the attached camera directly.
              Works on desktop with any connected webcam; on mobile this is
              redundant with the native file picker but harmless.
            */}
            <button
              onClick={startWebcam}
              className={`${mono.className} w-full flex items-center justify-center gap-2 h-9 border border-border text-text-muted hover:border-border-strong hover:text-text-secondary text-[9px] uppercase tracking-[0.18em] transition-colors`}
            >
              <VideoOff className="h-3.5 w-3.5" /> Use Webcam
            </button>
          </div>
        )}

        {webcamError && (
          <div className="flex items-start gap-2 px-3 py-2.5 border border-red-200 bg-red-50">
            <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
            <p className={`${mono.className} text-[9px] text-red-600`}>{webcamError}</p>
          </div>
        )}

        {fileError && (
          <p className={`${mono.className} text-[10px] text-red-500`}>{fileError}</p>
        )}
      </div>

      {/* ── Source type ── */}
      <div className="border border-border p-6 space-y-4">
        <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted`}>
          Source Type
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SOURCE_OPTIONS.map(({ value, label, sub, icon: Icon }) => {
            const active = sourceType === value;
            return (
              <button
                key={value}
                onClick={() => setSourceType(value)}
                className={`
                  flex flex-col items-center gap-2 py-4 px-3 border transition-colors
                  ${active
                    ? 'border-accent bg-accent-light text-accent'
                    : 'border-border text-text-muted hover:border-border-strong hover:text-text-secondary'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <div className="text-center">
                  <p className={`${mono.className} text-[9px] uppercase tracking-[0.15em] font-medium`}>
                    {label}
                  </p>
                  <p className={`${mono.className} text-[8px] mt-0.5 ${active ? 'text-accent/70' : 'text-text-muted'}`}>
                    {sub}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="border border-border p-6 space-y-4">
        <p className={`${mono.className} text-[8px] uppercase tracking-[0.28em] text-text-muted`}>
          Upload Notes <span className="normal-case tracking-normal">(optional)</span>
        </p>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Creality Hyper PLA from Amazon order, partial spool approx 600g…"
          disabled={mutation.isPending}
          className={`${mono.className} w-full bg-surface-alt border border-border px-3 py-2 text-[10px] text-text-secondary focus:outline-none focus:border-accent transition-colors resize-none placeholder:text-text-muted disabled:opacity-50`}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        <button
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
          className={`${mono.className} inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] px-6 h-9 bg-accent text-white border border-accent hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Camera className="h-3.5 w-3.5" />
          {mutation.isPending ? 'Uploading…' : 'Upload Photo'}
        </button>
        <button
          disabled={mutation.isPending}
          onClick={() => router.push('/admin/intake')}
          className={`${mono.className} text-[9px] uppercase tracking-[0.15em] px-6 h-9 border border-border text-text-muted hover:text-text-secondary hover:border-border-strong transition-colors disabled:opacity-40`}
        >
          Cancel
        </button>
      </div>

    </div>
  );
}