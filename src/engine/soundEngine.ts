// ==========================================
// 賽馬現場音效合成引擎 (Web Audio API Sound Engine)
// 100% 瀏覽器原生合成，無須加載任何外部 MP3/WAV，零延遲且永不遺失資源
// ==========================================

class RaceSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private crowdNode: AudioNode | null = null;
  private crowdGain: GainNode | null = null;
  private hoovesGain: GainNode | null = null;
  private hoovesInterval: number | null = null;

  constructor() {
    // 預設檢查 localStorage 靜音狀態
    if (typeof window !== 'undefined' && window.localStorage) {
      this.isMuted = window.localStorage.getItem('WP10_SOUND_MUTED') === 'true';
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('WP10_SOUND_MUTED', muted ? 'true' : 'false');
    }
    if (muted) {
      this.stopAmbientSounds();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // 1. 出閘銅鐘響聲 (Starting Gate Bell Chime)
  public playGateBell() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08); // 快速跳音
    osc.frequency.setValueAtTime(880, t + 0.12);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.6);

    // 第二重金屬泛音鐘聲
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, t);
    gain2.gain.setValueAtTime(0.3, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.8);
  }

  // 2. 騎師催策開鞭聲 (Jockey Whip Swish)
  public playWhip() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // 3. 馬蹄疾馳連綿步音 (Galloping Hooves Sound Loop)
  public startHooves(speedFactor: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (this.hoovesInterval) {
      clearInterval(this.hoovesInterval);
    }

    const intervalMs = Math.max(90, Math.round(140 / speedFactor));
    this.hoovesInterval = window.setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      this.playSingleHoofBeat();
    }, intervalMs);
  }

  private playSingleHoofBeat() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110 + Math.random() * 30, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);

    gain.gain.setValueAtTime(0.12 + Math.random() * 0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  // 4. 現場觀眾歡呼與吶喊 (Dynamic Crowd Atmosphere)
  public startCrowd(initialIntensity: number = 0.2) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || this.crowdGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02; // Brown/pink noise
      lastOut = data[i];
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.value = Math.min(0.35, Math.max(0.02, initialIntensity * 0.3));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();

    this.crowdNode = noise;
    this.crowdGain = gain;
  }

  public updateCrowd(intensity: number) {
    if (!this.crowdGain || !this.ctx) return;
    const targetGain = Math.min(0.45, Math.max(0.02, intensity * 0.4));
    this.crowdGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
  }

  // 5. 終點奪冠慶祝號角 (Victory Fanfare)
  public playFinishFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      const startTime = t + idx * 0.12;
      const duration = idx === notes.length - 1 ? 0.8 : 0.2;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  public stopAmbientSounds() {
    if (this.hoovesInterval) {
      clearInterval(this.hoovesInterval);
      this.hoovesInterval = null;
    }
    if (this.crowdNode) {
      try {
        (this.crowdNode as AudioScheduledSourceNode).stop();
      } catch (_) {}
      this.crowdNode.disconnect();
      this.crowdNode = null;
    }
    if (this.crowdGain) {
      this.crowdGain.disconnect();
      this.crowdGain = null;
    }
  }
}

export const raceSoundEngine = new RaceSoundEngine();
