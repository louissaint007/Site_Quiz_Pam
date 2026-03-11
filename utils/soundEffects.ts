// utils/soundEffects.ts

class SoundManager {
    private audioCtx: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 1.0;

    constructor() {
        this.loadSettings();
    }

    public loadSettings() {
        try {
            const storedSoundStr = localStorage.getItem('quizpam_sound_settings');
            if (storedSoundStr) {
                const settings = JSON.parse(storedSoundStr);
                if (settings.enabled !== undefined) this.enabled = settings.enabled;
                if (settings.volume !== undefined) this.volume = settings.volume;
            }
        } catch (e) {
            console.error('Failed to load sound settings', e);
        }
    }

    private saveSettings() {
        try {
            localStorage.setItem('quizpam_sound_settings', JSON.stringify({
                enabled: this.enabled,
                volume: this.volume
            }));
        } catch (e) {
            // ignore
        }
    }

    public getSettings() {
        return { enabled: this.enabled, volume: this.volume };
    }

    public toggleEnabled() {
        this.enabled = !this.enabled;
        this.saveSettings();
        if (this.enabled && !this.audioCtx) this.init();
        return this.enabled;
    }

    public setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
        this.saveSettings();
        return this.volume;
    }

    // Call this explicitly on FIRST USER CLICK globally in App.tsx
    public init() {
        if (!this.enabled) return;

        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        } catch (e) {
            console.error("AudioContext init blocked by browser:", e);
        }
    }

    public playPop() {
        if (!this.enabled) return;
        this.init();
        if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.05);

        gainNode.gain.setValueAtTime(0.5 * this.volume, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.05);
    }

    public playSuccess() {
        if (!this.enabled) return;
        this.init();
        if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

        this.playTone(523.25, 'sine', 0, 0.1);
        this.playTone(659.25, 'sine', 0.1, 0.2);
        this.playTone(783.99, 'sine', 0.2, 0.4);
    }

    public playError() {
        if (!this.enabled) return;
        this.init();
        if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

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
        gainNode.gain.linearRampToValueAtTime(0.3 * this.volume, this.audioCtx.currentTime + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + delay + duration);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start(this.audioCtx.currentTime + delay);
        osc.stop(this.audioCtx.currentTime + delay + duration);
    }
}

export const sounds = new SoundManager();
