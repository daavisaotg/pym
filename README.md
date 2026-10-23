# PYM: Arquivo do Multiverso

Site oficial do PYM, comunidade de Roleplay de super-heróis no Discord.
React 19 + TypeScript + Vite, publicado no GitHub Pages.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/
npm run typecheck  # checagem de tipos
```

Requer Node 20 ou mais novo.

## Publicar no GitHub Pages

1. Suba este projeto para um repositório no GitHub (branch `main`).
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
3. Cada push na `main` publica o site automaticamente (`.github/workflows/deploy.yml`).

O caminho base é detectado sozinho (`/nome-do-repo/`). Com domínio próprio, crie a variável
de repositório `VITE_BASE` com o valor `/` em **Settings → Secrets and variables → Actions → Variables**.

## Onde fica cada coisa

```
src/
  content/          ← TODO o conteúdo do site (JSON). É aqui que o painel vai escrever.
    site.json         textos da Home, guia, diretrizes, Anthony, link do Discord
    earths.json       Terras (posição, tema e tamanho do planeta no mapa ficam em "visual")
    characters.json   personagens
    factions.json     facções
    events.json       capítulos da linha do tempo (arcos, temporadas, guerras, registros perdidos)
    status.json       escala oficial de status (Humano → Mega +)
    news.json         notícias
    library.json      verbetes da Biblioteca (artefatos, raças, pactos, tropas, simbiontes)
    magic.json        ala de Kamar-Taj: regras do Núcleo de Mana, kit inicial, livros e páginas
    city.json         mapa de PYM-City: camadas, bairros, ruas, locais e fatos
    world.json        modo Explorar: países e reinos da Terra-001
    fame.json         homenagens do Hall da Fama
  data/
    types.ts          formato de cada registro (leia antes de preencher os JSON)
    repository.ts     contrato de acesso a dados + implementação em JSON
    client.ts         ponto único onde a fonte de dados é escolhida
  app/
    modules.ts        módulos do arquivo (navbar, rotas, busca, telas "In development")
    paths.ts          URL de cada tipo de registro
  router/             roteador próprio, com lazy loading por página
  components/
    layout/           navbar, rodapé, layout
    search/           busca global (Ctrl/⌘ + K)
    effects/          campo de estrelas e rolagem suave
    brand/            logo animado
    ui/               botões, ícones, SEO, tela "In development"
  pages/              uma pasta por página
  styles/
    tokens.css        cores, tipografia, espaçamento — a identidade visual inteira
