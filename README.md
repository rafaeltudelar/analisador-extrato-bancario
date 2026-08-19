# Analisador de Extrato Bancário

## 1. O que o projeto faz

Um analisador de extrato bancário em PDF: o usuário envia o PDF do extrato, o
app extrai as transações, classifica cada uma em 4 categorias fixas
(**Investimentos**, **Custos Fixos**, **Custos Variáveis**, **Outros**),
compara o resultado com a regra de alocação **50/30/20**, e sugere
otimizações de economia (ex.: consolidar compras pequenas no atacado, cortar
gastos em "Outros" para fechar a meta de investimento).

É um projeto de estudo pessoal, feito para o Trabalho Prático 1 — **não é
uma feature da Escola de TI**.

## 2. System prompt

Copiado exatamente do `CLAUDE.md` deste projeto:

```
Você é um engenheiro de software sênior atuando como par de programação no
desenvolvimento do "Analisador de Extrato Bancário": um app Next.js/TypeScript
que classifica transações bancárias em 4 categorias fixas (Investimentos,
Custos Fixos, Custos Variáveis, Outros) usando um pipeline de regras em
cascata, a partir de um PDF de extrato enviado pelo usuário.

Regras de comportamento:
1. Antes de adicionar qualquer dependência nova ao projeto, pergunte e
   justifique por que ela é necessária.
2. Toda função de classificação ou de parsing deve ser pura e testável
   isoladamente, sem I/O de arquivo/rede dentro da própria função.
3. Ao gerar código, explique em 1-2 frases a decisão tomada antes do bloco
   de código — não apenas entregue o código.
4. Priorize simplicidade sobre abstração — é um MVP acadêmico com prazo
   curto, não um produto em produção.
5. Nunca invente nomes de bibliotecas, funções ou APIs sem ter certeza de
   que existem; se não tiver certeza, diga isso explicitamente.
```

## 3. Técnica de prompt engineering aplicada: few-shot prompting

