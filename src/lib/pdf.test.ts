import { describe, expect, it } from "vitest";
import type { Output, Page, Text } from "pdf2json";
import { reconstructReadingOrder } from "./pdf";

function makeText(x: number, y: number, text: string): Text {
  return {
    x,
    y,
    w: 0,
    sw: 0,
    A: "left",
    R: [{ T: encodeURIComponent(text), S: -1, TS: [0, 0, 0, 0] }],
  };
}

function makePage(texts: Text[]): Page {
  return {
    Width: 100,
    Height: 100,
    HLines: [],
    VLines: [],
    Fills: [],
    Texts: texts,
    Fields: [],
    Boxsets: [],
  };
}

describe("reconstructReadingOrder", () => {
  it("ordena os textos de cima para baixo e da esquerda para a direita", () => {
    const output: Output = {
      Transcoder: "test",
      Meta: {},
      Pages: [
        makePage([
          makeText(10, 5, "direita"),
          makeText(1, 5, "esquerda"),
          makeText(1, 1, "topo"),
        ]),
      ],
    };

    expect(reconstructReadingOrder(output)).toBe(
      "topo\nesquerda direita"
    );
  });

  it("junta textos na mesma linha (y proximo) dentro da tolerancia", () => {
    const output: Output = {
      Transcoder: "test",
      Meta: {},
      Pages: [
        makePage([makeText(1, 9.03, "A"), makeText(5, 9.05, "B")]),
      ],
    };

    expect(reconstructReadingOrder(output)).toBe("A B");
  });

  it("troca o rotulo de historico de lugar quando ele vem antes da propria linha de data", () => {
    const output: Output = {
      Transcoder: "test",
      Meta: {},
      Pages: [
        makePage([
          makeText(16, 8.3, "Pix - Recebido"),
          makeText(1, 9.0, "01/06/2026"),
          makeText(30, 9.0, "498,67 (+)"),
        ]),
      ],
    };

    expect(reconstructReadingOrder(output)).toBe(
      "01/06/2026 498,67 (+)\nPix - Recebido"
    );
  });

  it("nao troca linhas de conteudo comuns que nao sao rotulos conhecidos", () => {
    const output: Output = {
      Transcoder: "test",
      Meta: {},
      Pages: [
        makePage([
          makeText(1, 1, "TANABE"),
          makeText(1, 2, "01/06/2026 70,00 (-)"),
        ]),
      ],
    };

    expect(reconstructReadingOrder(output)).toBe(
      "TANABE\n01/06/2026 70,00 (-)"
    );
  });

  it("concatena paginas na ordem em que aparecem", () => {
    const output: Output = {
      Transcoder: "test",
      Meta: {},
      Pages: [
        makePage([makeText(1, 1, "pagina 1")]),
        makePage([makeText(1, 1, "pagina 2")]),
      ],
    };

    expect(reconstructReadingOrder(output)).toBe("pagina 1\npagina 2");
  });
});
