import PDFParser, { type Output, type Text } from "pdf2json";

const Y_ROW_TOLERANCE = 0.2;

/**
 * Rótulos de histórico que o extrato do BB desenha ligeiramente acima da
 * linha de data/valor à qual pertencem (a coluna "Histórico" tem duas
 * linhas de texto, e a de cima fica na mesma altura de nada mais). Sem
 * essa troca, o rótulo apareceria antes da própria transação em vez de
 * junto dela.
 */
const HISTORICO_LABELS = new Set([
  "Pix - Enviado",
  "Pix - Recebido",
  "Compra com Cartão",
  "Pagto cartão crédito",
  "TED-Crédito em Conta",
  "TED-Débito em Conta",
]);

const LEADING_DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}\s/;

function decodeText(text: Text): string {
  return text.R.map((run) => decodeURIComponent(run.T)).join("");
}

/**
 * Reconstrói o texto do PDF em ordem de leitura (topo -> base, esquerda ->
 * direita) a partir das coordenadas x/y que o pdf2json expõe por página,
 * já que o `getRawTextContent()` da biblioteca não preserva essa ordem
 * para este layout de extrato. Função pura: só depende do JSON estruturado
 * que o parser já produziu, sem I/O.
 */
export function reconstructReadingOrder(output: Output): string {
  const lines: string[] = [];

  for (const page of output.Pages) {
    const rows = new Map<number, { x: number; text: string }[]>();

    for (const item of page.Texts) {
      const rowKey = Math.round(item.y / Y_ROW_TOLERANCE) * Y_ROW_TOLERANCE;
      const row = rows.get(rowKey) ?? [];
      row.push({ x: item.x, text: decodeText(item) });
      rows.set(rowKey, row);
    }

    const sortedRowKeys = [...rows.keys()].sort((a, b) => a - b);
    for (const rowKey of sortedRowKeys) {
      const row = rows.get(rowKey)!.sort((a, b) => a.x - b.x);
      lines.push(row.map((item) => item.text).join(" "));
    }
  }

  for (let i = 0; i < lines.length - 1; i++) {
    if (HISTORICO_LABELS.has(lines[i].trim()) && LEADING_DATE_REGEX.test(lines[i + 1])) {
      [lines[i], lines[i + 1]] = [lines[i + 1], lines[i]];
      i++;
    }
  }

  return lines.join("\n");
}

export function extractTextFromPdf(data: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (errData) => {
      const error = errData instanceof Error ? errData : errData.parserError;
      reject(error);
    });

    parser.on("pdfParser_dataReady", (pdfData) => {
      resolve(reconstructReadingOrder(pdfData));
    });

    parser.parseBuffer(data);
  });
}
