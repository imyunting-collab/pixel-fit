// 8-bit 小音效（WebAudio 方波），只有在設定中開啟音效才會播放；預設靜音。
let ctx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freqs: number[], step = 0.08, type: OscillatorType = 'square', vol = 0.05) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  freqs.forEach((f, i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(vol, t0 + i * step);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * step);
    o.connect(g).connect(a.destination);
    o.start(t0 + i * step);
    o.stop(t0 + (i + 1) * step + 0.02);
  });
}

export const sfx = {
  tap: () => tone([660], 0.04, 'square', 0.03),
  success: () => tone([523, 659, 784], 0.07),
  levelUp: () => tone([523, 659, 784, 1047, 784, 1047], 0.09),
  badge: () => tone([784, 988, 1175, 1568], 0.08, 'triangle', 0.07),
  error: () => tone([220, 165], 0.12, 'square', 0.04),
};
