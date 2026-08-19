import { describe, expect, it } from "vitest";
import { parseStatementText } from "./parseStatementText";

describe("parseStatementText", () => {
  it("extrai um lançamento com histórico e favorecido em linhas separadas", () => {
    const text = `
01/06/2026 20,89 (-)	13105 60101 Pix - Enviado
31/05 14:37 RAIA DROGASIL SA
`;
    expect(parseStatementText(text)).toEqual([
      { description: "Pix - Enviado RAIA DROGASIL SA", amount: -20.89 },
    ]);
  });

  it("trata (+) como valor positivo e (-) como negativo", () => {
    const text = `
01/06/2026 498,67 (+)	14397 11149168428702
Pix - Recebido
01/06 11:49 00008863766614 RAFAEL TUDE
01/06/2026 317,48 (-)	13105 60102
Pix - Enviado
31/05 21:32 AUTO POSTO E CONVENIENCIA
`;
    expect(parseStatementText(text)).toEqual([
      { description: "Pix - Recebido RAFAEL TUDE", amount: 498.67 },
      {
        description: "Pix - Enviado AUTO POSTO E CONVENIENCIA",
        amount: -317.48,
      },
    ]);
  });

  it("ignora linhas de saldo anterior, saldo do dia e saldo final", () => {
    const text = `
29/05/2026 372,79 (+)	Saldo Anterior
01/06/2026 70,00 (-)	13105 60103
Pix - Enviado
01/06 11:49 THOMAS YUDI JARRUS
TANABE
463,09 (+)	Saldo do dia
30/06/2026 4.219,23 (+)	S A L D O
`;
    expect(parseStatementText(text)).toEqual([
      {
        description: "Pix - Enviado THOMAS YUDI JARRUS TANABE",
        amount: -70,
      },
    ]);
  });

  it("ignora cabeçalhos de página repetidos no meio de um lançamento", () => {
    const text = `
11/06/2026 10.247,00 (+)	14397 110956497725091 Pix - Recebido

Extrato de Conta Corrente
Cliente RAFAEL TUDELA RIZENTAL
Agência: 352-2 Conta: 886376-8	Período: 01 a 30/06/2026
Lançamentos
Dia Documento Valor	Lote Histórico
11/06 09:56 08863766614 Rafael Tudela
11/06/2026 5.818,29 (-)	13105 61101 Pix - Enviado
11/06 10:00 ANA CLARA TUDELA
`;
    expect(parseStatementText(text)).toEqual([
      { description: "Pix - Recebido Rafael Tudela", amount: 10247 },
      { description: "Pix - Enviado ANA CLARA TUDELA", amount: -5818.29 },
    ]);
  });

  it("extrai compra com cartão e pagamento de fatura", () => {
    const text = `
17/06/2026 71,86 (-)	99008 179044 Compra com Cartão
17/06 21:57 POSTO VEGAS
10/06/2026 1.843,69 (-)	13158 182994129 Pagto cartão crédito
ALTUS VISA
`;
    expect(parseStatementText(text)).toEqual([
      { description: "Compra com Cartão POSTO VEGAS", amount: -71.86 },
      { description: "Pagto cartão crédito ALTUS VISA", amount: -1843.69 },
    ]);
  });

  it("ignora rodapé de aplicações financeiras no fim do extrato", () => {
    const text = `
30/06/2026 70,00 (-)	13105 63001
Pix - Enviado
30/06 15:18 THOMAS YUDI JARRUS
TANABE
30/06/2026 4.219,23 (+)	S A L D O
Total Aplicações Financeiras
* Saldos por dia Base
Sujeitos a confirmação no momento da contratação
0,00
`;
    expect(parseStatementText(text)).toEqual([
      {
        description: "Pix - Enviado THOMAS YUDI JARRUS TANABE",
        amount: -70,
      },
    ]);
  });
});
