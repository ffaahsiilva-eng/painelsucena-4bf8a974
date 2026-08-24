import React from "react";

export interface AnimatedEmojiDef {
  id: string;
  label: string;
  emoji: string;
  category: string;
}

export const ANIMATED_EMOJIS: AnimatedEmojiDef[] = [
  // Clima
  { id: "rain", label: "Chuva", emoji: "🌧️", category: "Clima" },
  { id: "thunder", label: "Tempestade", emoji: "⛈️", category: "Clima" },
  { id: "snow", label: "Neve", emoji: "❄️", category: "Clima" },
  { id: "sun", label: "Sol", emoji: "☀️", category: "Clima" },
  { id: "rainbow", label: "Arco-íris", emoji: "🌈", category: "Clima" },
  { id: "tornado", label: "Tornado", emoji: "🌪️", category: "Clima" },
  { id: "cloud", label: "Nuvem", emoji: "☁️", category: "Clima" },
  { id: "fog", label: "Neblina", emoji: "🌫️", category: "Clima" },
  // Fogo & Energia
  { id: "fire", label: "Fogo", emoji: "🔥", category: "Energia" },
  { id: "lightning", label: "Raio", emoji: "⚡", category: "Energia" },
  { id: "explosion", label: "Explosão", emoji: "💥", category: "Energia" },
  { id: "comet", label: "Cometa", emoji: "☄️", category: "Energia" },
  { id: "dizzy", label: "Tonto", emoji: "💫", category: "Energia" },
  { id: "collision", label: "Colisão", emoji: "💢", category: "Energia" },
  // Sentimentos
  { id: "hearts", label: "Corações", emoji: "💖", category: "Sentimentos" },
  { id: "sparkles", label: "Brilhos", emoji: "✨", category: "Sentimentos" },
  { id: "party", label: "Festa", emoji: "🎉", category: "Sentimentos" },
  { id: "clap", label: "Palmas", emoji: "👏", category: "Sentimentos" },
  { id: "rocket", label: "Foguete", emoji: "🚀", category: "Sentimentos" },
  { id: "100", label: "100", emoji: "💯", category: "Sentimentos" },
  { id: "crown", label: "Coroa", emoji: "👑", category: "Sentimentos" },
  { id: "gem", label: "Diamante", emoji: "💎", category: "Sentimentos" },
  { id: "trophy", label: "Troféu", emoji: "🏆", category: "Sentimentos" },
  { id: "gift", label: "Presente", emoji: "🎁", category: "Sentimentos" },
  { id: "confetti", label: "Confete", emoji: "🎊", category: "Sentimentos" },
  { id: "kiss", label: "Beijo", emoji: "💋", category: "Sentimentos" },
  { id: "cry", label: "Chorando", emoji: "😭", category: "Sentimentos" },
  { id: "rage", label: "Raiva", emoji: "🤬", category: "Sentimentos" },
  // Natureza
  { id: "leaf", label: "Folha", emoji: "🍃", category: "Natureza" },
  { id: "wave", label: "Onda", emoji: "🌊", category: "Natureza" },
  { id: "star", label: "Estrela", emoji: "⭐", category: "Natureza" },
  { id: "flower", label: "Flor", emoji: "🌸", category: "Natureza" },
  { id: "mushroom", label: "Cogumelo", emoji: "🍄", category: "Natureza" },
  { id: "butterfly", label: "Borboleta", emoji: "🦋", category: "Natureza" },
  { id: "cherry", label: "Cereja", emoji: "🍒", category: "Natureza" },
  // Rostos
  { id: "skull", label: "Caveira", emoji: "💀", category: "Rostos" },
  { id: "ghost", label: "Fantasma", emoji: "👻", category: "Rostos" },
  { id: "alien", label: "Alien", emoji: "👽", category: "Rostos" },
  { id: "robot", label: "Robô", emoji: "🤖", category: "Rostos" },
  { id: "clown", label: "Palhaço", emoji: "🤡", category: "Rostos" },
  { id: "eyes", label: "Olhos", emoji: "👀", category: "Rostos" },
  { id: "monocle", label: "Monóculo", emoji: "🧐", category: "Rostos" },
  { id: "sunglasses", label: "Óculos", emoji: "😎", category: "Rostos" },
  // Objetos
  { id: "bell", label: "Sino", emoji: "🔔", category: "Objetos" },
  { id: "megaphone", label: "Megafone", emoji: "📣", category: "Objetos" },
  { id: "siren", label: "Sirene", emoji: "🚨", category: "Objetos" },
  { id: "money", label: "Dinheiro", emoji: "💰", category: "Objetos" },
  { id: "bomb", label: "Bomba", emoji: "💣", category: "Objetos" },
  { id: "guitar", label: "Guitarra", emoji: "🎸", category: "Objetos" },
  { id: "dice", label: "Dado", emoji: "🎲", category: "Objetos" },
];

