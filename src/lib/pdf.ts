import { PDFParse } from "pdf-parse";

export async function extractTextFromPdf(data: Buffer): Promise<string> {
  const parser = new PDFParse({ data });
  const result = await parser.getText({ pageJoiner: "" });
  await parser.destroy();
  return result.text;
}
