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

1. Publique este repositório no GitHub.
2. Em **Settings → Pages**, escolha a branch `main` (ou `master`) e a pasta **/ (root)**.
3. O arquivo [`.nojekyll`](.nojekyll) evita que o Jekyll ignore pastas com underscore ou arquivos estáticos.
4. A URL fica `https://<usuario>.github.io/<repositorio>/`.

Todos os caminhos são relativos (`css/…`, `js/…`, `assets/…`), então o site sobe tanto em domínio raiz quanto em subpasta `/nome-do-repo/`.

Depois envie o link do Pages no SIGAA.

## Controles

- **WASD** ou setas: um tile por passo. Piso vazio não gera símbolo.
- Tile de evento: tenta a transição daquele símbolo e acrescenta a letra ao roteiro.
- Transição definida: a pilha muda e, em `e`/`s`, o Vigia muda de anel.
- Transição indefinida: estado `qR`, veredito **REJEITADA**, movimento travado.
- `n` válido em `q1` com topo `Z`: estado `q5`, veredito **ACEITA**.
- Campo de texto e os quatro botões processam uma cadeia no mesmo `δ`.
- **R** ou Reiniciar: volta à doca, pilha `Z`, estado `q0`.
- Botão **Som: on/off**: efeitos sintéticos (passos, empilhar, desempilhar, aceita/rejeita). Sem arquivos de áudio externos.

## Enredo e símbolos

Depois do vazamento de solvente, a usina ficou no escuro. Para aliviar a caldeira o Vigia precisa devolver o magazine ao fundo `Z` e girar a válvula na galeria.

| Símbolo | Ação | Pilha |
| --- | --- | --- |
| `a` | apanha lacre quente (o da doca abre a porta) | empilha `A` |
| `k` | apanha lacre frio | empilha `K` |
| `b` | abre comporta quente | desempilha `A` (só se o topo for `A`) |
| `d` | abre comporta fria | desempilha `K` (só se o topo for `K`) |
| `e` | entra no anel | empilha `R` |
| `s` | sela o anel | desempilha `R` (só se o topo for `R`) |
| `n` | gira a válvula | só em `q1` com topo `Z` → `q5` |

`akdbn` é aceita e `akbn` não é: o tipo do topo importa. Os lacres não têm teto. Há no máximo três anéis (`e` não existe em `q4`).

## Definição

`M = (Q, Σ, Γ, δ, q0, Z, {q5})`

- `Q = {q0, q1, q2, q3, q4, q5, qR}`
- `Σ = {a, k, b, d, e, s, n}`
- `Γ = {Z, A, K, R}`
- Pilha inicial: `Z` no fundo. Nas cadeias escritas, o topo é o símbolo à esquerda.
- `δ` parcial e determinística, sem transição vazia.
- Aceitação por **estado final** com a entrada esgotada. No JFLAP: Final State (não Empty Stack).
- Combinação ausente → `qR`. No `automato.jff`, `qR` não tem arestas.

```
δ(q0, a, Z) = (q1, AZ)
δ(q, a, X) = (q, AX)    q ∈ {q1, q2, q3, q4}, X ∈ Γ
δ(q, k, X) = (q, KX)    q ∈ {q1, q2, q3, q4}, X ∈ Γ
δ(q, b, A) = (q, ε)     q ∈ {q1, q2, q3, q4}
δ(q, d, K) = (q, ε)     q ∈ {q1, q2, q3, q4}
δ(q1, e, X) = (q2, RX)  X ∈ Γ
δ(q2, e, X) = (q3, RX)  X ∈ Γ
δ(q3, e, X) = (q4, RX)  X ∈ Γ
δ(q4, s, R) = (q3, ε)
δ(q3, s, R) = (q2, ε)
δ(q2, s, R) = (q1, ε)
δ(q1, n, Z) = (q5, Z)
```

O arquivo [`automato.jff`](automato.jff) expande as regras para cada topo (57 transições). Regenerar: `npm run jff`.

## Exemplos na interface

Espaços são ignorados.

- `a b n` — aceita
- `a k d b n` — aceita (LIFO de dois lacres)
- `a b e e k d s a b s n` — aceita (dois anéis)
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
| `automato.jff` | diagrama para o JFLAP |

A arte do jogo é gerada por código; as fontes Press Start 2P (CodeMan38) e VT323 (Peter Hull) estão sob a SIL Open Font License.
