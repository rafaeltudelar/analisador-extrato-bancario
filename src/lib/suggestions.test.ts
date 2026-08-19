import { describe, expect, it } from "vitest";
import {
  sugerirCompraAtacado,
  sugerirCorteParaMetaInvestimento,
} from "./suggestions";
import { calculateBudgetBenchmark } from "./budgetBenchmark";

describe("sugerirCompraAtacado", () => {
  it("retorna null quando há poucas transações pequenas", () => {
    const transacoes = [
      { description: "MERCADO A", amount: -20, category: "Custos Variáveis" as const },
      { description: "MERCADO B", amount: -15, category: "Custos Variáveis" as const },
    ];
    expect(sugerirCompraAtacado(transacoes)).toBeNull();
  });

  it("sugere compra no atacado quando há muitas transações pequenas na categoria", () => {
    const transacoes = [
      { description: "MERCADO A", amount: -20, category: "Custos Variáveis" as const },
      { description: "MERCADO B", amount: -15, category: "Custos Variáveis" as const },
      { description: "POSTO C", amount: -30, category: "Custos Variáveis" as const },
      { description: "FARMACIA D", amount: -10, category: "Custos Variáveis" as const },
    ];
    const resultado = sugerirCompraAtacado(transacoes);
    expect(resultado).not.toBeNull();
    expect(resultado?.quantidadeTransacoes).toBe(4);
    expect(resultado?.totalGasto).toBe(75);
    expect(resultado?.economiaEstimada).toBeCloseTo(11.25);
  });

  it("ignora transações pequenas de outras categorias", () => {
    const transacoes = [
      { description: "NETFLIX", amount: -20, category: "Custos Fixos" as const },
      { description: "SPOTIFY", amount: -15, category: "Custos Fixos" as const },
      { description: "LOJA X", amount: -10, category: "Outros" as const },
      { description: "LOJA Y", amount: -10, category: "Outros" as const },
    ];
    expect(sugerirCompraAtacado(transacoes)).toBeNull();
  });

  it("ignora transações acima do limite de 'pequena' e créditos", () => {
    const transacoes = [
      { description: "MERCADO A", amount: -20, category: "Custos Variáveis" as const },
      { description: "MERCADO B", amount: -15, category: "Custos Variáveis" as const },
      { description: "ATACADAO GRANDE", amount: -500, category: "Custos Variáveis" as const },
      { description: "PIX RECEBIDO MERCADO", amount: 30, category: "Custos Variáveis" as const },
    ];
    expect(sugerirCompraAtacado(transacoes)).toBeNull();
  });
});

describe("sugerirCorteParaMetaInvestimento", () => {
  it("retorna null quando a meta de 20% já foi atingida", () => {
    const benchmark = calculateBudgetBenchmark({
      Investimentos: 200,
      "Custos Fixos": 300,
      "Custos Variáveis": 200,
      Outros: 300,
    });
    expect(sugerirCorteParaMetaInvestimento(benchmark)).toBeNull();
  });

  it("calcula o corte necessário em Outros quando o investimento está abaixo da meta", () => {
    const benchmark = calculateBudgetBenchmark({
      Investimentos: 0,
      "Custos Fixos": 500,
      "Custos Variáveis": 1500,
      Outros: 8000,
    });
    const resultado = sugerirCorteParaMetaInvestimento(benchmark);
    expect(resultado).not.toBeNull();
    expect(resultado?.faltaParaMeta).toBe(2000);
    expect(resultado?.cortarDeOutros).toBe(2000);
    expect(resultado?.atingivelSoComOutros).toBe(true);
  });

  it("limita o corte sugerido ao total disponível em Outros", () => {
    const benchmark = calculateBudgetBenchmark({
      Investimentos: 0,
      "Custos Fixos": 900,
      "Custos Variáveis": 0,
      Outros: 100,
    });
    const resultado = sugerirCorteParaMetaInvestimento(benchmark);
    expect(resultado?.cortarDeOutros).toBe(100);
    expect(resultado?.atingivelSoComOutros).toBe(false);
  });

  it("retorna null quando não há nenhuma transação", () => {
    const benchmark = calculateBudgetBenchmark({
      Investimentos: 0,
      "Custos Fixos": 0,
      "Custos Variáveis": 0,
      Outros: 0,
    });
    expect(sugerirCorteParaMetaInvestimento(benchmark)).toBeNull();
  });
});
