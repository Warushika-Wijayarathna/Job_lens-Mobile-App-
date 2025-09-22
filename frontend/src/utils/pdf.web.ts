// Web-only PDF text extraction using pdfjs-dist
export async function extractPdfText(uri: string): Promise<string | null> {
  try {
    // Dynamically import pdf.js to keep bundles lean
    // eslint-disable-next-line import/no-unresolved
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
    // eslint-disable-next-line import/no-unresolved
    await import('pdfjs-dist/build/pdf.worker.entry');

    const res = await fetch(uri);
    const buf = await res.arrayBuffer();

    // @ts-ignore
    const loadingTask = pdfjsLib.getDocument({ data: buf });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }

    return fullText.trim();
  } catch (e) {
    console.warn('PDF text extraction failed on web:', e);
    return null;
  }
}
