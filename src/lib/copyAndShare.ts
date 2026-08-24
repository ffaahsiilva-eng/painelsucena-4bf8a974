/**
 * Copies text to clipboard and opens WhatsApp Web with the text pre-filled.
 */
export async function copyAndShareWhatsApp(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies text to clipboard only (no WhatsApp redirect).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
