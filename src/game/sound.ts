// Advanced Procedural Sound Manager for 3D Cyber Battle Arena
// Built with Web Audio API: Zero external latency, high fidelity, 100% offline-ready

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterVolume: number = 0.85;

  // Ambient drone nodes
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private isAmbientRunning: boolean = false;

  // Cached noise buffer
  private noiseBuffer: AudioBuffer | null = null;

  // Cooldown timers
  private lastFootstepTime: number = 0;
  private lastAttackSoundTime: number = 0;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        // Master gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // SFX gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // Pre-generate noise buffer for whooshes, footsteps, and explosions
        this.generateNoiseBuffer();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  // --- MOVEMENT SOUNDS ---

  /**
   * Footstep audio feedback triggered by walking/running in the game loop
   */
  public playFootstep(pitchVariation: number = 1.0, speedFactor: number = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Throttle footsteps so they don't stutter if game loop ticks quickly
    if (now - this.lastFootstepTime < 0.12) return;
    this.lastFootstepTime = now;

    // 1. Low mechanical tap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    const baseFreq = (75 + Math.random() * 20) * pitchVariation;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    const stepVolume = Math.min(0.22, 0.12 * speedFactor);
    oscGain.gain.setValueAtTime(stepVolume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.09);

    // 2. High-frequency grit/click on the cyber arena surface
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1400 * pitchVariation, now);
      noiseFilter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06 * speedFactor, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.06);
    }
  }

  /**
   * Jump propulsion sound when character leaves the ground
   */
  public playJump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Energy whoosh ramp-up
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(1600, now + 0.15);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);

    // Noise breath
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(600, now);
      nFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.18);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.12, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.22);
    }
  }

  /**
   * Landing impact thud when character touches down
   */
  public playLand(impactSpeed: number = 8) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.16);

    const vol = Math.min(0.35, 0.12 + (impactSpeed / 20) * 0.2);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);

    // Dust impact noise puff
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.setValueAtTime(380, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.15, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.16);
    }
  }

  /**
   * Fast evasive dash whoosh with high-tech slipstream sound
   */
  public playDash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Dual-tone frequency glide (slipstream)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.22);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.22);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);

    // High velocity air displacement noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(1600, now);
      nFilter.frequency.exponentialRampToValueAtTime(450, now + 0.24);
      nFilter.Q.setValueAtTime(1.8, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.28, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.26);
    }
  }

  /**
   * Double jump acrobatic energy pulse in mid-air
   */
  public playDoubleJump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.16);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Ground slam / dive kick heavy seismic impact
   */
  public playGroundSlam() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Heavy low seismic boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // Shockwave crunch
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, now);
      filter.frequency.linearRampToValueAtTime(180, now + 0.25);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.35, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.32);
    }
  }

  // --- COMBAT ATTACK SOUNDS ---

  /**
   * Sword/strike attack sound with progressive combo variations
   */
  public playAttack(comboIndex: number = 0, characterId?: string) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    if (now - this.lastAttackSoundTime < 0.08) return;
    this.lastAttackSoundTime = now;

    const isTitan = characterId === 'mecha_titan';
    const isNinja = characterId === 'cyber_ninja';

    // Base frequencies vary by combo step
    let startFreq = 420;
    let endFreq = 90;
    let attackDuration = 0.14;

    if (comboIndex === 1) {
      startFreq = 540;
      endFreq = 120;
      attackDuration = 0.15;
    } else if (comboIndex === 2) {
      // Finisher combo: deeper and more explosive
      startFreq = isTitan ? 280 : 680;
      endFreq = 70;
      attackDuration = 0.22;
    }

    if (isTitan) {
      startFreq *= 0.65;
      endFreq *= 0.65;
    }

    // 1. Blade / Fist whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = comboIndex === 2 ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + attackDuration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isTitan ? 800 : 1800, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + attackDuration);

    const baseVol = comboIndex === 2 ? 0.32 : 0.22;
    gain.gain.setValueAtTime(baseVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + attackDuration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + attackDuration + 0.02);

    // 2. Air-slash friction noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(isNinja ? 2400 : 1600, now);
      nFilter.Q.setValueAtTime(2.5, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(comboIndex === 2 ? 0.22 : 0.15, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + attackDuration * 0.9);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + attackDuration);
    }
  }

  // --- SPECIAL MOVES SOUNDS ---

  /**
   * Special move launch sound (plasma shockwave / energy blast)
   */
  public playSpecial(characterId?: string) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const isTitan = characterId === 'mecha_titan';

    // 1. Heavy rising energy charge
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(isTitan ? 600 : 920, now + 0.22);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.55);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.34, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(2800, now + 0.22);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.58);

    // 2. Sub-bass punch at launch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now + 0.18);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.5);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.setValueAtTime(0.35, now + 0.18);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now + 0.18);
    subOsc.stop(now + 0.52);

    // 3. Plasma sizzle burst
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(1800, now + 0.18);
      nFilter.Q.setValueAtTime(4.0, now + 0.18);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.setValueAtTime(0.2, now + 0.18);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now + 0.18);
      noise.stop(now + 0.48);
    }
  }

  /**
   * Projectile impact or explosive detonation on contact
   */
  public playSpecialExplosion() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Sub-bass detonation thump
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 0.4);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.42);

    // Debris / shockwave noise burst
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.38);
    }
  }

  // --- DAMAGE & DEFENSE SOUNDS ---

  /**
   * Physical hit impact sound
   */
  public playHit(damage: number = 20, isCritical: boolean = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCritical ? 'sawtooth' : 'triangle';
    const startFreq = isCritical ? 240 : 160;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.22);

    const hitVol = Math.min(0.45, 0.25 + (damage / 100) * 0.2);
    gain.gain.setValueAtTime(hitVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);

    // Crunch noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isCritical ? 1200 : 700, now);
      filter.Q.setValueAtTime(1.8, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(isCritical ? 0.3 : 0.18, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.16);
    }
  }

  /**
   * Shield block / deflection sound
   */
  public playBlock() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(3.5, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // --- UI & MATCH STATE ---

  public playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playVictory() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = now + idx * 0.11;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(start);
      osc.stop(start + 0.48);
    });
  }

  public playDefeat() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [329.63, 293.66, 261.63, 220.0];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = now + idx * 0.16;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, start);
      filter.frequency.exponentialRampToValueAtTime(100, start + 0.5);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(start);
      osc.stop(start + 0.52);
    });
  }

  /**
   * Triumphant crystal arpeggio fanfare when unlocking a new Seal / Emblem
   */
  public playSealUnlock() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Harmonic arpeggio: C5, E5, G5, B5, C6, E6 + shimmer
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(start);
      osc.stop(start + 0.92);
    });

    // Sub-bass resonance for grand epic feel
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130.81, now); // C3
    subOsc.frequency.exponentialRampToValueAtTime(65.41, now + 1.2); // C2

    subGain.gain.setValueAtTime(0.28, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now);
    subOsc.stop(now + 1.25);
  }

  /**
   * Phase/Wave start cyber siren and energetic riser
   */
  public playWaveStart(phase: number = 1) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Cyber horn / siren
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    const baseFreq = 220 + (phase * 35);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, now + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  /**
   * Wave clear fanfare - sparkling harmonious chime with heal sound
   */
  public playWaveClear() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chords.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.001, now + idx * 0.09);
      gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.09 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.7);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.75);
    });
  }

  // --- ARENA AMBIENT DRONE ---

  /**
   * Subtle ambient synth drone for the arena atmosphere
   */
  public startAmbientDrone() {
    if (this.isAmbientRunning || this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.001, now);
      this.ambientGain.gain.linearRampToValueAtTime(0.05, now + 1.5);

      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(180, now);

      // Dual detuned oscillators for a thick, dark sci-fi arena presence
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = 'sawtooth';
      this.ambientOsc1.frequency.setValueAtTime(55, now); // A1 note

      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.setValueAtTime(110.5, now); // Slightly detuned octave

      // Gentle LFO modulating the filter frequency
      this.ambientLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.ambientLfo.frequency.setValueAtTime(0.2, now); // 0.2 Hz slow sweep
      lfoGain.gain.setValueAtTime(40, now);

      this.ambientLfo.connect(lfoGain);
      lfoGain.connect(this.ambientFilter.frequency);

      this.ambientOsc1.connect(this.ambientFilter);
      this.ambientOsc2.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.ambientOsc1.start(now);
      this.ambientOsc2.start(now);
      this.ambientLfo.start(now);

      this.isAmbientRunning = true;
    } catch {
      // AudioContext might be waiting for user gesture
    }
  }

  public stopAmbientDrone() {
    if (!this.isAmbientRunning || !this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    try {
      this.ambientGain.gain.linearRampToValueAtTime(0.001, now + 0.4);
      setTimeout(() => {
        try {
          this.ambientOsc1?.stop();
          this.ambientOsc2?.stop();
          this.ambientLfo?.stop();
          this.ambientOsc1?.disconnect();
          this.ambientOsc2?.disconnect();
          this.ambientLfo?.disconnect();
          this.ambientFilter?.disconnect();
          this.ambientGain?.disconnect();
        } catch {}
        this.ambientOsc1 = null;
        this.ambientOsc2 = null;
        this.ambientLfo = null;
        this.ambientFilter = null;
        this.ambientGain = null;
        this.isAmbientRunning = false;
      }, 450);
    } catch {
      this.isAmbientRunning = false;
    }
  }
}

export const soundManager = new SoundSystem();
