import { describe, expect, it } from "vitest";
import { classifyTransaction } from "./classifyTransaction";

describe("classifyTransaction", () => {
  describe("Custos Variáveis", () => {
    it("classifica supermercados com prefixo PAG*", () => {
      expect(classifyTransaction("PAG*SUPERMUFFATO 4521")).toBe(
        "Custos Variáveis"
      );
    });

    it("classifica supermercados com prefixo COMPRA", () => {
      expect(classifyTransaction("COMPRA CONDOR SUPERMERCADOS")).toBe(
        "Custos Variáveis"
      );
    });

    it("classifica postos de combustível", () => {
      expect(classifyTransaction("PAG*POSTO IPIRANGA MGA")).toBe(
        "Custos Variáveis"
      );
    });

    it("generaliza para farmácia fora da lista de exemplos", () => {
      expect(classifyTransaction("FARMACIA NISSEI")).toBe(
        "Custos Variáveis"
      );
    });

    it("generaliza para supermercado fora da lista de exemplos", () => {
      expect(classifyTransaction("PAG*SUPERMERCADO GUANABARA")).toBe(
        "Custos Variáveis"
      );
    });

    it("classifica pagamento de fatura de cartão de crédito", () => {
      expect(
        classifyTransaction("Pagto cartão crédito ALTUS VISA")
      ).toBe("Custos Variáveis");
    });
  });

  describe("Custos Fixos", () => {
    it("classifica assinaturas de streaming", () => {
      expect(classifyTransaction("NETFLIX.COM")).toBe("Custos Fixos");
    });

    it("classifica mensalidades", () => {
      expect(classifyTransaction("MENSALIDADE UNICESUMAR")).toBe(
        "Custos Fixos"
      );
    });

    it("classifica plano de saúde", () => {
      expect(classifyTransaction("PLANO SAUDE UNIMED MARINGA")).toBe(
        "Custos Fixos"
      );
    });

    it("generaliza para academia fora da lista de exemplos", () => {
      expect(classifyTransaction("MENSALIDADE ACADEMIA PANOBIANCO")).toBe(
        "Custos Fixos"
      );
    });

    it("generaliza para assinatura de clube fora da lista de exemplos", () => {
      expect(classifyTransaction("CLUBE DE ASSINATURA CHA GOURMET")).toBe(
        "Custos Fixos"
      );
    });
  });

  describe("Investimentos", () => {
    it("classifica corretoras", () => {
      expect(classifyTransaction("XP INVESTIMENTOS CORRETORA")).toBe(
        "Investimentos"
      );
    });

    it("classifica aplicações em renda fixa", () => {
      expect(classifyTransaction("CDB NUBANK APLICACAO")).toBe(
        "Investimentos"
      );
    });

    it("classifica compra de ações", () => {
      expect(classifyTransaction("COMPRA ACOES B3")).toBe("Investimentos");
    });

    it("generaliza para corretora fora da lista de exemplos", () => {
      expect(classifyTransaction("AVENUE INVESTIMENTOS")).toBe(
        "Investimentos"
      );
    });

    it("generaliza para aporte em fundo fora da lista de exemplos", () => {
      expect(classifyTransaction("APORTE MENSAL FUNDO XP")).toBe(
        "Investimentos"
      );
    });
  });

  describe("Outros", () => {
    it("classifica pedidos de delivery", () => {
      expect(classifyTransaction("IFOOD *PEDIDO 88213")).toBe("Outros");
    });

    it("classifica lojas de varejo", () => {
      expect(classifyTransaction("LOJA RENNER")).toBe("Outros");
    });

    it("classifica restaurantes", () => {
      expect(classifyTransaction("RESTAURANTE OUTBACK")).toBe("Outros");
    });

    it("generaliza para loja de departamento fora da lista de exemplos", () => {
      expect(classifyTransaction("PAG*CASAS BAHIA")).toBe("Outros");
    });

    it("retorna Outros quando nada é reconhecido", () => {
      expect(classifyTransaction("COMPRA GENERICA NAO IDENTIFICADA")).toBe(
        "Outros"
      );
    });

    it("mantém Pix para pessoa física em Outros (ambíguo por natureza)", () => {
      expect(
        classifyTransaction("Pix - Enviado ANA CLARA TUDELA")
      ).toBe("Outros");
    });

    it("compra com cartão em estabelecimento não identificado fica em Outros", () => {
      expect(
        classifyTransaction("Compra com Cartão GRUPO HABANERO")
      ).toBe("Outros");
    });
  });

  describe("casos de borda", () => {
    it("retorna Outros para descrição vazia", () => {
      expect(classifyTransaction("")).toBe("Outros");
    });

    it("retorna Outros para descrição só com espaços", () => {
      expect(classifyTransaction("   ")).toBe("Outros");
    });

    it("é case-insensitive (tudo minúsculo)", () => {
      expect(classifyTransaction("netflix.com")).toBe("Custos Fixos");
    });

    it("é case-insensitive (tudo maiúsculo)", () => {
      expect(classifyTransaction("COMPRA CARREFOUR BR")).toBe(
        "Custos Variáveis"
      );
    });

    it("ignora acentos na descrição", () => {
      expect(classifyTransaction("FARMÁCIA SÃO JOÃO")).toBe(
        "Custos Variáveis"
      );
    });

    it("ignora código numérico solto no fim da descrição", () => {
      expect(classifyTransaction("PAG*DROGASIL 0231")).toBe(
        "Custos Variáveis"
      );
    });
  });
});
