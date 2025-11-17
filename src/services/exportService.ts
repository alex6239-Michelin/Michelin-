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
      color: #4A4A4A;
      background-color: #ffffff;
    }
    h1, h2, h3, h4, strong {
      font-family: 'Noto Serif TC', serif; 
      font-weight: 700;
      color: #6D2A5B;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 24pt;
      text-align: left;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #FF69B4;
    }
    h2 {
      font-size: 16pt;
      font-family: 'Noto Sans TC', sans-serif;
      color: #ffffff;
      background: linear-gradient(135deg, #FF69B4, #C973FF);
      margin-top: 28px;
      margin-bottom: 20px;
      padding: 8px 16px;
      border-radius: 8px;
    }
    h3 {
      font-size: 13pt;
      color: #FF69B4;
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h4 {
      font-size: 11.5pt;
      color: #8C5E8A;
      font-weight: 700;
      margin-bottom: 8px;
    }
    p, div {
      margin-bottom: 12px;
    }
    a {
      color: #C973FF;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    hr {
      border: 0;
      border-top: 1px solid #FCE4EC;
      margin: 30px 0;
    }
    .pdf-block {
      page-break-inside: avoid;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 15px auto;
      border-radius: 8px;
      border: 1px solid #FCE4EC;
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

    const sourceContainer = document.createElement('div');
    sourceContainer.style.position = 'absolute';
    sourceContainer.style.left = '-9999px';
    sourceContainer.innerHTML = getPdfStyles() + htmlContent;
    document.body.appendChild(sourceContainer);
    
    // Select all logical content blocks to render individually, including <hr> tags
    const contentBlocks = Array.from(sourceContainer.querySelectorAll('.pdf-block, h1, h2, hr'));

    if (contentBlocks.length === 0) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = sourceContainer.innerHTML; // get the whole thing
        contentBlocks.push(wrapper);
    }
    
    for (const block of contentBlocks) {
      if (block.tagName.toLowerCase() === 'hr') {
         if (currentY + 10 > usableHeightMM + margin) {
            pdf.addPage();
            currentY = margin;
         }
         pdf.setDrawColor(252, 228, 236); // Light Pink
         pdf.line(margin, currentY, pdfWidth - margin, currentY);
         currentY += 6;
         continue;
      }

      const renderContainer = document.createElement('div');
      renderContainer.style.position = 'absolute';
      renderContainer.style.left = '-9999px';
      renderContainer.style.width = '800px';
      renderContainer.style.background = 'white';
      
      // Append styles and the block itself to a clean container for rendering
      renderContainer.innerHTML = getPdfStyles();
      renderContainer.appendChild(block.cloneNode(true));
      document.body.appendChild(renderContainer);
      
      const canvas = await html2canvas(renderContainer, { 
        scale: 2, 
        useCORS: true,
        // CRITICAL FIX: Use scrollHeight to capture the full content, not just the visible part.
        width: renderContainer.scrollWidth,
        height: renderContainer.scrollHeight,
        windowWidth: renderContainer.scrollWidth,
        windowHeight: renderContainer.scrollHeight,
      });

      document.body.removeChild(renderContainer);

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
