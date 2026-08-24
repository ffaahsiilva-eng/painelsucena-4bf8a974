import { Fragment } from "react";
import { RichTextRenderer } from "./RichTextRenderer";

/**
 * Parses content with mentions in format @[Name](user_id)
 * Renders mentions as bold text with sparkle animation
 * Non-mention text is passed through RichTextRenderer for formatting
 */
export function MentionText({ content }: { content: string }) {
  // Match @[Name](user_id)  — capture both name and id so we can detect ALL
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: Array<{ type: "text" | "mention" | "all"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    const isAll = match[2] === "ALL";
    parts.push({ type: isAll ? "all" : "mention", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <span><RichTextRenderer content={content} /></span>;
  }

  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === "mention") {
          return (
            <span
              key={i}
              className="mention-spark inline-flex items-center font-bold text-primary"
            >
              @{part.value}
            </span>
          );
        }
        if (part.type === "all") {
          return (
            <span
              key={i}
              className="mention-spark inline-flex items-center font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30"
              title="Menção a todos os usuários"
            >
              @{part.value}
            </span>
          );
        }
        return (
          <Fragment key={i}>
            <RichTextRenderer content={part.value} />
          </Fragment>
        );
      })}
    </span>
  );
}
