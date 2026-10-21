'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './chat-audio.css';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** The waveform is decoded from the recording; a seek bar remains if CORS/codec prevents decoding. */
export function ChatAudio({ src, outgoing = false }: { src: string; outgoing?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let context: AudioContext | undefined;
    let cancelled = false;
    async function decode() {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) return;
        const bytes = await response.arrayBuffer();
        if (cancelled || bytes.byteLength > 12 * 1024 * 1024) return;
        context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes);
        if (cancelled) return;
        const samples = buffer.getChannelData(0);
        const step = Math.max(1, Math.floor(samples.length / 36));
        const values = Array.from({ length: 36 }, (_, index) => {
          let sum = 0;
          const end = Math.min(samples.length, (index + 1) * step);
          for (let i = index * step; i < end; i++) sum += samples[i] * samples[i];
          return Math.sqrt(sum / Math.max(1, end - index * step));
        });
        const maximum = Math.max(...values, .001);
        setPeaks(values.map((value, index) => {
          const smoothed = (values[Math.max(0, index - 1)] + 2 * value + values[Math.min(values.length - 1, index + 1)]) / 4;
          return Math.sqrt(smoothed / maximum);
        }));
        setDuration(buffer.duration);
      } catch { /* Audio playback does not depend on waveform decoding. */ }
      finally { if (context && context.state !== 'closed') void context.close(); }
    }
    void decode();
    return () => { cancelled = true; controller.abort(); if (context && context.state !== 'closed') void context.close(); };
  }, [src]);
  async function toggle() {
    if (!audio.current) return;
    if (!audio.current.paused) audio.current.pause();
    else {
      setError('');
      try { await audio.current.play(); } catch { setError('Не удалось воспроизвести. Попробуйте ещё раз.'); }
    }
  }
  return <div className="chat-audio" data-direction={outgoing ? 'outgoing' : 'incoming'}>
    <audio ref={audio} src={src} preload="metadata" onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration); }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={e => setPosition(e.currentTarget.currentTime)} onError={() => setError('Запись недоступна. Попробуйте открыть её позже.')} />
    <button type="button" className="chat-audio-toggle" aria-label={playing ? 'Приостановить голосовое сообщение' : 'Воспроизвести голосовое сообщение'} onClick={() => void toggle()}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
    <div className="chat-audio-body"><div className="chat-audio-track">
      {peaks.length > 0 && <div className="chat-audio-wave" aria-hidden>{peaks.map((peak, index) => <span key={index} style={{ height: `${Math.max(18, Math.min(96, Math.round(peak * 100)))}%` }} data-played={duration > 0 && index / peaks.length <= position / duration} />)}</div>}
      <input className={peaks.length ? 'chat-audio-seek has-wave' : 'chat-audio-seek'} type="range" aria-label="Позиция голосового сообщения" aria-valuetext={`${time(position)} из ${time(duration)}`} min={0} max={duration || 1} step={.1} value={Math.min(position, duration || 1)} disabled={!duration} onChange={e => { if (audio.current) { audio.current.currentTime = Number(e.target.value); setPosition(Number(e.target.value)); } }} />
    </div>
    <div className="chat-audio-footer"><span className="chat-audio-time">{time(playing || position > 0 ? position : duration)}</span></div></div>
    {error && <p role="alert" className="chat-audio-error">{error}</p>}
  </div>;
}
