// This service uses libraries loaded from CDN in index.html
// We declare them here to satisfy TypeScript
declare const jspdf: any;
declare const html2canvas: any;

/**
 * Creates a string of CSS styles to be embedded in the PDF for better formatting,
 * mimicking the style of the provided physics learning pack image.
 * @returns A <style> tag with CSS rules as a string.
 */
const getPdfStyles = (): string => `
  <style>
    body { 
      font-family: 'Noto Sans TC', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000000;
    }
    h1, h2, h3, h4, strong {
      font-family: 'Noto Sans TC', sans-serif; 
      font-weight: 700;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 26pt;
      color: #333;
      text-align: left;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 2px solid #ef4444; /* Red color from image */
    }
    h2 {
      font-size: 18pt;
      color: #ffffff;
      background-color: #ef4444; /* Red color from image */
      margin-top: 25px;
      margin-bottom: 20px;
      padding: 8px 16px;
      border-radius: 8px;
    }
    h3 {
      font-size: 14pt;
      color: #d32f2f; /* Darker red for subsection titles */
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h4 {
      font-size: 12pt;
      color: #000000;
      font-weight: 700;
      margin-bottom: 5px;
    }
    p, div {
      margin-bottom: 12px;
    }
    a {
      color: #2b6cb0;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 30px 0;
    }
    /* Remove the boxy style from content blocks */
    div[style*="page-break-inside: avoid;"],
    article[style*="page-break-inside: avoid;"] {
      background-color: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
      margin-bottom: 25px;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 15px auto;
      border-radius: 4px;
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
    document.body.appendChild(tempContainer);
    
    const sourceContainer = document.createElement('div');
    sourceContainer.innerHTML = getPdfStyles() + htmlContent;
    
    // Select all logical content blocks to render individually
    const contentBlocks = Array.from(sourceContainer.querySelectorAll('div[style*="page-break-inside: avoid;"], article[style*="page-break-inside: avoid;"], h1, h2'));

    // If no specific blocks are found, treat the whole content as one block
    if (contentBlocks.length === 0) {
        contentBlocks.push(sourceContainer);
    }
    
    for (const block of contentBlocks) {
      // Use a clean container for each canvas render
      tempContainer.innerHTML = '';
      tempContainer.appendChild(block.cloneNode(true));
      
      const canvas = await html2canvas(tempContainer, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const elementHeightMM = (canvas.height / canvas.width) * usableWidthMM;
      
      if (currentY > margin && currentY + elementHeightMM > usableHeightMM + margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.addImage(imgData, 'PNG', margin, currentY, usableWidthMM, elementHeightMM);
      currentY += elementHeightMM + 4; // Add a 4mm gap between blocks
    }

    document.body.removeChild(tempContainer);
    pdf.save(`${filename}.pdf`);

  } catch (error) {
    console.error("Error exporting to PDF:", error);
    alert("無法導出為 PDF。請稍後再試。");
  }
};