// Safe stub used when platform-specific resolution does not pick web/native files
export async function extractPdfText(_uri: string): Promise<string | null> {
  // On native, let backend extract; on web we rely on pdf.web.ts
  return null;
}