Para implementar `classifyTransaction` (o pipeline de regras que decide a
categoria de cada transação), usamos **few-shot prompting**: em vez de
descrever a regra de classificação em linguagem abstrata ("classifique
transações de mercado como Custos Variáveis"), demos ao modelo cerca de
**200 exemplos reais de entrada/saída** — descrições de transações de
extratos brasileiros reais, cada uma com a categoria correta esperada.

**Justificativa:** descrever a regra em linguagem abstrata gera resultados
inconsistentes, porque o modelo precisa adivinhar o formato exato das
descrições de um extrato real (abreviações, prefixos como `PAG*`, códigos
numéricos soltos, variações de grafia). Exemplos concretos ancoram o modelo
no formato exato esperado, em vez de depender da sua interpretação de uma
regra abstrata.

Essa técnica ajudou a encontrar e corrigir **2 bugs reais** sozinha, durante
os testes — os próprios exemplos revelaram colisões que uma regra abstrata
não teria exposto. O caso mais claro: `"NETFLIX.COM"` caindo em
**Investimentos** por colisão acidental com a palavra-chave `"ETF"` (que
aparece como substring dentro de "N**ETF**LIX"). A correção ficou registrada
no próprio código-fonte — `classifyTransaction.ts` distingue hoje entre
"stems" (substring livre) e "words" (palavra inteira, com borda de espaço)
justamente por causa desse tipo de falso positivo:

```ts
/**
 * "Words" só casam como palavra inteira (com espaço/borda dos dois lados),
 * pra evitar falso positivo de termos curtos (ex.: "ETF" dentro de "NETFLIX").
 */
function matchesAnyWord(normalized: string, words: string[]): boolean {
  const padded = ` ${normalized} `;
  return words.some((word) => padded.includes(` ${word} `));
}
```

## 4. Teste de curadoria de contexto

Comparamos duas versões da mesma pergunta sobre `classifyTransaction.ts`:

| Versão | Como o arquivo foi passado | Custo |
|---|---|---|
| A | Conteúdo inteiro do arquivo colado diretamente na mensagem | US$ 0,23 |
| B | Arquivo referenciado como `@classifyTransaction.ts` | US$ 0,21 |

**Conclusão honesta:** a diferença de custo foi pequena (US$ 0,02) porque,
nos dois casos, o Claude Code acaba lendo o arquivo inteiro — seja porque
foi colado na mensagem, seja porque a referência `@arquivo` também carrega o
conteúdo completo para o contexto. A economia real de tokens só aparece
quando se referencia um **trecho específico** do arquivo (uma função, um
intervalo de linhas), não o arquivo completo. Referenciar o arquivo inteiro
por `@` é mais conveniente de digitar, mas não é, por si só, uma técnica de
economia de contexto.

## 5. Tabela de custos por chamada

Modelo: **Claude Sonnet 5**, via Claude Code. Preços de referência: input
US$ 2 / 1M tokens, output US$ 10 / 1M tokens (tabela oficial em
[platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing)).

O painel `/usage` do Claude Code mostra, além de Entrada/Saída, duas colunas
adicionais — **Leitura de cache** e **Gravação de cache** (prompt caching) —
que têm preço próprio, diferente do input/output "puro", e são o principal
componente do custo em sessões longas (uma chamada com só 6 tokens de
entrada pode custar US$ 0,19 por causa disso). A tabela abaixo inclui essas
colunas para que o cálculo seja auditável de ponta a ponta; sem elas, a
fórmula `custo = entrada×preço_in + saída×preço_out` do enunciado não
reconcilia com a coluna "Custo" — não porque os números estejam errados, mas
porque o cache não está incluído nessa fórmula simplificada.

O painel "Esta sessão" do Claude Code mostra o **acumulado desde o início da
sessão**, não o gasto de uma chamada isolada. Por isso, cada linha abaixo
aparece em duas linhas de tabela:

- **Acumulado (print)** — o número exatamente como aparece no screenshot,
  direto da pasta [`EVIDENCIAS/`](EVIDENCIAS/), sem nenhuma conta feita.
- **Δ desta chamada** (em negrito) — a diferença entre esse print e o
  print imediatamente anterior *da mesma sessão*. É esse valor — não o
  acumulado — que entra na coluna "Custo" e na soma total, porque o
  acumulado já inclui o gasto de todas as chamadas anteriores.

Quando uma chamada foi feita numa sessão nova (sem chamada anterior no
mesmo contador), Acumulado e Δ são iguais — não há nada a subtrair.

| # | Chamada | Estado | Entrada | Saída | Leitura cache | Gravação cache | Custo (US$) |
|---|---|---|---|---|---|---|---|
| 01 | Criar CLAUDE.md (system prompt) | Acumulado (print) | 6 | 7 | 129.300 | 48.600 | 0,19 |
| | *(1ª chamada da sessão)* | **Δ desta chamada** | **6** | **7** | **129.300** | **48.600** | **0,19** |
| 02 | Inicializar projeto Next.js + TypeScript | Acumulado (print) | 38 | 58 | 1.100.000 | 57.500 | 0,43 |
| | | **Δ desta chamada** | **32** | **51** | **970.700** | **8.900** | **0,24** |
| 03 | Implementar extração de texto do PDF | Acumulado (print) | 200 | 4.500 | 7.600.000 | 211.000 | 1,63 |
| | | **Δ desta chamada** | **162** | **4.442** | **6.500.000** | **153.500** | **1,20** |
| 04 | Rodar servidor local (npm run dev) | Acumulado (print) | 210 | 4.600 | 8.100.000 | 212.100 | 1,76 |
| | | **Δ desta chamada** | **10** | **100** | **500.000** | **1.100** | **0,13** |
| 05 | Classificação few-shot (200 exemplos) + testes Vitest | Acumulado (print) | 226 | 107.800 | 10.900.000 | 212.100 | 3,84 |
| | | **Δ desta chamada** | **16** | **103.200** | **2.800.000** | **0** | **2,08** |
| 06 | Integrar classificação na tela | Acumulado (print) | 332 | 108.200 | 20.600.000 | 754.200 | 3,77 |
| | *(⚠️ acumulado caiu — anomalia do painel)* | **Δ desta chamada** | — | — | — | — | **não confiável** |
| 07A | Curadoria de contexto — arquivo inteiro colado | Acumulado (print) | 4 | 4 | 70.200 | 52.400 | 0,23 |
| | *(sessão nova, isolada)* | **Δ desta chamada** | **4** | **4** | **70.200** | **52.400** | **0,23** |
| 07B | Curadoria de contexto — `@arquivo` referenciado | Acumulado (print) | 4 | 4 | 70.200 | 53.300 | 0,21 |
| | *(sessão nova, isolada)* | **Δ desta chamada** | **4** | **4** | **70.200** | **53.300** | **0,21** |
| 08 | Tela de upload + parser de valor (v1) | Acumulado (print) | 64 | 198 | 2.300.000 | 106.600 | 0,82 |
| | *(continua a sessão de 07B)* | **Δ desta chamada** | **60** | **194** | **2.229.800** | **53.300** | **0,61** |
| 09 | Corrigir parser p/ formato real do extrato do BB | Acumulado (print) | 154 | 377 | 7.300.000 | 257.300 | 2,40 |
| | | **Δ desta chamada** | **90** | **179** | **5.000.000** | **150.700** | **1,58** |
| 10 | Corrigir soma do total (só débitos) | Acumulado (print) | — | — | — | — | não capturado |
| | | **Δ desta chamada** | — | — | — | — | **não capturado** |
| 11 | Ajustar classificação (Pagto cartão → Custos Variáveis) | Acumulado (print) | 224 | 577 | 12.900.000 | 546.600 | 2,00 |
| | *(sessão nova, isolada)* | **Δ desta chamada** | **224** | **577** | **12.900.000** | **546.600** | **2,00** |
| 12 | Implementar regra 50/30/20 | Acumulado (print) | 288 | 788 | 18.800.000 | 574.700 | 3,36 |
| | *(continua a sessão da chamada 11)* | **Δ desta chamada** | **64** | **211** | **5.900.000** | **28.100** | **1,36** |
| 13 | Implementar tela de sugestões | Acumulado (print) | 334 | 953 | 23.600.000 | 601.700 | 4,57 |
| | | **Δ desta chamada** | **46** | **165** | **4.800.000** | **27.000** | **1,21** |
| 14–16 | Diagnóstico + correção do deploy no Vercel (lockfile, fetch, troca pdf-parse → pdf2json) | Acumulado (print, fim da sessão) | 746 | ~2.000 | 79.600.000 | 1.200.000 | 17,82 |
| | *(print do início desta sessão não foi capturado — ver nota abaixo)* | **Δ (melhor estimativa)** | **746** | **~2.000** | **79.600.000** | **1.200.000** | **17,82** |

**Total: US$ 28,86** (soma da linha "Δ desta chamada" de cada bloco, exceto 06 e 10)

**Nota de honestidade:**

- A chamada 06 teve uma inconsistência real no painel do Claude Code: o
  custo acumulado da sessão **caiu** de US$ 3,84 (fim da chamada 05) para
  US$ 3,77, o que não deveria ser possível num contador cumulativo. Não
  sabemos a causa exata (possível recálculo interno da ferramenta), então o
  custo individual dessa chamada não é confiável e não entra na soma.
- A chamada 10 não teve o `/usage` capturado no momento certo, então seu
  custo não está incluído — o total de US$ 28,86 é, por isso, uma
  estimativa levemente subestimada.
- O bloco 14–16 foi capturado como custo agregado de uma sessão contínua;
  não temos o print do início exato dessa sessão, então não é possível
  confirmar que US$ 17,82 é puramente o delta dessas três correções (pode
  incluir alguns minutos de trabalho anterior não discriminado). É o número
  mais preciso disponível com os dados capturados.
- Todas as demais linhas (01–05, 07A, 07B, 08–09, 11–13) foram verificadas
  cruzando os prints de "antes" e "depois" no painel — os valores de
  Entrada, Saída, cache e Custo reconciliam exatamente por subtração entre
  chamadas consecutivas da mesma sessão.

**Rastreabilidade — print de origem de cada linha "Acumulado":**

| Chamada | Arquivo em `EVIDENCIAS/` |
|---|---|
| 01 | `Chamada 1 Criar CLAUDE.md - Entrada6, Saída7, CustoUS$ 0,19.png` |
| 02 | `Chamada 2 - Criar projeto Next.js - Entrada 32 - Saída 51 - Custo US$ 0,24.png` |
| 03 | `Chamada 3 - Extrair PDF - Entrada 200 - 38 = 162 - Saída 4500 - 58 = 4442 - Custo 1,63 - 0,43 = US$ 1,20.png` |
| 04 | `Chamada 4 - Rodar npm run dev - Entrada 10 - Saída 100 - Custo US$ 0,13.png` |
| 05 | `Chamada 5 - Classificação + testes (Vitest) - Entrada 16 - Saída 103.200 - Custo US$ 2,08.png` |
| 06 | `Chamada 6 - Integrar classificação na tela - Entrada 332 - Saída 108.200 - Custo total acumulado nesse ponto US$ 3,77.png` |
| 07A | `Chamada 7.1.1 Entrada 4 Saída 4 Leitura de cache 70,2k Gravação de cache 52,4k Custo US$ 0,23.png` |
| 07B | `Chamada 7.2.2 Entrada 4 Saída 4 Leitura de cache 70,2k Gravação de cache 53,3k Custo US$ 0,21.png` |
| 08 | `Chamada 8entrada60saida94Custo 0,61 .png` (acumulado, apesar do nome sugerir o Δ) |
| 09 | `Chamada 8.1.png` |
| 11 | `Chamada 8.2.png` |
| 12 | `CHAMADA 9.png` (nome enganoso — o conteúdo é da regra 50/30/20, não da chamada 09 da tabela) |
| 13 | `Chamada 10.png` (nome enganoso — o conteúdo é da tela de sugestões, não da chamada 10 da tabela) |
| 14–16 (fim) | `Chamda 12.png` e `Chamada final.png` (mesmo estado, dois prints) |
| 14–16 (meio, não usado na tabela) | `Chamada 12.png` — mostra o estado no meio dessa sessão (Entrada 508, Saída 1.400, Custo US$ 8,54), útil pra conferência mas não usado diretamente na tabela |

Os arquivos "CHAMADA 9.png" e "Chamada 10.png" têm nomes que não batem com
o conteúdo real — foram nomeados por duas pessoas em momentos diferentes e
a numeração não é a mesma da tabela. Os números dentro deles, porém, foram
conferidos e batem exatamente com as linhas 12 e 13 por diferença.

## 6. Prints

Todos os prints das chamadas e do painel de `/usage` estão na pasta
[`EVIDENCIAS/`](EVIDENCIAS/) deste repositório. Alguns prints eram grandes
demais para colar individualmente aqui no README, então essas respostas e
usages ficaram reunidos em [`EVIDENCIAS/evidencias.pdf`](EVIDENCIAS/evidencias.pdf).

## 7. Link publicado

[https://analisador-extrato-bancario-tan.vercel.app](https://analisador-extrato-bancario-tan.vercel.app)

## 8. Grupo

Augusto Palma Guglielmi — RA: 23021606-2

Fabrício Notoya Thomas — RA: 23082446-2

Pietro Pasqual Silva — RA: 23183509-2

Rafael Tudela Rizental — RA: 23015480-2

Thiago Lopes Martins — RA: 23016365-2
