import type { Category } from "./classifyTransaction";

export interface BudgetBenchmark {
  total: number;
  gastoEssencial: number;
  gastoOutros: number;
  investido: number;
  recomendadoEssencial: number;
  recomendadoOutros: number;
  recomendadoInvestido: number;
  percentualInvestidoReal: number;
  percentualInvestidoRecomendado: number;
}

/**
 * Compara o total gasto/investido no mês contra a regra 50/30/20:
 * 50% para Custos Fixos + Custos Variáveis, 30% para Outros e 20% para
 * Investimentos. `totalsByCategory` deve conter só valores de saída
 * (débitos), como já é calculado em page.tsx.
 */
export function calculateBudgetBenchmark(
  totalsByCategory: Record<Category, number>
): BudgetBenchmark {
  const gastoEssencial =
    totalsByCategory["Custos Fixos"] + totalsByCategory["Custos Variáveis"];
  const gastoOutros = totalsByCategory["Outros"];
  const investido = totalsByCategory["Investimentos"];
  const total = gastoEssencial + gastoOutros + investido;

  return {
    total,
    gastoEssencial,
    gastoOutros,
    investido,
    recomendadoEssencial: total * 0.5,
    recomendadoOutros: total * 0.3,
    recomendadoInvestido: total * 0.2,
    percentualInvestidoReal: total > 0 ? investido / total : 0,
    percentualInvestidoRecomendado: 0.2,
  };
}
