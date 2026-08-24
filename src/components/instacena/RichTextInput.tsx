import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { ANIMATED_EMOJIS } from "./AnimatedEmoji";

const COLOR_STYLES: Record<string, string> = {
  yellow: "background-color: rgba(250, 204, 21, 0.3); padding: 0 2px; border-radius: 3px;",
  green: "background-color: rgba(74, 222, 128, 0.3); padding: 0 2px; border-radius: 3px;",
  blue: "background-color: rgba(96, 165, 250, 0.3); padding: 0 2px; border-radius: 3px;",
  pink: "background-color: rgba(244, 114, 182, 0.3); padding: 0 2px; border-radius: 3px;",
  purple: "background-color: rgba(192, 132, 252, 0.3); padding: 0 2px; border-radius: 3px;",
  orange: "background-color: rgba(251, 146, 60, 0.3); padding: 0 2px; border-radius: 3px;",
};

const FONT_STYLES: Record<string, string> = {
  serif: "font-family: serif;",
  mono: "font-family: monospace;",
  cursive: "font-family: serif; font-style: italic;",
  normal: "",
};

const ZERO_WIDTH_SPACE = "\u200B";

function cleanEditorText(text: string): string {
  return text.split(ZERO_WIDTH_SPACE).join("");
}

function wrapCustomSyntax(type: string, value: string | undefined, content: string): string {
  switch (type) {
    case "bold":
      return `**${content}**`;
    case "italic":
      return `_${content}_`;
    case "underline":
      return `__${content}__`;
    case "color":
      return `{color:${value || "yellow"}}${content}{/color}`;
    case "glow":
      return value ? `{glow:${value}}${content}{/glow}` : `{glow}${content}{/glow}`;
    case "font":
      return `{font:${value || "normal"}}${content}{/font}`;
    case "fx":
      return `{fx:${value || "sparkle"}}${content}{/fx}`;
    default:
      return content;
  }
}

export interface RichTextInputHandle {
  focus: () => void;
  insertMention: (name: string, userId: string) => void;
  insertText: (text: string) => void;
  insertAnimatedEmoji: (emojiId: string) => void;
  applyFormat: (type: string, value?: string) => void;
  getContent: () => string;
  clear: () => void;
  getPlainText: () => string;
}

interface RichTextInputProps {
  placeholder?: string;
  onInput?: (plainText: string) => void;
  className?: string;
}

/**
 * Converts the innerHTML of the contentEditable div back to the custom syntax
 * used by RichTextRenderer for storage.
 */
