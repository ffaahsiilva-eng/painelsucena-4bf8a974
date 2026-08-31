/**
 * Copies text to clipboard and opens WhatsApp Web with the text pre-filled.
 */
export async function copyAndShareWhatsApp(text: string): Promise<boolean> {
  let copied = false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (err) {
    console.warn("navigator.clipboard.writeText failed, trying fallback.", err);
  }

  if (!copied) {
    copied = fallbackCopyTextToClipboard(text);
  }

  if (copied) {
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
    return true;
  }
  return false;
}

/**
 * Copies text to clipboard only (no WhatsApp redirect).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard.writeText failed, trying fallback.", err);
  }
  return fallbackCopyTextToClipboard(text);
}

function fallbackCopyTextToClipboard(text: string): boolean {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
    return false;
  }
}
