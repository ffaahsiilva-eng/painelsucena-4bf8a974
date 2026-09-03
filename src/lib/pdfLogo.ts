// Central logo for PDF generation
// Logo path in public folder for easy access
import sucenaLogo from "@/assets/sucena-official-3.png.asset.json";
export const PDF_LOGO_URL = sucenaLogo.url;

// Helper to fetch and convert logo to base64 for embedding in PDFs
export async function getLogoBase64(): Promise<string> {
  try {
    const response = await fetch(PDF_LOGO_URL);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn("Failed to load logo for PDF");
    return "";
  }
}

// Generate HTML header with logo for PDF
export function generatePdfHeader(title: string, subtitle: string, logoBase64: string): string {
  return `
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : '<div></div>'}
      <div class="header-info">
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
    </div>
  `;
}

// Common header styles for PDF
export const PDF_HEADER_STYLES = `
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 20px;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 25px;
  }
  .header .logo {
    max-height: 60px;
    max-width: 160px;
    object-fit: contain;
  }
  .header-info {
    text-align: right;
  }
  .header-info h1 {
    font-size: 20px;
    color: #1f2937;
    margin-bottom: 5px;
  }
  .header-info p {
    font-size: 12px;
    color: #666;
  }
`;
