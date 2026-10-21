'use client';

import { useEffect, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import './voice-recording-indicator.css';

const BARS = 23;
const IDLE_LEVELS = Array.from({length: BARS}, (_, i) => .12 + .10 * Math.abs(Math.sin(i * 1.29)));
const formatElapsed = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

/** Live mic feedback. No audio is uploaded until the user explicitly sends it. */
export function VoiceRecordingIndicator({
  stream,
  startedAt,
  onCancel,
  onFinish,
}: {
  stream: MediaStream | null;
  startedAt: number;
  onCancel: () => void;
  onFinish: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(IDLE_LEVELS);

  useEffect(() => {
    setElapsed(Date.now() - startedAt);
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    if (!stream || !window.AudioContext) return;
    let cancelled = false;
    let frame = 0;
    let lastUpdate = 0;
    let context: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    try {
      context = new AudioContext();
      source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .72;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const paint = (now: number) => {
        if (cancelled) return;
        if (now - lastUpdate >= 65) {
          analyser.getByteFrequencyData(data);
          const next = Array.from({ length: BARS }, (_, i) => {
            const index = Math.min(data.length - 1, 2 + Math.floor(i * (data.length - 3) / BARS));
            const energy = (data[index] + data[Math.min(data.length - 1, index + 1)]) / 510;
            return Math.max(.10, Math.min(1, .12 + Math.sqrt(energy) * .88));
          });
          setLevels(next);
          lastUpdate = now;
        }
        frame = requestAnimationFrame(paint);
      };
      void context.resume().catch(() => {});
      frame = requestAnimationFrame(paint);
    } catch {
      // On restricted iOS audio contexts the timer and recording indicator still work.
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      source?.disconnect();
      if (context && context.state !== 'closed') void context.close();
    };
  }, [stream]);

  return (
    <div className="thread-voice-recorder" role="group" aria-label="Идёт запись голосового сообщения">
      <div className="thread-voice-recorder-live">
        <span className="thread-voice-recorder-dot" aria-hidden="true" />
        <Mic size={18} strokeWidth={2} aria-hidden="true" />
        <span className="thread-voice-recorder-time" role="timer">{formatElapsed(elapsed)}</span>
      </div>
      <div className="thread-voice-recorder-wave" aria-hidden="true">
        {levels.map((level, index) =>
          <span key={index} style={{ height: `${Math.round(14 + level * 86)}%` }} />)}
      </div>
      <button type="button" className="thread-voice-recorder-cancel" onClick={onCancel} aria-label="Отменить запись голосового сообщения">
        <Trash2 size={18} aria-hidden="true" />
      </button>
      <button type="button" className="thread-voice-recorder-finish" onClick={onFinish} aria-label="Завершить запись голосового сообщения">
        <Square size={17} fill="currentColor" aria-hidden="true" />
      </button>
    </div>
  );
}