public/brand/         logos e Anthony
```

## Adicionar conteúdo

Cada arquivo em `src/content/` é uma lista de registros. Os campos estão documentados em
`src/data/types.ts`. Exemplo de personagem:

```json
{
  "id": "peter-parker",
  "slug": "peter-parker",
  "name": "Peter Parker",
  "alias": "Homem-Aranha",
  "alignment": "herói",
  "status": "ativo",
  "earth": "terra-001",
  "summary": "Fotógrafo do Clarim Diário e protetor do Queens.",
  "attributes": [
    { "label": "Força", "value": 72 },
    { "label": "Inteligência", "value": 90 }
  ]
}
```

- `id` nunca muda; outros registros apontam para ele.
- `slug` é a URL (`/database/peter-parker`).
- `"draft": true` esconde o registro do site público.
- Imagens vão em `public/uploads/` e entram como `"image": "uploads/peter.webp"`.

Tudo que entra nos JSON aparece automaticamente na busca global.

### Lore e linha do tempo

Cada capítulo em `events.json` tem `order` (posição na linha do tempo), `kind`
(`temporada`, `arco`, `guerra`, `histórico`, `evento` ou `perdido`), `date` como deve
aparecer, `earths` envolvidas e `body` com a lore. Um bloco de `body` pode ser:

- um texto simples (parágrafo);
- `{ "heading": "Título" }` (intertítulo);
- `{ "speaker": "Nick Fury", "text": "..." }` (fala).

Marque o capítulo em andamento com `"current": true`.

### Terras no mapa

Em `earths.json`, `visual.position` é a posição no mapa (0,0 é o centro), `visual.size` o
raio e `visual.theme` a aparência: `arquivo`, `ultimate`, `desconhecido`, `brasa`, `gelo` ou
`vazio`. `connections` desenha as linhas luminosas entre Terras.

### Biblioteca

Cada verbete em `library.json` tem `category` (`artefatos`, `raças`, `pactos`, `tropas`,
`simbiontes`, `magias`, `tecnologias`, `dimensões`), `name`, `summary` e, se quiser, `image`,
`body` (texto longo, mesmos blocos da lore), `facts` e `related` (ids de personagens, eventos,
Terras, outros verbetes ou `"kamar-taj"`). Sem `image`, o verbete ganha um selo gerado a partir
do nome. Categorias sem verbetes não aparecem.

### Biblioteca de Kamar-Taj

Tudo fica em `magic.json`. Cada livro tem `shelf` (`aprendiz`, `adepto`, `mathet`,
`grao-mestre` ou `universal`) e, quando houver páginas recuperadas, uma lista `pages`. Livros
com páginas brilham na estante e podem ser folheados. Tipos de página:

- `{ "type": "feitiço", "label": "Capítulo 03", "title": "...", "quote": "...", "spell": "...", "description": "...", "mana": "75 Pontos de Mana.", "image": "uploads/..." }`
- `{ "type": "texto", "title": "...", "blocks": ["parágrafo", ...], "facts": [...] }`
- `{ "type": "rasgada", "label": "Trecho 01", "note": "..." }`: página arrancada
- `{ "type": "borrada", "label": "Trecho 02", "note": "..." }`: página ilegível

Para restaurar um livro perdido, basta adicionar `pages` a ele.

### Hall da Fama

Cada homenagem em `fame.json` ocupa uma das 13 estrelas da constelação de Anthony:

```json
{
  "id": "nome-do-jogador",
  "slug": "nome-do-jogador",
  "name": "Nome do homenageado",
  "category": "Jogador",
  "reason": "Motivo da homenagem.",
  "description": "Texto opcional.",
  "period": "Temporadas 10 a 12",
  "image": "uploads/fama/foto.webp",
  "character": "kal-el",
  "star": 6
}
```

`star` (0 a 12) escolhe a estrela; sem ele, a homenagem ocupa a próxima livre. As estrelas
6 e 7 são os olhos, 10 é o queixo, 0 e 3 as pontas das antenas.

### Mapa de PYM-City

Tudo do mapa fica em `city.json`; o formato está em `src/data/city.ts`. A cidade tem quatro
camadas (`layers`): `superior`, `cidade`, `inferioridade` e `campos` (do outro lado do túnel).
Cada registro diz em qual camada fica (`layer`). Coordenadas usam uma prancheta de 1600 × 1000
(0,0 no canto superior esquerdo; a ilha vai mais ou menos de x 110 a 1480 e de y 200 a 810).

- `districts`: bairros e áreas, desenhados por `shape` (lista de pontos). `tone` escolhe a cor
  (`neutro`, `vermelho`, `verde`, `ouro`, `areia`, `sombra`, `tecnologia`) e `labelAt` move o nome.
- `streets`: ruas, avenidas, vias elevadas, galerias e trilhas, desenhadas por `path`.
  `"canonical": true` marca as ruas canônicas (linha vermelha e nome sempre visível).
- `places`: prédios e pontos, com `at` (posição), `icon`, `owner` e, para túneis e bueiros,
  `leadsTo` (a camada para onde levam).
- `facts`: os fatos da seta do canto superior direito. `local` aponta para um slug do mapa e
  `ref` para um registro do arquivo.

Para renomear uma rua ou prédio, troque só o `name`; o `id` continua o mesmo. Fotos vão em
`public/uploads/mapa/` e entram em `images`. Todo registro aceita `summary`, `body` (mesmos blocos
da lore), `facts`, `related` e `"draft": true`.

### Modo Explorar

`world.json` lista os países e reinos (`realms`) com `coords` em `[longitude, latitude]`.
`"reference": true` marca fichas que ainda usam o cânone dos quadrinhos; `link` adiciona um botão
(ex.: PYM-City abre o mapa da cidade) e `labelSide` (`left`, `right`, `below`) afasta nomes
vizinhos.

## Painel administrativo

Abra `/admin` no site (por exemplo `https://usuario.github.io/repo/admin`). O painel não aparece
no menu e não é indexado.

- **Editar:** cada seção (Personagens, Linha do tempo, Facções, Verbetes, Kamar-Taj, PYM-City,
  Explorar, textos da Home, Escala de status) tem lista, busca, criar, duplicar, excluir e
  reordenar. Ruas, bairros e prédios do mapa são posicionados clicando e arrastando num mapa.
- **Rascunho:** tudo fica salvo neste navegador até ser publicado ou descartado.
- **Prévia:** "Prévia do site" abre o site com os rascunhos aplicados, só para você.
- **Publicar:** conecte o repositório com um token *fine-grained* do GitHub (permissão
  **Contents: Read and write**, só neste repositório). Cada publicação vira um commit com os JSON
  e as imagens novas, e o GitHub Actions reconstrói o site em 1 ou 2 minutos.
- **Sem token:** "Baixar .zip" entrega os arquivos já nas pastas certas para subir na mão.

Imagens enviadas pelo painel são reduzidas para no máximo 1600 px, convertidas para WebP e
salvas em `public/uploads/<pasta>/`.

Os formulários ficam em `src/admin/schema.ts`. Campo novo no JSON que não estiver no esquema
aparece em "Outros campos" e continua editável.

## Ativar um módulo

Os módulos ainda não entregues mostram a tela "In development". Quando uma página real ficar
pronta:

1. Crie `src/pages/<modulo>/<Modulo>Page.tsx`.
2. Registre a rota em `src/router/routes.tsx` antes da linha dos módulos.
3. Marque `ready: true` em `src/app/modules.ts`.

## Roteiro

| Fase | Entrega |
|---|---|
| 1 | Base, design system, navbar, busca global, Home ✅ |
| 2 | Database + ficha estilo NSA ✅ |
| 3 | Mapa do Multiverso + linha do tempo ✅ |
| 4 | Facções, Biblioteca, ala de Kamar-Taj, Hall da Fama ✅ |
| 5 | Mapa de PYM-City (quatro camadas) + modo Explorar ✅ |
| 6 | Painel administrativo ✅ |
