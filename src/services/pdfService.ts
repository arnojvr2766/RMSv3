import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfOptions {
  filename?: string;
  /** A4 portrait by default */
  orientation?: 'portrait' | 'landscape';
  /** Extra white padding (px) around the element before capture */
  padding?: number;
  /** Scale factor — higher = sharper (default 2 for retina) */
  scale?: number;
}

/**
 * Capture a DOM element and save it as a PDF.
 *
 * Usage:
 *   import { generatePDF } from '../services/pdfService';
 *   await generatePDF(divRef.current, { filename: 'statement.pdf' });
 */
export async function generatePDF(
  element: HTMLElement,
  options: PdfOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    orientation = 'portrait',
    padding = 0,
    scale = 2,
  } = options;

  // Temporarily force a white background and remove rounded corners so the
  // captured canvas looks clean on paper.
  const originalBorderRadius = element.style.borderRadius;
  const originalBoxShadow    = element.style.boxShadow;
  element.style.borderRadius = '0';
  element.style.boxShadow    = 'none';

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      // Expand the clip region by padding on each side
      x: -padding,
      y: -padding,
      width:  element.offsetWidth  + padding * 2,
      height: element.offsetHeight + padding * 2,
    });

    const imgData = canvas.toDataURL('image/png');

    // A4 dimensions in mm
    const pageW = orientation === 'portrait' ? 210 : 297;
    const pageH = orientation === 'portrait' ? 297 : 210;

    // Scale image to fit the page width with a small margin
    const margin    = 10; // mm
    const usableW   = pageW - margin * 2;
    const imgAspect = canvas.height / canvas.width;
    const imgW      = usableW;
    const imgH      = usableW * imgAspect;

    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    let yOffset = margin;
    let remaining = imgH;

    // If the content spans multiple pages, slice it
    while (remaining > 0) {
      const sliceH = Math.min(remaining, pageH - margin * 2);
      const srcY   = (imgH - remaining) / imgH * canvas.height;
      const srcH   = sliceH / imgH * canvas.height;

      // Create a temporary canvas for this slice
      const sliceCanvas          = document.createElement('canvas');
      sliceCanvas.width          = canvas.width;
      sliceCanvas.height         = srcH;
      const ctx                  = sliceCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      pdf.addImage(
        sliceCanvas.toDataURL('image/png'),
        'PNG',
        margin,
        yOffset,
        imgW,
        sliceH
      );

      remaining -= sliceH;
      if (remaining > 0) {
        pdf.addPage();
        yOffset = margin;
      }
    }

    pdf.save(filename);
  } finally {
    element.style.borderRadius = originalBorderRadius;
    element.style.boxShadow    = originalBoxShadow;
  }
}
