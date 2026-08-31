/**
 * Copies text to clipboard and opens WhatsApp Web with the text pre-filled.
 */
export async function copyAndShareWhatsApp(text: string): Promise<boolean> {
  try {
    let copied = false;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    } else {
      copied = fallbackCopyTextToClipboard(text);
    }
    
    if (copied) {
      const encoded = encodeURIComponent(text);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Copies text to clipboard only (no WhatsApp redirect).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      return fallbackCopyTextToClipboard(text);
    }
  } catch {
    return false;
  }
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