function htmlToCustomSyntax(container: HTMLElement): string {
  let result = "";
  const pendingFormats: Array<{ type: string; value?: string }> = [];

  const appendChunk = (chunk: string) => {
    const cleaned = cleanEditorText(chunk);
    if (cleaned.length === 0) return;

    let formatted = cleaned;
    for (let i = pendingFormats.length - 1; i >= 0; i--) {
      formatted = wrapCustomSyntax(pendingFormats[i].type, pendingFormats[i].value, formatted);
    }
    pendingFormats.length = 0;
    result += formatted;
  };

  container.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendChunk(node.textContent || "");
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Mention
      if (el.dataset.mentionId) {
        appendChunk(`@[${el.dataset.mentionName || el.textContent?.replace(/^@/, "")}](${el.dataset.mentionId})`);
        return;
      }

      // Animated emoji
      if (el.dataset.emojiId) {
        appendChunk(`:${el.dataset.emojiId}:`);
        return;
      }

      const innerContent = htmlToCustomSyntax(el);
      const formatType = el.dataset.formatType;
      const formatValue = el.dataset.formatValue;

      // Check data attributes for custom formatting
      if (formatType) {
        if (innerContent.trim().length > 0) {
          appendChunk(wrapCustomSyntax(formatType, formatValue, innerContent));
        } else {
          // Replace any pending format of the same type so we don't end up with
          // nested empty wrappers like {font:normal}{font:mono}...{/font}{/font}.
          const existingIdx = pendingFormats.findIndex((p) => p.type === formatType);
          if (existingIdx >= 0) {
            pendingFormats[existingIdx] = { type: formatType, value: formatValue };
          } else {
            pendingFormats.push({ type: formatType, value: formatValue });
          }
        }
      } else if (el.tagName === "BR") {
        result += "\n";
      } else if (el.tagName === "DIV" || el.tagName === "P") {
        // Block elements add newlines
        if (result.length > 0 && !result.endsWith("\n")) {
          result += "\n";
        }
        appendChunk(innerContent);
      } else {
        appendChunk(innerContent || el.innerText || "");
      }
    }
  });

  return result;
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function placeCaretAfter(node: Node) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.setStartAfter(node);
  range.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(
  ({ placeholder, onInput, className }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const getContent = useCallback(() => {
      if (!editorRef.current) return "";
      return htmlToCustomSyntax(editorRef.current);
    }, []);

    const getPlainText = useCallback(() => {
      return editorRef.current?.innerText || "";
    }, []);

    const clear = useCallback(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    }, []);

    const insertMention = useCallback((name: string, userId: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      // Remove the @query text before inserting mention
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
          const text = textNode.textContent;
          const cursorPos = range.startOffset;
          const beforeCursor = text.slice(0, cursorPos);
          const atIdx = beforeCursor.lastIndexOf("@");
          if (atIdx >= 0) {
            textNode.textContent = text.slice(0, atIdx) + text.slice(cursorPos);
            // Set cursor position to where @ was
            range.setStart(textNode, atIdx);
            range.collapse(true);
          }
        }
      }

      const mention = document.createElement("span");
      mention.contentEditable = "false";
      mention.dataset.mentionId = userId;
      mention.dataset.mentionName = name;
      mention.className = "inline-flex items-center font-bold text-primary mx-0.5";
      mention.textContent = `@${name}`;

      const space = document.createTextNode("\u00A0");

      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(space);
        range.insertNode(mention);
        placeCaretAfter(space);
      } else {
        editor.appendChild(mention);
        editor.appendChild(space);
        placeCaretAtEnd(editor);
      }

      onInput?.(editor.innerText || "");
    }, [onInput]);

    const applyFormat = useCallback((type: string, value?: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        editor.focus();
        return;
      }

      const range = sel.getRangeAt(0);
      const selectedText = range.toString();

      const span = document.createElement("span");

      switch (type) {
        case "bold":
          span.style.fontWeight = "bold";
          span.dataset.formatType = "bold";
          break;
        case "italic":
          span.style.fontStyle = "italic";
          span.dataset.formatType = "italic";
          break;
        case "underline":
          span.style.textDecoration = "underline";
          span.style.textUnderlineOffset = "2px";
          span.dataset.formatType = "underline";
          break;
        case "color":
          span.setAttribute("style", COLOR_STYLES[value || "yellow"] || "");
          span.dataset.formatType = "color";
          span.dataset.formatValue = value || "yellow";
          break;
        case "glow": {
          const glowColors: Record<string, { color: string; shadow: string }> = {
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
          const gc = glowColors[value || "gold"] || glowColors.gold;
          span.style.color = gc.color;
          span.style.textShadow = gc.shadow;
          span.dataset.formatType = "glow";
          span.dataset.formatValue = value || "gold";
          span.className = "animate-pulse";
          break;
        }
        case "font":
          span.setAttribute("style", FONT_STYLES[value || "normal"] || "");
          span.dataset.formatType = "font";
          span.dataset.formatValue = value || "normal";
          break;
        case "fx": {
          span.dataset.formatType = "fx";
          span.dataset.formatValue = value || "sparkle";
          switch (value) {
            case "sparkle":
              span.style.color = "#fbbf24";
              span.style.animation = "sparkle-text 2s ease-in-out infinite";
              break;
            case "rainbow":
              span.style.animation = "rainbow-shift 3s linear infinite";
              break;
            case "neon":
              span.style.color = "#06b6d4";
              span.style.animation = "neon-flicker 3s ease-in-out infinite";
              break;
            case "gradient":
              span.style.background = "linear-gradient(90deg, #3b82f6, #a855f7, #ec4899)";
              span.style.webkitBackgroundClip = "text";
              span.style.webkitTextFillColor = "transparent";
              (span.style as any).backgroundClip = "text";
              break;
          }
          break;
        }
      }

      if (selectedText) {
        // Wrap selected text
        span.textContent = selectedText;
        range.deleteContents();
        range.insertNode(span);
        const space = document.createTextNode("\u00A0");
        span.after(space);
        placeCaretAfter(space);
      } else {
        // No selection: insert empty span and place cursor inside it
        span.textContent = "\u200B"; // zero-width space so span is not empty
        range.insertNode(span);
        // Place cursor inside the span, after the zero-width space
        const innerRange = document.createRange();
        innerRange.setStart(span.firstChild!, 1);
        innerRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(innerRange);
      }

      onInput?.(editor.innerText || "");
    }, [onInput]);

    const insertText = useCallback((text: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      document.execCommand("insertText", false, text);
      onInput?.(editor.innerText || "");
    }, [onInput]);

    const insertAnimatedEmoji = useCallback((emojiId: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const def = ANIMATED_EMOJIS.find((e) => e.id === emojiId);
      if (!def) return;

      const emojiSpan = document.createElement("span");
      emojiSpan.contentEditable = "false";
      emojiSpan.dataset.emojiId = emojiId;
      emojiSpan.className = "animated-emoji inline-block align-middle mx-0.5";
      emojiSpan.textContent = def.emoji;
      emojiSpan.title = def.label;
      emojiSpan.setAttribute("role", "img");
      emojiSpan.setAttribute("aria-label", def.label);
      emojiSpan.style.fontSize = "1.25em";
      emojiSpan.style.lineHeight = "1";
      emojiSpan.style.cursor = "default";

      const space = document.createTextNode("\u00A0");

      // Always append at the end — the popover steals focus so selection is lost
      editor.appendChild(emojiSpan);
      editor.appendChild(space);
      editor.focus();
      placeCaretAfter(space);

      onInput?.(editor.innerText || "");
    }, [onInput]);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      insertMention,
      insertText,
      insertAnimatedEmoji,
      applyFormat,
      getContent,
      clear,
      getPlainText,
    }), [insertMention, insertText, insertAnimatedEmoji, applyFormat, getContent, clear, getPlainText]);

    const handleInput = useCallback(() => {
      onInput?.(editorRef.current?.innerText || "");
    }, [onInput]);

    // Handle paste - strip formatting
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }, []);

    return (
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className={`min-h-[60px] resize-none border-none bg-muted/30 rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none ${className || ""}`}
        />
      </div>
    );
  }
);

RichTextInput.displayName = "RichTextInput";
