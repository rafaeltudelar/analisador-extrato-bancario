import { describe, expect, it } from "vitest";
import { calculateBudgetBenchmark } from "./budgetBenchmark";

describe("calculateBudgetBenchmark", () => {
  it("calcula os valores recomendados como 50/30/20 do total", () => {
    const result = calculateBudgetBenchmark({
      Investimentos: 200,
      "Custos Fixos": 300,
      "Custos Variáveis": 200,
      Outros: 300,
    });

    expect(result.total).toBe(1000);
    expect(result.gastoEssencial).toBe(500);
    expect(result.gastoOutros).toBe(300);
    expect(result.investido).toBe(200);
    expect(result.recomendadoEssencial).toBe(500);
    expect(result.recomendadoOutros).toBe(300);
    expect(result.recomendadoInvestido).toBe(200);
    expect(result.percentualInvestidoReal).toBe(0.2);
    expect(result.percentualInvestidoRecomendado).toBe(0.2);
  });

  it("mostra investimento real abaixo do recomendado", () => {
    const result = calculateBudgetBenchmark({
      Investimentos: 0,
      "Custos Fixos": 500,
      "Custos Variáveis": 1500,
      Outros: 16637.15,
    });

    expect(result.percentualInvestidoReal).toBe(0);
    expect(result.percentualInvestidoRecomendado).toBe(0.2);
  });

  it("retorna zero em tudo quando não há nenhuma transação", () => {
    const result = calculateBudgetBenchmark({
      Investimentos: 0,
      "Custos Fixos": 0,
      "Custos Variáveis": 0,
      Outros: 0,
    });

    expect(result.total).toBe(0);
    expect(result.percentualInvestidoReal).toBe(0);
  });
});
