/**
 * Robust PDF blob download that works in browsers, PWAs, TWAs, and Electron.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;
  link.download = filename;
  link.setAttribute("target", "_self");
  document.body.appendChild(link);

  // Use setTimeout to ensure the click is processed
  setTimeout(() => {
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 250);
  }, 0);
}

/**
 * Generates a real PDF file from an HTML string and triggers download.
 * Works in browsers, PWAs, TWAs, and Electron apps (no window.open/print needed).
 */
export async function downloadPdfFromHtml(
  htmlContent: string,
  filename: string
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Create a hidden container to render the HTML
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // A4 width at 96dpi
  container.style.background = "white";
  container.style.zIndex = "-1";

  // Create a shadow root to isolate styles
  const shadow = container.attachShadow({ mode: "open" });
  const wrapper = document.createElement("div");
  wrapper.innerHTML = htmlContent;

  // Extract <style> and <link> tags from head and inject into shadow
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const styles = doc.querySelectorAll("style");
  const bodyContent = doc.body?.innerHTML || htmlContent;

  const styleEl = document.createElement("style");
  let combinedStyles = "";
  styles.forEach((s) => {
    combinedStyles += s.textContent || "";
  });
  // Add print color adjust
  combinedStyles += `
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body, div { margin: 0; padding: 0; }
  `;
  styleEl.textContent = combinedStyles;

  const contentDiv = document.createElement("div");
  contentDiv.style.padding = "20px";
  contentDiv.style.background = "white";
  contentDiv.style.color = "#333";
  contentDiv.style.fontFamily = "Arial, Helvetica, sans-serif";
  contentDiv.style.fontSize = "12px";
  contentDiv.innerHTML = bodyContent;

  shadow.appendChild(styleEl);
  shadow.appendChild(contentDiv);
  document.body.appendChild(container);

  // Wait for images to load
  const images = contentDiv.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  // Small delay for rendering
  await new Promise((r) => setTimeout(r, 200));

  try {
    const canvas = await html2canvas(contentDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      windowWidth: 794,
    });

    const imgWidth = 210; // A4 mm
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const finalName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    const blob = pdf.output("blob");
    triggerBlobDownload(blob, finalName);
  } finally {
    document.body.removeChild(container);
  }
}
