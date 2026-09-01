// Web Audio API Sound Synthesizer & Player for TTRPG Visual Player

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientAudioElement: HTMLAudioElement | null = null;
  private currentAmbientUrl: string = '';

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Synthesize rich sound effects procedurally without needing external mp3 files
  public playSynth(preset: string) {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      switch (preset) {
        case 'thunder': {
          // Low rumble + noise burst
          const bufferSize = ctx.sampleRate * 2.5;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(280, now);
          filter.frequency.exponentialRampToValueAtTime(40, now + 2.5);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.8, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          break;
        }

        case 'sword_clash': {
          // High metallic ping + noise burst
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'triangle';
          osc2.type = 'sawtooth';

          osc1.frequency.setValueAtTime(1400, now);
          osc1.frequency.exponentialRampToValueAtTime(400, now + 0.3);
          osc2.frequency.setValueAtTime(2200, now);
          osc2.frequency.exponentialRampToValueAtTime(300, now + 0.3);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.6);
          osc2.stop(now + 0.6);
          break;
        }

        case 'magic_spell': {
          // Chime arpeggio / ethereal shimmer
          const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            g.gain.setValueAtTime(0, now);
            g.gain.setValueAtTime(0.25, now + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.2);

            osc.connect(g);
            g.connect(ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 1.2);
          });
          break;
        }

        case 'monster_roar': {
          // Deep low sawtooth with FM modulation
          const osc = ctx.createOscillator();
          const mod = ctx.createOscillator();
          const modGain = ctx.createGain();
          const masterGain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.linearRampToValueAtTime(65, now + 1.2);

          mod.type = 'sine';
          mod.frequency.setValueAtTime(25, now);
          modGain.gain.setValueAtTime(45, now);

          mod.connect(modGain);
          modGain.connect(osc.frequency);

          masterGain.gain.setValueAtTime(0.01, now);
          masterGain.gain.linearRampToValueAtTime(0.6, now + 0.2);
          masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

          osc.connect(masterGain);
          masterGain.connect(ctx.destination);

          osc.start(now);
          mod.start(now);
          osc.stop(now + 1.4);
          mod.stop(now + 1.4);
          break;
        }

        case 'door_creak': {
          // Low squeaky pitch bend
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(240, now + 0.4);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.9);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.0);
          break;
        }

        case 'church_bell': {
          // Rich bell overtone
          const freqs = [330, 660, 990, 1400];
          freqs.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            g.gain.setValueAtTime(0.35 / (index + 1), now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

            osc.connect(g);
            g.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 3.0);
          });
          break;
        }

        case 'fanfare_victory': {
          // Major chord fanfare
          const notes = [440, 554.37, 659.25, 880];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);

            g.gain.setValueAtTime(0, now);
            g.gain.setValueAtTime(0.3, now + idx * 0.15);
            g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 1.5);

            osc.connect(g);
            g.connect(ctx.destination);

            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + 1.5);
          });
          break;
        }

        case 'heartbeat': {
          // Double thump
          [0, 0.2].forEach((offset) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(75, now + offset);
            osc.frequency.exponentialRampToValueAtTime(30, now + offset + 0.15);

            g.gain.setValueAtTime(0.6, now + offset);
            g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

            osc.connect(g);
            g.connect(ctx.destination);

            osc.start(now + offset);
            osc.stop(now + offset + 0.18);
          });
          break;
        }

        default:
          console.warn('Unknown synth preset:', preset);
      }
    } catch (e) {
      console.error('Error playing synth sound:', e);
    }
  }

  // Play custom audio file / URL
  public playAudioUrl(url: string, volume: number = 0.8) {
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch((err) => console.warn('Audio play error:', err));
    } catch (e) {
      console.error('Audio play error:', e);
    }
  }

  // Manage looping ambient audio
  public setAmbient(url: string, playing: boolean, volume: number = 0.5) {
    try {
      if (!url || !playing) {
        if (this.ambientAudioElement) {
          this.ambientAudioElement.pause();
          this.ambientAudioElement = null;
          this.currentAmbientUrl = '';
        }
        return;
      }

      if (this.currentAmbientUrl !== url || !this.ambientAudioElement) {
        if (this.ambientAudioElement) {
          this.ambientAudioElement.pause();
        }
        this.ambientAudioElement = new Audio(url);
        this.ambientAudioElement.loop = true;
        this.currentAmbientUrl = url;
      }

      this.ambientAudioElement.volume = Math.max(0, Math.min(1, volume));
      this.ambientAudioElement.play().catch((err) => console.warn('Ambient play failed:', err));
    } catch (e) {
      console.error('Ambient audio error:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
