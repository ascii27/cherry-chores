/** Play a synthesized coin-ding sound using the Web Audio API. */
export function playCoinSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    function playTone(freq: number, gainPeak: number, startTime: number, duration: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, startTime + duration);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    const now = ctx.currentTime;
    playTone(1318, 0.35, now, 0.4);          // E6 — bright coin fundamental
    playTone(1976, 0.18, now, 0.25);         // B6 — metallic overtone
    playTone(1318, 0.20, now + 0.07, 0.3);  // echo ping
    setTimeout(() => ctx.close(), 700);
  } catch {
    // AudioContext unavailable — fail silently
  }
}
