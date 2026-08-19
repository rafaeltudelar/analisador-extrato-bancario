export interface ParsedTransaction {
  description: string;
  amount: number;
}

const LEADING_DATE_REGEX = /^(\d{2}\/\d{2}\/\d{4})\s+(.*)$/;

/**
 * O valor pode vir logo apos a data ("DD/MM/AAAA 20,89 (-) ...") ou mais
 * adiante na mesma linha, depois de lote/documento/detalhe do historico
 * ("DD/MM/AAAA 13105 60101 ... 20,89 (-)") — a extracao de texto do PDF
 * junta colunas na mesma linha de formas diferentes dependendo do layout.
 * Por isso buscamos todas as ocorrencias e usamos a ultima (a coluna
 * "Valor" e sempre a mais a direita na tabela do extrato).
 */
const AMOUNT_SIGN_REGEX = /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*\(([+-])\)/g;

const BARE_AMOUNT_REGEX = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;

const DATE_TOKEN_REGEX = /\d{2}\/\d{2}(?:\/\d{4})?\s*(?:\d{2}:\d{2})?/g;
const DIGIT_TOKEN_REGEX = /\b\d+\b/g;
const DIACRITICS_REGEX = /[̀-ͯ]/g;

/**
 * Linhas de cabecalho/saldo que se repetem no extrato (inclusive no meio de
 * um lancamento, por causa de quebra de pagina) e nao fazem parte da
 * descricao de nenhuma transacao.
 */
const NOISE_SUBSTRINGS = [
  "extrato de conta corrente",
  "cliente ",
  "agencia:",
  "lancamentos",
  "dia documento valor",
  "dia lote documento historico valor",
  "total aplicacoes financeiras",
  "saldos por dia",
  "sujeitos a confirmacao",
  "saldo do dia",
  "saldo anterior",
  "s a l d o",
];

function stripAccentsLower(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase();
}

function isNoiseLine(line: string): boolean {
  const normalized = stripAccentsLower(line);
  return NOISE_SUBSTRINGS.some((needle) => normalized.includes(needle));
}

/**
 * Remove data/hora ("31/05 14:37") e codigos numericos soltos (lote,
 * documento, numero de conta) de uma linha de historico, deixando so o
 * texto que descreve a transacao (ex.: "Pix - Enviado", nome do favorecido).
 */
function cleanContentLine(line: string): string {
  return line
    .replace(DATE_TOKEN_REGEX, " ")
    .replace(DIGIT_TOKEN_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmount(raw: string, sign: string): number {
  const value = Number(raw.replace(/\./g, "").replace(",", "."));
  return sign === "-" ? -value : value;
}

/**
 * Extrai as transacoes de um extrato do Banco do Brasil ja convertido em
 * texto. Cada lancamento comeca numa linha "DD/MM/AAAA valor (+/-)" e sua
 * descricao continua nas linhas seguintes ate o proximo lancamento (ou ate
 * ruido de cabecalho/saldo, que e ignorado).
 */
export function parseStatementText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let current: { amount: number; descriptionParts: string[] } | null = null;

  function pushCurrent() {
    if (!current) return;
    const description = current.descriptionParts.join(" ").trim();
    if (description) {
      transactions.push({ description, amount: current.amount });
    }
    current = null;
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isNoiseLine(line)) continue;
    if (BARE_AMOUNT_REGEX.test(line)) continue;

    const dateMatch = line.match(LEADING_DATE_REGEX);
    const amountMatches = dateMatch
      ? [...dateMatch[2].matchAll(AMOUNT_SIGN_REGEX)]
      : [];

    if (dateMatch && amountMatches.length > 0) {
      pushCurrent();
      const lastAmountMatch = amountMatches[amountMatches.length - 1];
      const [fullAmountMatch, rawAmount, sign] = lastAmountMatch;
      const matchIndex = lastAmountMatch.index ?? 0;
      const rest =
        dateMatch[2].slice(0, matchIndex) +
        dateMatch[2].slice(matchIndex + fullAmountMatch.length);

      current = { amount: parseAmount(rawAmount, sign), descriptionParts: [] };
      const cleanedRest = cleanContentLine(rest);
      if (cleanedRest) current.descriptionParts.push(cleanedRest);
      continue;
    }

    if (current) {
      const cleaned = cleanContentLine(line);
      if (cleaned) current.descriptionParts.push(cleaned);
    }
  }

  pushCurrent();
  return transactions;
}
