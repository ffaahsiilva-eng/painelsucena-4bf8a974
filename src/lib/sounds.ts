// iOS-style notification sound utility
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Generate iOS-style "tri-tone" notification sound
export const playIOSNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required for some browsers)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // iOS tri-tone frequencies (similar to iMessage)
    const frequencies = [1046.50, 1318.51, 1567.98]; // C6, E6, G6
    const noteDuration = 0.08;
    const noteGap = 0.02;
    
    frequencies.forEach((freq, index) => {
      const startTime = now + index * (noteDuration + noteGap);
      
      // Oscillator for the tone
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, startTime);
      
      // Gain envelope for smooth attack/decay
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    });
  } catch (error) {
    console.warn("Could not play notification sound:", error);
  }
};

// Alternative: Play a pre-recorded sound file
export const playSoundFile = (soundPath: string) => {
  try {
    const audio = new Audio(soundPath);
    audio.volume = 0.5;
    audio.play().catch((error) => {
      console.warn("Could not play sound file:", error);
    });
  } catch (error) {
    console.warn("Could not create audio:", error);
  }
};
