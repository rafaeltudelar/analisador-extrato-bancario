export type Category =
  | "Investimentos"
  | "Custos Fixos"
  | "Custos Variáveis"
  | "Outros";

/**
 * Deixa maiúsculo, remove acentos, troca símbolos por espaço e tira
 * números/códigos soltos no final (ex.: "PAG*DROGASIL 0231" -> "PAG DROGASIL").
 */
function normalizeDescription(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(?:\s+\d+)+$/, "")
    .trim();
}

/**
 * "Stems" casam como substring solta (ex.: "SUPERM" acha "SUPERMUFFATO"),
 * úteis pra generalizar nomes de marcas compostas.
 */
function matchesAnyStem(normalized: string, stems: string[]): boolean {
  return stems.some((stem) => normalized.includes(stem));
}

/**
 * "Words" só casam como palavra inteira (com espaço/borda dos dois lados),
 * pra evitar falso positivo de termos curtos (ex.: "ETF" dentro de "NETFLIX").
 */
function matchesAnyWord(normalized: string, words: string[]): boolean {
  const padded = ` ${normalized} `;
  return words.some((word) => padded.includes(` ${word} `));
}

const INVESTIMENTOS_STEMS = [
  "INVEST",
  "CORRETORA",
  "APLICACAO",
  "APORTE",
  "FUNDO",
  "TESOURO",
  "PREVIDENCIA",
  "DEBENTURE",
  "BITCOIN",
  "CRIPTO",
  "BINANCE",
  "FOXBIT",
  "BTG",
  "POUPANCA PROGRAMADA",
];
const INVESTIMENTOS_WORDS = ["CDB", "LCI", "LCA", "ACOES", "B3", "ETF", "FII", "CRA", "CRI"];

const CUSTOS_FIXOS_STEMS = [
  "ASSINATURA",
  "MENSAL",
  "NETFLIX",
  "SPOTIFY",
  "DISNEY",
  "AMAZON PRIME",
  "YOUTUBE PREMIUM",
  "GLOBOPLAY",
  "DEEZER",
  "APPLE",
  "MICROSOFT",
  "ADOBE",
  "ICLOUD",
  "XBOX GAME PASS",
  "PLAYSTATION PLUS",
  "CONDOMINIO",
  "ALUGUEL",
  "FINANCIAMENTO",
  "CONSORCIO",
  "SEGURO",
  "PLANO",
  "UNIMED",
  "HAPVIDA",
  "ODONTOPREV",
  "ACADEMIA",
  "CLARO",
  "CONSIGNADO",
  "EMPRESTIMO",
  "ANUIDADE",
  "MANUTENCAO",
  "ALARME",
];
const CUSTOS_FIXOS_WORDS = ["HBO", "AMIL", "VIVO", "TIM", "OI", "IPTU", "IPVA"];

const CUSTOS_VARIAVEIS_STEMS = [
  "SUPERM",
  "HIPERMERCADO",
  "ATACAD",
  "MERCEARIA",
  "MERCADINHO",
  "VAREJAO",
  "SACOLAO",
  "HORTIFRUTI",
  "QUITANDA",
  "FEIRA LIVRE",
  "ACOUGUE",
  "PADARIA",
  "PANIFICADORA",
  "POSTO",
  "DROG",
  "FARM",
  "SUPER",
  "CONVENIENCIA",
  "OXXO",
  "AM PM",
  "SANEPAR",
  "COPEL",
  "COMPANHIA GAS",
  "AGUA",
  "ENERGIA",
  "CARREFOUR",
  "PAO DE ACUCAR",
  "PAGTO CARTAO",
];
const CUSTOS_VARIAVEIS_WORDS = ["GAS"];

export function classifyTransaction(description: string): Category {
  const normalized = normalizeDescription(description);

  if (!normalized) return "Outros";

  if (
    matchesAnyStem(normalized, INVESTIMENTOS_STEMS) ||
    matchesAnyWord(normalized, INVESTIMENTOS_WORDS)
  ) {
    return "Investimentos";
  }

  if (
    matchesAnyStem(normalized, CUSTOS_FIXOS_STEMS) ||
    matchesAnyWord(normalized, CUSTOS_FIXOS_WORDS)
  ) {
    return "Custos Fixos";
  }

  if (
    matchesAnyStem(normalized, CUSTOS_VARIAVEIS_STEMS) ||
    matchesAnyWord(normalized, CUSTOS_VARIAVEIS_WORDS)
  ) {
    return "Custos Variáveis";
  }

  // Limite conhecido do MVP: Pix enviado/recebido para nome de pessoa física
  // (ex.: "Pix - Enviado ANA CLARA TUDELA") cai aqui de propósito. O motivo é
  // genuinamente ambíguo (pode ser aluguel, divisão de conta, empréstimo
  // pessoal etc.) e não dá pra inferir a categoria com confiança só pelo
  // nome do favorecido — exigiria contexto que o extrato não fornece.
  return "Outros";
}
