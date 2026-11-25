# Vigia-7

Jogo web em pixel art cuja lógica é um **autômato de pilha** determinístico (Trabalho 02 de LFA). O Vigia-7 percorre a Usina 7, lacrada e sem luz; a memória dele é um magazine — a garra só alcança a placa do topo.

Scripts clássicos (sem `import`/`export` no navegador): funciona com servidor local, no GitHub Pages e, se as fontes carregarem, também abrindo `index.html` direto.

## Rodar localmente

Com Node (já incluso no repositório, sem dependências):

```bash
npm start
```

Abra [http://localhost:8080](http://localhost:8080). Outra porta: `PORT=3000 npm start`.

Alternativas:

```bash
python -m http.server 8080
npx --yes serve -l 8080 .
```

Testes do PDA:

```bash
npm test
```

## GitHub Pages

Formalmente em:[ https://wlli173.github.io/PDA-01/](https://wlli173.github.io/PDA-01/)

[Ou acessando por aqui](https://wlli173.github.io/PDA-01/)

## Controles

- **WASD** ou setas: um tile por passo. Piso vazio não gera símbolo.
- Tile de evento: tenta a transição daquele símbolo e acrescenta a letra ao roteiro.
- Transição definida: a pilha muda e, em `e`/`s`, o Vigia muda de anel.
- Transição indefinida (`δ = ∅`): erro — permanece no estado atual, veredito **REJEITADA**, movimento travado.
- Após inspecionar um anel (`s` de volta do anel 1 → `qi`), `n` válido com topo `Z` leva a `q5` (**CALDEIRA ALIVIADA**).
- Campo de texto e os quatro botões processam uma cadeia no mesmo `δ`.
- **R** ou Reiniciar: volta à doca, pilha `Z`, estado `q0`.
- Botão **Som: on/off**: efeitos sintéticos (passos, empilhar, desempilhar, aceita/rejeita). Sem arquivos de áudio externos.

## Enredo e ações

Depois do vazamento de solvente, a usina ficou no escuro. A válvula de alívio só libera depois de uma **inspeção de anel**: descer (`e`), selar (`s`) e voltar à galeria no estado `qi`. Só então, com a pilha em `Z`, gire `n`.

| Símbolo | Ação no mapa | Pilha |
| --- | --- | --- |
| `a` | PEGAR cartucho quente (o da doca abre a porta) | empilha `A` |
| `k` | PEGAR cartucho frio | empilha `K` |
| `b` | ABRIR comporta quente | desempilha `A` (só se o topo for `A`) |
| `d` | ABRIR comporta fria | desempilha `K` (só se o topo for `K`) |
| `e` | DESCER ao anel | empilha `R` |
| `s` | SELAR o anel e subir | desempilha `R` (só se o topo for `R`) |
| `n` | GIRAR a válvula | só em `qi` com topo `Z` → `q5` |

`akdbesn` é aceita e `akbn` / `abn` não são: o tipo do topo importa, e a válvula exige inspeção. Os lacres não têm teto. Há no máximo três anéis (`e` não existe em `q4`).

## Definição

`M = (Q, Σ, Γ, δ, q0, Z, {q5})`

- `Q = {q0, q1, qi, q2, q3, q4, q5}`
- `Σ = {a, k, b, d, e, s, n}`
- `Γ = {Z, A, K, R}`
- Pilha inicial: `Z` no fundo. Nas cadeias escritas, o topo é o símbolo à esquerda.
- `δ` parcial e determinística, sem transição vazia.
- Aceitação por **estado final** com a entrada esgotada. No JFLAP: Final State (não Empty Stack).
- Combinação ausente → erro (`δ = ∅`), sem estado-sumidouro de rejeição.

```
δ(q0, a, Z) = (q1, AZ)
δ(q, a, X) = (q, AX)    q ∈ {q1, qi, q2, q3, q4}, X ∈ Γ
δ(q, k, X) = (q, KX)    q ∈ {q1, qi, q2, q3, q4}, X ∈ Γ
δ(q, b, A) = (q, ε)     q ∈ {q1, qi, q2, q3, q4}
δ(q, d, K) = (q, ε)     q ∈ {q1, qi, q2, q3, q4}
δ(q1, e, X) = (q2, RX)  X ∈ Γ
δ(qi, e, X) = (q2, RX)  X ∈ Γ
δ(q2, e, X) = (q3, RX)  X ∈ Γ
δ(q3, e, X) = (q4, RX)  X ∈ Γ
δ(q4, s, R) = (q3, ε)
δ(q3, s, R) = (q2, ε)
δ(q2, s, R) = (qi, ε)   ← inspeção libera a válvula
δ(qi, n, Z) = (q5, Z)
```

Arquivos JFLAP (regenerar: `npm run jff`):

| Arquivo | Conteúdo |
| --- | --- |
| [`automato.jff`](automato.jff) | δ **expandida** — todas as combinações de topo (71 transições); use para simular |
| [`automato-parcial.jff`](automato-parcial.jff) | esquema **parcial** do diagrama — `X ∈ Γ` não expandido (~29 transições) |

## Exemplos na interface

Espaços são ignorados.

- `a b e s n` — aceita (inspeção mínima)
- `a k d b e s n` — aceita (LIFO de dois lacres + inspeção)
- `a b e e k d s a b s n` — aceita (dois anéis)
- `a b n` — rejeita (válvula sem inspeção)
- `a b e a s n` — rejeita no `s` (topo `A`, não `R`)

Também rejeitam: `a k b`, `a b e n`, `a b`.

## Arquivos

| Caminho | Função |
| --- | --- |
| `index.html` | página, HUD, diagrama SVG |
| `css/style.css` | UI pixelada (Press Start 2P + VT323) |
| `js/pda.js` | motor do autômato |
| `js/world.js` | mapa e salas |
| `js/art.js` | sprites procedurais |
| `js/game.js` | canvas, luz, movimento |
| `js/sfx.js` | sons sintéticos (Web Audio) |
| `js/ui.js` | painel e roteiro |
| `assets/fonts/` | fontes SIL OFL |
| `automato.jff` | PDA expandido para o JFLAP |
| `automato-parcial.jff` | esquema parcial (como no diagrama) |

A arte do jogo é gerada por código; as fontes Press Start 2P (CodeMan38) e VT323 (Peter Hull) estão sob a SIL Open Font License.