const ANIMATION_MAP: Record<string, React.CSSProperties> = {
  rain: { animation: "ae-rain 1.2s ease-in infinite", display: "inline-block" },
  thunder: { animation: "ae-thunder 2s ease-in-out infinite", display: "inline-block" },
  snow: { animation: "ae-snow 3s linear infinite", display: "inline-block" },
  sun: { animation: "ae-spin-slow 4s linear infinite", display: "inline-block" },
  rainbow: { animation: "ae-wobble 2s ease-in-out infinite", display: "inline-block" },
  tornado: { animation: "ae-spin-fast 1s linear infinite", display: "inline-block" },
  cloud: { animation: "ae-wobble 3s ease-in-out infinite", display: "inline-block" },
  fog: { animation: "ae-twinkle 3s ease-in-out infinite", display: "inline-block" },
  fire: { animation: "ae-fire 0.6s ease-in-out infinite alternate", display: "inline-block" },
  lightning: { animation: "ae-flash 1.5s ease-in-out infinite", display: "inline-block" },
  explosion: { animation: "ae-pulse-big 0.8s ease-in-out infinite", display: "inline-block" },
  comet: { animation: "ae-comet 2s ease-in-out infinite", display: "inline-block" },
  dizzy: { animation: "ae-spin-slow 2s ease-in-out infinite", display: "inline-block" },
  collision: { animation: "ae-pulse-big 0.6s ease-in-out infinite", display: "inline-block" },
  hearts: { animation: "ae-heartbeat 1s ease-in-out infinite", display: "inline-block" },
  sparkles: { animation: "ae-twinkle 1.5s ease-in-out infinite", display: "inline-block" },
  party: { animation: "ae-bounce 0.6s ease-in-out infinite", display: "inline-block" },
  clap: { animation: "ae-clap 0.8s ease-in-out infinite", display: "inline-block" },
  rocket: { animation: "ae-rocket 1.5s ease-in-out infinite", display: "inline-block" },
  "100": { animation: "ae-pulse-big 1s ease-in-out infinite", display: "inline-block" },
  crown: { animation: "ae-wobble 2s ease-in-out infinite", display: "inline-block" },
  gem: { animation: "ae-twinkle 1.2s ease-in-out infinite", display: "inline-block" },
  trophy: { animation: "ae-bounce 1s ease-in-out infinite", display: "inline-block" },
  gift: { animation: "ae-bounce 1.5s ease-in-out infinite", display: "inline-block" },
  confetti: { animation: "ae-rain 1s ease-in infinite", display: "inline-block" },
  kiss: { animation: "ae-heartbeat 1.2s ease-in-out infinite", display: "inline-block" },
  cry: { animation: "ae-rain 2s ease-in infinite", display: "inline-block" },
  rage: { animation: "ae-fire 0.4s ease-in-out infinite alternate", display: "inline-block" },
  leaf: { animation: "ae-leaf 3s ease-in-out infinite", display: "inline-block" },
  wave: { animation: "ae-wobble 1.5s ease-in-out infinite", display: "inline-block" },
  star: { animation: "ae-twinkle 2s ease-in-out infinite", display: "inline-block" },
  flower: { animation: "ae-bloom 2s ease-in-out infinite", display: "inline-block" },
  mushroom: { animation: "ae-bounce 2s ease-in-out infinite", display: "inline-block" },
  butterfly: { animation: "ae-leaf 2.5s ease-in-out infinite", display: "inline-block" },
  cherry: { animation: "ae-bounce 1.5s ease-in-out infinite", display: "inline-block" },
  skull: { animation: "ae-flash 2s ease-in-out infinite", display: "inline-block" },
  ghost: { animation: "ae-snow 3s ease-in-out infinite", display: "inline-block" },
  alien: { animation: "ae-twinkle 2s ease-in-out infinite", display: "inline-block" },
  robot: { animation: "ae-clap 1.5s ease-in-out infinite", display: "inline-block" },
  clown: { animation: "ae-wobble 1.5s ease-in-out infinite", display: "inline-block" },
  eyes: { animation: "ae-flash 2.5s ease-in-out infinite", display: "inline-block" },
  monocle: { animation: "ae-wobble 3s ease-in-out infinite", display: "inline-block" },
  sunglasses: { animation: "ae-pulse-big 2s ease-in-out infinite", display: "inline-block" },
  bell: { animation: "ae-clap 0.8s ease-in-out infinite", display: "inline-block" },
  megaphone: { animation: "ae-pulse-big 1s ease-in-out infinite", display: "inline-block" },
  siren: { animation: "ae-flash 0.8s ease-in-out infinite", display: "inline-block" },
  money: { animation: "ae-twinkle 1.5s ease-in-out infinite", display: "inline-block" },
  bomb: { animation: "ae-fire 0.5s ease-in-out infinite alternate", display: "inline-block" },
  guitar: { animation: "ae-wobble 1s ease-in-out infinite", display: "inline-block" },
  dice: { animation: "ae-spin-slow 3s linear infinite", display: "inline-block" },
};

export function AnimatedEmoji({ id, size = "1.25em" }: { id: string; size?: string }) {
  const def = ANIMATED_EMOJIS.find((e) => e.id === id);
  if (!def) return <span>{`:${id}:`}</span>;

  const style: React.CSSProperties = {
    ...(ANIMATION_MAP[id] || {}),
    fontSize: size,
    lineHeight: 1,
    verticalAlign: "middle",
  };

  return (
    <span className="animated-emoji" style={style} title={def.label} role="img" aria-label={def.label}>
      {def.emoji}
    </span>
  );
}
