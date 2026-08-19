import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/pdf";

export const runtime = "nodejs";
// Timeout padrão de função serverless no Vercel é 10s, que pode não bastar
// para o cold start do PDF.js + parsing de PDFs maiores.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Nenhum arquivo PDF foi enviado." },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "O arquivo enviado precisa ser um PDF." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const text = await extractTextFromPdf(buffer);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Falha ao extrair texto do PDF:", error);
    return NextResponse.json(
      { error: "Não foi possível extrair o texto do PDF." },
      { status: 500 }
    );
  }
}
