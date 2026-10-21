'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './chat-audio.css';

const BAR_COUNT = 36;
const RATES = [1, 1.5, 2] as const;
type PlaybackRate = typeof RATES[number];
const time = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

/**
 * Visual peaks come from the actual recording. Gentle compression increases
 * readability for quieter speech without inventing loud peaks in true silence.
 */
function waveformPeaks(buffer: AudioBuffer): number[] {
  const samples = buffer.getChannelData(0);
  const values = Array.from({ length: BAR_COUNT }, (_, index) => {
    const start = Math.floor(index * samples.length / BAR_COUNT);
    const end = Math.floor((index + 1) * samples.length / BAR_COUNT);
    const stride = Math.max(1, Math.floor((end - start) / 2500));
    let energy = 0;
    let count = 0;
    for (let i = start; i < end; i += stride) {
      energy += samples[i] * samples[i];
      count += 1;
    }
    return Math.sqrt(energy / Math.max(1, count));
  });

  const sorted = [...values].sort((a, b) => a - b);
  const floor = sorted[Math.floor(BAR_COUNT * 0.1)] * 0.65;
  const peak = Math.max(sorted[Math.floor(BAR_COUNT * 0.95)], 0.001);
  return values.map((value, index) => {
    const adjacent = (values[Math.max(0, index - 1)] + value * 3 + values[Math.min(BAR_COUNT - 1, index + 1)]) / 5;
    const normalized = Math.min(1, Math.max(0, (adjacent - floor) / Math.max(peak - floor, 0.001)));
    return Math.pow(normalized, 0.52);
  });
}

export function ChatAudio({ src, outgoing = false }: { src: string; outgoing?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [rate, setRate] = useState<PlaybackRate>(1);
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
        setPeaks(waveformPeaks(buffer));
        setDuration(buffer.duration);
      } catch { /* Playback and native seeking work even if CORS/codec blocks waveform decoding. */ }
      finally { if (context && context.state !== 'closed') void context.close(); }
    }
    void decode();
    return () => {
      cancelled = true;
      controller.abort();
      if (context && context.state !== 'closed') void context.close();
    };
  }, [src]);

  async function toggle() {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) { element.pause(); return; }
    setError('');
    try { await element.play(); }
    catch { setError('Не удалось воспроизвести. Попробуйте ещё раз.'); }
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    if (audio.current) audio.current.playbackRate = next;
    setRate(next);
  }

  return <div className="chat-audio" data-direction={outgoing ? 'outgoing' : 'incoming'}>
    <audio ref={audio} src={src} preload="metadata"
      onLoadedMetadata={event => {
        if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
      }}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
      onError={() => setError('Запись недоступна. Попробуйте открыть её позже.')} />
    <button type="button" className="chat-audio-toggle"
      aria-label={playing ? 'Приостановить голосовое сообщение' : 'Воспроизвести голосовое сообщение'}
      onClick={() => void toggle()}>
      <span className="chat-audio-play-ring" aria-hidden="true">
        {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
      </span>
    </button>
    <div className="chat-audio-body">
      <div className="chat-audio-track">
        {peaks.length > 0 && <div className="chat-audio-wave" aria-hidden="true">
          {peaks.map((peak, index) => (
            <span key={index} style={{ height: `${Math.max(16, Math.round(16 + peak * 84))}%` }}
              data-played={duration > 0 && index / peaks.length <= position / duration} />
          ))}
        </div>}
        <input className={peaks.length ? 'chat-audio-seek has-wave' : 'chat-audio-seek'}
          type="range" aria-label="Позиция голосового сообщения"
          aria-valuetext={`${time(position)} из ${time(duration)}`}
          min={0} max={duration || 1} step={0.1} value={Math.min(position, duration || 1)}
          disabled={!duration} onChange={event => {
            const next = Number(event.target.value);
            if (audio.current) audio.current.currentTime = next;
            setPosition(next);
          }} />
      </div>
      <div className="chat-audio-footer">
        <span className="chat-audio-time">{time(playing || position > 0 ? position : duration)}</span>
        <button type="button" className="chat-audio-speed"
          aria-label={`Скорость воспроизведения ${rate}×. Изменить скорость`}
          onClick={cycleRate}>{rate}×</button>
      </div>
    </div>
    {error && <p role="alert" className="chat-audio-error">{error}</p>}
  </div>;
}
