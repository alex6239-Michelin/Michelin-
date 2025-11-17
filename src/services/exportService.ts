// This service uses libraries loaded from CDN in index.html
// We declare them here to satisfy TypeScript
declare const jspdf: any;
declare const html2canvas: any;

/**
 * Creates a string of CSS styles to be embedded in the PDF for better formatting.
 * @returns A <style> tag with CSS rules as a string.
 */
const getPdfStyles = (): string => `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700&display=swap');
    body { 
      font-family: 'Noto Sans TC', sans-serif;
      font-size: 10.5pt;
      line-height: 1.8;
      color: #333;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .pdf-container {
      padding: 15mm; /* Add padding to match PDF margins */
    }
    .pdf-block {
      page-break-inside: avoid;
    }
    h1, h2, h3, h4, strong {
      font-family: 'Noto Sans TC', sans-serif; 
      font-weight: 700;
      margin: 0 0 10px 0;
      padding: 0;
    }
    h1 {
      font-family: 'Noto Serif TC', serif;
      font-size: 24pt;
      color: #C2185B; /* Princess Pink */
      text-align: left;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2.5px solid #F8BBD0; /* Light Pink */
    }
    h2 {
      font-family: 'Noto Sans TC', sans-serif;
      font-size: 18pt;
      font-weight: 700;
      color: #AD1457; /* Darker Pink */
      background-color: #FCE4EC; /* Very Light Pink */
      margin-top: 25px;
      margin-bottom: 20px;
      padding: 8px 16px;
      border-radius: 8px;
      border-left: 6px solid #E91E63;
    }
    h3 {
      font-size: 14pt;
      color: #5E35B1; /* Deep Purple */
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h4 {
      font-size: 12pt;
      color: #4527A0; /* Darker Purple */
      font-weight: 700;
      margin-bottom: 5px;
    }
    p, div {
      margin-bottom: 12px;
    }
    a {
      color: #1E88E5; /* Bright Blue */
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    hr {
      border: 0;
      border-top: 1px solid #E0E0E0;
      margin: 25px 0;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 15px auto;
      border-radius: 8px;
      border: 1px solid #eee;
    }
  </style>
`;

/**
 * Exports a given HTML string as a PDF file with robust pagination.
 * It renders content block-by-block, ensuring that no single block is split across pages.
 * @param htmlContent The HTML string to export.
 * @param filename The desired filename without extension.
 */
export const exportToPdf = async (htmlContent: string, filename: string): Promise<void> => {
  try {
    const { jsPDF } = jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const usableWidthMM = pdfWidth - (margin * 2);
    const usableHeightMM = pdfHeight - (margin * 2);
    let currentY = margin;

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '800px'; // A fixed width for consistent rendering
    tempContainer.style.background = 'white';
    
    const sourceContainer = document.createElement('div');
    sourceContainer.innerHTML = getPdfStyles() + `<div class="pdf-container">${htmlContent}</div>`;
    
    // Append to body to ensure styles are applied
    document.body.appendChild(sourceContainer);
    
    // Select all logical content blocks to render individually
    // Use a specific class .pdf-block for better control
    const contentBlocks = Array.from(sourceContainer.querySelectorAll('.pdf-block, h1, h2'));

    // If no specific blocks are found, treat the whole content as one block
    if (contentBlocks.length === 0) {
        contentBlocks.push(sourceContainer);
    }
    
    for (const block of contentBlocks) {
      const canvas = await html2canvas(block as HTMLElement, { scale: 2.5, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const elementHeightMM = (canvas.height / canvas.width) * usableWidthMM;
      
      if (currentY > margin && currentY + elementHeightMM > usableHeightMM + margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.addImage(imgData, 'PNG', margin, currentY, usableWidthMM, elementHeightMM);
      currentY += elementHeightMM + 2; // Add a small gap between blocks
    }

    document.body.removeChild(sourceContainer);
    pdf.save(`${filename}.pdf`);

  } catch (error) {
    console.error("Error exporting to PDF:", error);
    alert("無法導出為 PDF。請稍後再試。");
  }
};