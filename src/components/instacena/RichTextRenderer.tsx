import React from "react";
import { AnimatedEmoji, ANIMATED_EMOJIS } from "./AnimatedEmoji";

/**
 * Parses custom formatting tags in post content and renders them as styled spans.
 * Supported formats:
 * - **text** → bold
 * - _text_ → italic
 * - __text__ → underline
 * - {color:yellow}text{/color} → highlighted text
 * - {glow}text{/glow} → glowing text
 * - {font:serif}text{/font} → font style
 * - :emoji_id: → animated emoji
 */

const COLOR_BG: Record<string, string> = {
  yellow: "rgba(250, 204, 21, 0.3)",
  green: "rgba(74, 222, 128, 0.3)",
  blue: "rgba(96, 165, 250, 0.3)",
  pink: "rgba(244, 114, 182, 0.3)",
  purple: "rgba(192, 132, 252, 0.3)",
  orange: "rgba(251, 146, 60, 0.3)",
};

const FONT_INLINE: Record<string, string> = {
  serif: "serif",
  mono: "monospace",
  cursive: "serif",
  normal: "",
};

const GLOW_CSS: Record<string, { color: string; shadow: string }> = {
  gold: { color: "#fbbf24", shadow: "0 0 8px #fbbf2499, 0 0 16px #fbbf244d" },
  blue: { color: "#3b82f6", shadow: "0 0 8px #3b82f699, 0 0 16px #3b82f64d" },
  green: { color: "#22c55e", shadow: "0 0 8px #22c55e99, 0 0 16px #22c55e4d" },
  pink: { color: "#ec4899", shadow: "0 0 8px #ec489999, 0 0 16px #ec48994d" },
  purple: { color: "#a855f7", shadow: "0 0 8px #a855f799, 0 0 16px #a855f74d" },
  red: { color: "#ef4444", shadow: "0 0 8px #ef444499, 0 0 16px #ef44444d" },
  cyan: { color: "#06b6d4", shadow: "0 0 8px #06b6d499, 0 0 16px #06b6d44d" },
  orange: { color: "#f97316", shadow: "0 0 8px #f9731699, 0 0 16px #f973164d" },
  white: { color: "#ffffff", shadow: "0 0 8px #ffffff99, 0 0 16px #ffffff4d" },
  black: { color: "#000000", shadow: "0 0 8px #00000099, 0 0 16px #0000004d" },
};

interface RichSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  glow?: boolean;
  glowColor?: string;
  font?: string;
  fx?: string;
}

function parseRichText(input: string): RichSegment[] {
  const segments: RichSegment[] = [];

  // IMPORTANT: __underline__ must come BEFORE _italic_ to avoid false matches
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|_(.+?)_|{color:(\w+)}(.+?){\/color}|{glow:(\w+)}(.+?){\/glow}|{glow}(.+?){\/glow}|{fx:(\w+)}(.+?){\/fx}|{font:(\w+)}(.+?){\/font})/gs;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index) });
    }

    if (match[2] !== undefined) {
      // **bold**
      segments.push({ text: match[2], bold: true });
    } else if (match[3] !== undefined) {
      // __underline__ (now checked before _italic_)
      segments.push({ text: match[3], underline: true });
    } else if (match[4] !== undefined) {
      // _italic_
      segments.push({ text: match[4], italic: true });
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // {color:x}text{/color}
      segments.push({ text: match[6], color: match[5] });
    } else if (match[7] !== undefined && match[8] !== undefined) {
      // {glow:color}text{/glow}
      segments.push({ text: match[8], glow: true, glowColor: match[7] });
    } else if (match[9] !== undefined) {
      // {glow}text{/glow} (legacy, default gold)
      segments.push({ text: match[9], glow: true });
    } else if (match[10] !== undefined && match[11] !== undefined) {
      // {fx:type}text{/fx}
      segments.push({ text: match[11], fx: match[10] });
    } else if (match[12] !== undefined && match[13] !== undefined) {
      // {font:x}text{/font}
      segments.push({ text: match[13], font: match[12] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ text: input });
  }

  return segments;
}

/** Extracts a TikTok video ID from a URL, returns the embed URL or null */
function getTikTokEmbedUrl(url: string): string | null {
  const longMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (longMatch) return `https://www.tiktok.com/embed/v2/${longMatch[1]}`;
  const shortMatch = url.match(/(?:vm\.tiktok\.com|tiktok\.com\/t)\/([a-zA-Z0-9]+)/);
  if (shortMatch) return `https://www.tiktok.com/embed/v2/${shortMatch[1]}`;
  return null;
}

function TikTokEmbed({ url }: { url: string }) {
  const embedUrl = getTikTokEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <div className="my-2 flex justify-center">
      <iframe
        src={embedUrl}
        className="rounded-lg border border-border"
        style={{ width: 325, height: 578, maxWidth: "100%" }}
        allowFullScreen
        allow="encrypted-media"
        sandbox="allow-scripts allow-same-origin allow-popups"
        title="TikTok Video"
      />
    </div>
  );
}

