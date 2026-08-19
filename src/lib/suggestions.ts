import type { Category } from "./classifyTransaction";
import type { BudgetBenchmark } from "./budgetBenchmark";

export interface Transacao {
  description: string;
  amount: number;
  category: Category;
}

export interface SugestaoCompraAtacado {
  quantidadeTransacoes: number;
  totalGasto: number;
  economiaEstimada: number;
}

export interface SugestaoInvestimento {
  faltaParaMeta: number;
  cortarDeOutros: number;
  atingivelSoComOutros: boolean;
}

const LIMITE_TRANSACAO_PEQUENA = 50;
const MINIMO_TRANSACOES_PEQUENAS = 4;

/**
 * Estimativa editorial (não calculada a partir dos dados do usuário) do
 * quanto compras no atacado costumam economizar frente a várias compras
 * pequenas no mercado/conveniência. É só uma heurística de MVP.
 */
const TAXA_ECONOMIA_ATACADO_ESTIMADA = 0.15;

/**
 * Se houver muitas compras pequenas em Custos Variáveis (mercado, posto,
 * conveniência, farmácia — tudo que cai nessa categoria), sugere consolidar
 * em compras maiores/no atacado e estima a economia com a taxa acima.
 */
export function sugerirCompraAtacado(
  transacoes: Transacao[]
): SugestaoCompraAtacado | null {
  const pequenas = transacoes.filter(
    (t) =>
      t.category === "Custos Variáveis" &&
      t.amount < 0 &&
      Math.abs(t.amount) <= LIMITE_TRANSACAO_PEQUENA
  );

  if (pequenas.length < MINIMO_TRANSACOES_PEQUENAS) return null;

  const totalGasto = pequenas.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    quantidadeTransacoes: pequenas.length,
    totalGasto,
    economiaEstimada: totalGasto * TAXA_ECONOMIA_ATACADO_ESTIMADA,
  };
}

/**
 * Se o investimento real estiver abaixo dos 20% recomendados pela regra
 * 50/30/20, calcula quanto precisaria ser cortado de "Outros" para fechar
 * a meta, assumindo que o total gasto+investido no mês permanece o mesmo.
 */
export function sugerirCorteParaMetaInvestimento(
  benchmark: BudgetBenchmark
): SugestaoInvestimento | null {
  if (benchmark.total <= 0) return null;

  const faltaParaMeta = benchmark.recomendadoInvestido - benchmark.investido;
  if (faltaParaMeta <= 0) return null;

  const cortarDeOutros = Math.min(faltaParaMeta, benchmark.gastoOutros);

  return {
    faltaParaMeta,
    cortarDeOutros,
    atingivelSoComOutros: cortarDeOutros >= faltaParaMeta,
  };
}
