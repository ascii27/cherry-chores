/** Play a cash-register "ka-ching" sound using the Web Audio API. */
export function playCoinSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // "ka" — short percussive mechanical click (triangle wave sweep down)
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.type = 'triangle';
    click.frequency.setValueAtTime(200, now);
    click.frequency.exponentialRampToValueAtTime(80, now + 0.045);
    clickGain.gain.setValueAtTime(0.45, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    click.start(now);
    click.stop(now + 0.05);

    // "ching" — bright metallic bell, no pitch slide
    function bell(freq: number, gainPeak: number, start: number, decay: number) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gainPeak, start + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, start + decay);
      osc.start(start);
      osc.stop(start + decay);
    }

    const ching = now + 0.03;
    bell(2637, 0.40, ching, 0.55);        // E7 — primary bell tone
    bell(3951, 0.18, ching, 0.40);        // B7 — bright overtone
    bell(2637, 0.12, ching + 0.08, 0.35); // slight echo of fundamental

    setTimeout(() => ctx.close(), 900);
  } catch {
    // AudioContext unavailable — fail silently
  }
}