function isTikTokUrl(url: string): boolean {
  return /(?:tiktok\.com\/@[^/]+\/video\/\d+|vm\.tiktok\.com\/|tiktok\.com\/t\/)/.test(url);
}

/** Splits text by URLs and :emoji_id: patterns and returns mixed React nodes */
function renderWithLinksAndEmojis(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s<>{}()\[\]"']+)/g;
  const parts = text.split(urlRegex);

  const nodes: React.ReactNode[] = [];
  parts.forEach((part, idx) => {
    if (urlRegex.test(part)) {
      if (isTikTokUrl(part)) {
        nodes.push(<TikTokEmbed key={`tiktok-${idx}`} url={part} />);
      } else {
        nodes.push(
          <a
            key={`link-${idx}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all"
          >
            {part}
          </a>
        );
      }
    } else {
      const emojiNodes = renderWithAnimatedEmojis(part);
      nodes.push(...emojiNodes);
    }
  });

  return nodes;
}

/** Splits text by :emoji_id: patterns and returns mixed React nodes */
function renderWithAnimatedEmojis(text: string): React.ReactNode[] {
  const emojiIds = ANIMATED_EMOJIS.map((e) => e.id).join("|");
  const emojiRegex = new RegExp(`:(?:${emojiIds}):`, "g");

  if (!emojiRegex.test(text)) return [text];

  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  emojiRegex.lastIndex = 0;

  while ((m = emojiRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(text.slice(lastIdx, m.index));
    }
    const id = m[0].slice(1, -1); // remove colons
    nodes.push(<AnimatedEmoji key={`ae-${m.index}`} id={id} />);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }
  return nodes;
}

function renderSegmentStyle(seg: RichSegment): { classes: string[]; styles: any } {
  const classes: string[] = [];
  const styles: any = {};

  if (seg.bold) classes.push("font-bold");
  if (seg.italic) classes.push("italic");
  if (seg.underline) classes.push("underline underline-offset-2");
  if (seg.color && COLOR_BG[seg.color]) {
    styles.backgroundColor = COLOR_BG[seg.color];
    styles.padding = "0 2px";
    styles.borderRadius = "3px";
  }
  if (seg.font && FONT_INLINE[seg.font]) {
    styles.fontFamily = FONT_INLINE[seg.font];
    if (seg.font === "cursive") styles.fontStyle = "italic";
  }
  if (seg.glow) {
    const glowDef = seg.glowColor ? GLOW_CSS[seg.glowColor] : null;
    classes.push("animate-pulse");
    styles.textShadow = glowDef?.shadow || "0 0 8px hsl(var(--primary) / 0.6), 0 0 16px hsl(var(--primary) / 0.3)";
    styles.color = glowDef?.color || "hsl(var(--primary))";
  }
  if (seg.fx) {
    switch (seg.fx) {
      case "sparkle":
        styles.color = "#fbbf24";
        styles.animation = "sparkle-text 2s ease-in-out infinite";
        break;
      case "rainbow":
        styles.animation = "rainbow-shift 3s linear infinite";
        break;
      case "neon":
        styles.color = "#06b6d4";
        styles.animation = "neon-flicker 3s ease-in-out infinite";
        break;
      case "gradient":
        styles.background = "linear-gradient(90deg, #3b82f6, #a855f7, #ec4899)";
        styles.WebkitBackgroundClip = "text";
        styles.WebkitTextFillColor = "transparent";
        (styles as any).backgroundClip = "text";
        break;
    }
  }
  return { classes, styles };
}

function renderRich(content: string, keyPrefix = "r", depth = 0): React.ReactNode[] {
  const hasRichText = /(\*\*|_{1,2}|{color:|{glow|{font:|{fx:)/.test(content);
  if (!hasRichText) {
    return renderWithLinksAndEmojis(content);
  }

  const segments = parseRichText(content);

  // Safety: if parsing produced a single unstyled segment identical to input, stop recursing
  // (prevents infinite loops on malformed markup like stray ** or { tokens)
  const noProgress =
    segments.length === 1 &&
    segments[0].text === content &&
    !segments[0].bold && !segments[0].italic && !segments[0].underline &&
    !segments[0].color && !segments[0].glow && !segments[0].font && !segments[0].fx;

  if (noProgress || depth > 8) {
    return renderWithLinksAndEmojis(content);
  }

  return segments.map((seg, i) => {
    const { classes, styles } = renderSegmentStyle(seg);
    // Recursively render the inner text so nested formatting works (e.g. **{color:yellow}x{/color}**)
    // Only recurse if the inner text is shorter than the original (made progress) AND has markers
    const innerHasRich = /(\*\*|_{1,2}|{color:|{glow|{font:|{fx:)/.test(seg.text);
    const madeProgress = seg.text.length < content.length;
    const renderedContent = innerHasRich && madeProgress
      ? renderRich(seg.text, `${keyPrefix}-${i}`, depth + 1)
      : renderWithLinksAndEmojis(seg.text);

    if (classes.length === 0 && Object.keys(styles).length === 0) {
      return <React.Fragment key={`${keyPrefix}-${i}`}>{renderedContent}</React.Fragment>;
    }

    return (
      <span key={`${keyPrefix}-${i}`} className={classes.join(" ")} style={styles}>
        {renderedContent}
      </span>
    );
  });
}

/**
 * Cleans up malformed/empty rich-text tokens that would otherwise render as literal text.
 * Examples:
 *   - "{color:yellow}{/color}"  → "" (empty wrapper)
 *   - "**{color:yellow}{/color}Sucena **" → "**Sucena **" then bold renders cleanly
 *   - Orphan unmatched "**" / "{color:x}" without a closing pair → stripped
 */
function sanitizeRichContent(input: string): string {
  let out = input;

  // STEP 1: Iteratively collapse empty wrappers and merge them with the next
  // text chunk. Handles cross-line cases too (e.g. "{font:cursive}\n  Roçagem").
  // Use [\s\S] in classes so we can match across newlines while still excluding
  // brace tokens.
  let pass = 0;
  while (pass++ < 6) {
    const before = out;

    let prev = "";
    while (prev !== out) {
      prev = out;
      // Empty wrapper followed by text (possibly across whitespace/newlines) — apply
      // the wrapper to the next non-tag run.
      out = out.replace(/\{color:(\w+)\}\s*\{\/color\}([^{}]+)/g, "{color:$1}$2{/color}");
      out = out.replace(/\{font:(\w+)\}\s*\{\/font\}([^{}]+)/g, "{font:$1}$2{/font}");
      out = out.replace(/\{fx:(\w+)\}\s*\{\/fx\}([^{}]+)/g, "{fx:$1}$2{/fx}");
      out = out.replace(/\{glow:(\w+)\}\s*\{\/glow\}([^{}]+)/g, "{glow:$1}$2{/glow}");
      out = out.replace(/\{glow\}\s*\{\/glow\}([^{}]+)/g, "{glow}$1{/glow}");
    }

    // Remove fully-empty wrappers (no following text)
    const emptyPatterns = [
      /\{color:\w+\}\s*\{\/color\}/g,
      /\{glow(?::\w+)?\}\s*\{\/glow\}/g,
      /\{font:\w+\}\s*\{\/font\}/g,
      /\{fx:\w+\}\s*\{\/fx\}/g,
      /\*\*\s*\*\*/g,
      /__\s*__/g,
    ];
    let prev2 = "";
    while (prev2 !== out) {
      prev2 = out;
      for (const re of emptyPatterns) out = out.replace(re, "");
    }

    if (out === before) break;
  }

  // STEP 2: Final defensive sweep — remove ANY tag token that the renderer
  // cannot consume. This guarantees raw markup like "{font:cursive}", "{/font}"
  // never leaks through to the published post, even if the formatting got
  // corrupted somewhere upstream.
  //
  // We do this by simulating what the renderer's regex matches and stripping
  // every leftover token afterwards.
  const renderableMatcher =
    /(\*\*(?:.+?)\*\*|__(?:.+?)__|_(?:.+?)_|\{color:\w+\}(?:.+?)\{\/color\}|\{glow:\w+\}(?:.+?)\{\/glow\}|\{glow\}(?:.+?)\{\/glow\}|\{fx:\w+\}(?:.+?)\{\/fx\}|\{font:\w+\}(?:.+?)\{\/font\})/gs;

  // Carve out renderable spans, scrub stray tokens from the gaps, then re-stitch.
  const pieces: string[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = renderableMatcher.exec(out)) !== null) {
    if (m.index > lastIdx) {
      pieces.push(scrubStrayTokens(out.slice(lastIdx, m.index)));
    }
    pieces.push(m[0]);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < out.length) {
    pieces.push(scrubStrayTokens(out.slice(lastIdx)));
  }
  out = pieces.join("");

  return out;
}

/**
 * Removes any leftover formatting tokens from a "gap" region (text outside
 * renderable spans). These tokens would otherwise show as literal text.
 */
function scrubStrayTokens(s: string): string {
  return s
    .replace(/\{\/?(?:color|font|fx|glow)(?::\w+)?\}/g, "")
    .replace(/\*\*/g, "")
    .replace(/(?<!_)__(?!_)/g, "");
}

export function RichTextRenderer({ content }: { content: string }) {
  const cleaned = sanitizeRichContent(content);
  return <>{renderRich(cleaned)}</>;
}

