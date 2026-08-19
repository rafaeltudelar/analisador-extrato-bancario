"use client";

import { useMemo, useState } from "react";
import { classifyTransaction, type Category } from "@/lib/classifyTransaction";
import { parseStatementText } from "@/lib/parseStatementText";
import { calculateBudgetBenchmark } from "@/lib/budgetBenchmark";
import {
  sugerirCompraAtacado,
  sugerirCorteParaMetaInvestimento,
} from "@/lib/suggestions";

const CATEGORY_BADGE_CLASSES: Record<Category, string> = {
  Investimentos:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "Custos Fixos":
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "Custos Variáveis":
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Outros: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
};

const CATEGORY_BAR_CLASSES: Record<Category, string> = {
  Investimentos: "bg-emerald-500",
  "Custos Fixos": "bg-blue-500",
  "Custos Variáveis": "bg-amber-500",
  Outros: "bg-zinc-400",
};

const CATEGORY_ORDER: Category[] = [
  "Investimentos",
  "Custos Fixos",
  "Custos Variáveis",
  "Outros",
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export default function Home() {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const classifiedLines = useMemo(() => {
    if (!text) return [];
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((description) => ({
        description,
        category: classifyTransaction(description),
      }));
  }, [text]);

  const transactions = useMemo(() => {
    if (!text) return [];
    return parseStatementText(text).map((transaction) => ({
      ...transaction,
      category: classifyTransaction(transaction.description),
    }));
  }, [text]);

  const totalsByCategory = useMemo(() => {
    const totals: Record<Category, number> = {
      Investimentos: 0,
      "Custos Fixos": 0,
      "Custos Variáveis": 0,
      Outros: 0,
    };
    for (const transaction of transactions) {
      if (transaction.amount >= 0) continue;
      totals[transaction.category] += Math.abs(transaction.amount);
    }
    return totals;
  }, [transactions]);

  const totalGasto = useMemo(
    () => Object.values(totalsByCategory).reduce((sum, value) => sum + value, 0),
    [totalsByCategory]
  );

  const maxCategoryTotal = Math.max(...Object.values(totalsByCategory), 0);

  const budgetBenchmark = useMemo(
    () => calculateBudgetBenchmark(totalsByCategory),
    [totalsByCategory]
  );

  const sugestaoCompraAtacado = useMemo(
    () => sugerirCompraAtacado(transactions),
    [transactions]
  );

  const sugestaoInvestimento = useMemo(
    () => sugerirCorteParaMetaInvestimento(budgetBenchmark),
    [budgetBenchmark]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setText(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Erro ao processar o PDF.");
        return;
      }

      setText(data.text);
    } catch {
      setError("Falha de conexão ao enviar o arquivo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Analisador de Extrato Bancário
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Envie um extrato bancário em PDF para extrair e classificar as
          transações.
        </p>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 self-center rounded-lg bg-black px-10 py-4 text-center text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          <span className="text-sm font-medium">
            {loading ? "Processando extrato..." : "Enviar extrato (PDF)"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={loading}
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {text !== null && (
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total gasto
              </p>
              <p className="text-3xl font-semibold text-black dark:text-zinc-50">
                {currencyFormatter.format(totalGasto)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {CATEGORY_ORDER.map((category) => {
                const value = totalsByCategory[category];
                const widthPercent =
                  maxCategoryTotal > 0 ? (value / maxCategoryTotal) * 100 : 0;

                return (
                  <div key={category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE_CLASSES[category]}`}
                      >
                        {category}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {currencyFormatter.format(value)}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                      <div
                        className={`h-full rounded-full ${CATEGORY_BAR_CLASSES[category]}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {text !== null && budgetBenchmark.total > 0 && (
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                Benchmark 50/30/20
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                50% Custos Fixos + Variáveis · 30% Outros · 20% Investimentos
              </p>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-700 dark:text-zinc-300">
                  Custos Fixos + Variáveis (meta 50%)
                </span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {currencyFormatter.format(budgetBenchmark.gastoEssencial)}{" "}
                  <span className="text-zinc-400 dark:text-zinc-500">
                    (recomendado: {currencyFormatter.format(budgetBenchmark.recomendadoEssencial)})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-700 dark:text-zinc-300">
                  Outros (meta 30%)
                </span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {currencyFormatter.format(budgetBenchmark.gastoOutros)}{" "}
                  <span className="text-zinc-400 dark:text-zinc-500">
                    (recomendado: {currencyFormatter.format(budgetBenchmark.recomendadoOutros)})
                  </span>
                </span>
              </div>
            </div>

            <div
              className={`flex flex-col gap-2 rounded-lg p-4 ${
                budgetBenchmark.percentualInvestidoReal >=
                budgetBenchmark.percentualInvestidoRecomendado
                  ? "bg-emerald-50 dark:bg-emerald-950"
                  : "bg-amber-50 dark:bg-amber-950"
              }`}
            >
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Quanto você investiu de verdade
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-black dark:text-zinc-50">
                  {currencyFormatter.format(budgetBenchmark.investido)}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  ({percentFormatter.format(budgetBenchmark.percentualInvestidoReal)}{" "}
                  do total)
                </span>
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Recomendado pela regra 50/30/20:{" "}
                {currencyFormatter.format(budgetBenchmark.recomendadoInvestido)} (
                {percentFormatter.format(budgetBenchmark.percentualInvestidoRecomendado)}
                )
              </span>
            </div>
          </div>
        )}

        {(sugestaoCompraAtacado || sugestaoInvestimento) && (
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-medium text-black dark:text-zinc-50">
              Sugestões
            </h2>

            {sugestaoCompraAtacado && (
              <div className="flex flex-col gap-1 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Considere comprar no atacado
                </span>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Você teve {sugestaoCompraAtacado.quantidadeTransacoes}{" "}
                  compras pequenas (até {currencyFormatter.format(50)}) em
                  mercado/posto/conveniência/farmácia, somando{" "}
                  {currencyFormatter.format(sugestaoCompraAtacado.totalGasto)}
                  . Consolidando essas compras em uma ida ao atacado, a
                  economia estimada é de{" "}
                  <strong>
                    {currencyFormatter.format(
                      sugestaoCompraAtacado.economiaEstimada
                    )}
                  </strong>
                  .
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Estimativa baseada numa economia média de 15% em compras no
                  atacado — não é calculada a partir dos preços reais do seu
                  extrato.
                </p>
              </div>
            )}

            {sugestaoInvestimento && (
              <div className="flex flex-col gap-1 rounded-lg bg-amber-50 p-4 dark:bg-amber-950">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Fechando a meta de 20% investido
                </span>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Faltam{" "}
                  <strong>
                    {currencyFormatter.format(sugestaoInvestimento.faltaParaMeta)}
                  </strong>{" "}
                  para chegar aos 20% recomendados de investimento. Cortando{" "}
                  <strong>
                    {currencyFormatter.format(
                      sugestaoInvestimento.cortarDeOutros
                    )}
                  </strong>{" "}
                  da categoria &quot;Outros&quot; e direcionando esse valor
                  para investimentos, você fecha{" "}
                  {sugestaoInvestimento.atingivelSoComOutros
                    ? "a meta."
                    : "parte da meta — o total gasto em \"Outros\" não é suficiente para cobrir o restante sozinho."}
                </p>
              </div>
            )}
          </div>
        )}

        {classifiedLines.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-black dark:text-zinc-50">
              Linhas classificadas
            </h2>
            <div className="max-h-[600px] overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2">Descrição</th>
                    <th className="px-4 py-2">Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {classifiedLines.map(({ description, category }, index) => (
                    <tr
                      key={`${index}-${description}`}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">
                        {description}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${CATEGORY_BADGE_CLASSES[category]}`}
                        >
                          {category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {text !== null && (
          <details className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ver texto bruto extraído
            </summary>
            <pre className="mt-3 max-h-[400px] overflow-auto whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
              {text}
            </pre>
          </details>
        )}
      </main>
    </div>
  );
}
