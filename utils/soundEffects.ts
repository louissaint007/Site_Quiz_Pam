// utils/soundEffects.ts

class SoundManager {
    private audioCtx: AudioContext | null = null;
    private enabled: boolean = true;

    private init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    // A soft, satisfying "pop" sound for Mò Kwaze letter touches and Gomoku piece placements
    public playPop() {
        if (!this.enabled) return;
        this.init();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'sine';

        // Quick pitch envelope
        osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.05);

        // Quick volume envelope
        gainNode.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.05);
    }

    // A bright, happy "ding" for Quiz correct answers
    public playSuccess() {
        if (!this.enabled) return;
        this.init();
        if (!this.audioCtx) return;

        this.playTone(523.25, 'sine', 0, 0.1); // C5
        this.playTone(659.25, 'sine', 0.1, 0.2); // E5
        this.playTone(783.99, 'sine', 0.2, 0.4); // G5
    }

    // A dull "bloop" for Quiz incorrect answers
    public playError() {
        if (!this.enabled) return;
        this.init();
        if (!this.audioCtx) return;

        this.playTone(300, 'triangle', 0, 0.15);
        this.playTone(250, 'triangle', 0.15, 0.3);
    }

    private playTone(freq: number, type: OscillatorType, delay: number, duration: number) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + delay);

        gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + delay + duration);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start(this.audioCtx.currentTime + delay);
        osc.stop(this.audioCtx.currentTime + delay + duration);
    }
}

export const sounds = new SoundManager();
