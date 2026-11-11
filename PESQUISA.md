# Pesquisa: como funcionam os apps pagos de violão (novembro de 2026)

Preços em dólar, das lojas dos EUA. No Brasil os valores mudam e as promoções são frequentes;
confira dentro do app antes de assinar.

## Os principais apps

### Simply Guitar (JoyTunes / Simply) — o que você já assinou

- **Como ensina:** começa por um questionário (já toca? o que quer aprender?) e monta um
  "caminho de cursos". O primeiro curso, *Guitar Basics 1*, é o único grátis e precisa ser
  concluído antes do resto. A ordem é: notas soltas e casas → acordes abertos →
  *Strumming Basics* (palhetada para baixo e para cima, padrões, trocar acorde enquanto toca)
  → músicas.
- **Microfone:** escuta pelo microfone do celular e diz se o acorde ou a nota estão certos e se
  você está no tempo. Funciona com violão e guitarra; ambiente silencioso ajuda.
- **Músicas:** trechos curtos no começo (uns 20 segundos), músicas conhecidas de pop e rock.
- **Gamificação:** estrelas, músicas desbloqueadas, sequência de dias, medalhas e lembretes.
  A comparação mais comum nas análises é com o Duolingo.
- **Preço:** a loja da Apple lista compras de US$ 19,99 a US$ 199,99. Análises citam cerca de
  US$ 120 a 150 por ano, 3 meses por US$ 59,99 e vitalício por US$ 299,99. Teste grátis de 7 dias.
- **Críticas:** a detecção às vezes julga errado o acorde; pouco conteúdo depois do básico.

### Yousician

- **Como ensina:** estilo videogame, parecido com Guitar Hero: as notas e acordes vêm numa pista
  rolante e você toca quando passam pela linha. Também faz questionário inicial.
- **Microfone:** usa o microfone do aparelho por padrão, ou uma interface de áudio ligada na
  guitarra. Dá nota para acerto e para tempo, em tempo real.
- **Preço:** US$ 19,99 por mês ou US$ 119,99 por ano; Premium+ a US$ 29,99 por mês.
  Teste de 7 dias.
- **Críticas:** reclamações sobre o julgamento do tempo; adultos e quem já toca acham o formato
  de jogo cansativo; teoria rasa.

### Fender Play

- **Como ensina:** aulas em vídeo com professor, num caminho estruturado por estilo
  (rock, pop, folk...). O foco é o vídeo, não a correção pelo microfone.
- **Preço:** cerca de US$ 9,99 por mês ou US$ 89,99 por ano, teste de 30 dias (fontes mais antigas).
- **Para quem:** iniciante total que prefere ver alguém tocando.

### JustinGuitar

- **Como ensina:** curso para iniciantes em "estágios", com poucos acordes por vez, muito
  respeitado. O site é gratuito.
- **Troca de 1 minuto:** o exercício mais famoso dele. Escolha dois acordes, cronometre 1 minuto
  e conte quantas trocas limpas você faz. Meta do estágio 1: 40 trocas (pares A e D);
  objetivo final: 60 por minuto, uma por segundo.

### Apps que reconhecem acordes, mas não dão aula

- **Chord ai** (US$ 69,99/ano), **Moises** (US$ 39,99/ano), **Strum** (US$ 49,99/ano):
  tiram os acordes de uma gravação ou vídeo. Não corrigem o que você toca.

## O que eles têm em comum

1. **Onboarding com nível:** perguntam se você já toca e adaptam o caminho.
2. **Trilha bloqueada:** você só avança depois de completar a lição anterior.
3. **Microfone dando nota:** acorde certo/errado e batida no tempo/fora do tempo.
4. **Pista rolante** (Yousician, Simply): o que tocar vem chegando numa linha do tempo.
5. **Músicas em pedaços:** treinar a parte e depois a música inteira, com velocidade reduzida.
6. **Gamificação:** estrelas por lição, XP, dias seguidos, meta diária, medalhas.
7. **Ferramentas:** afinador, metrônomo, biblioteca de acordes.

## Como o reconhecimento por microfone funciona

Os apps comerciais não divulgam o algoritmo. A técnica pública clássica, usada em pesquisa
e em projetos abertos, é:

1. Transformar o som em espectro (FFT).
2. Somar a energia de cada nota em 12 classes (Dó, Dó#, ..., Si), o **cromagrama**.
3. Comparar com **moldes** de acordes e escolher o mais parecido.

O detalhe que faz diferença num app de aula: o app **já sabe qual acorde você deveria tocar**.
Então ele não precisa adivinhar entre centenas de acordes; só precisa confirmar se é o esperado,
entre os poucos que aparecem na lição. Isso é bem mais confiável que reconhecer qualquer acorde.

Para o ritmo, usa-se **detecção de ataques** (onset detection): um salto de energia no espectro
marca o instante da palhetada, comparado com o tempo do metrônomo. O atraso do celular
(som saindo e entrando) precisa ser calibrado.

## Segunda rodada: por que o Simply Guitar "parece música" e o nosso não parecia

Depois de testar a primeira versão, a sensação foi de curso de exercícios, não de música.
A pesquisa mostrou de onde vem a diferença:

- **Faixa de acompanhamento.** No Simply, cada lição termina com o que você praticou tocado por
  cima de uma banda. Reviewers descrevem como "tocar com músicos em vez de fazer exercício".
- **A sua parte é mínima.** Nas primeiras lições é uma nota ou uma batida por compasso sobre a
  faixa cheia. A banda faz soar como música; o aluno precisa acertar pouco.
- **Música primeiro.** Professores de adultos recomendam que as primeiras sessões já soem como
  uma música de verdade, ainda que simplificada. É o que mais segura a motivação.
- **Modo "espere por mim"** e velocidades de 60/80/100% (Simply Piano).

O que mudou no Violão de Bolso por causa disso:

- **Banda de acompanhamento** (bateria e baixo sintetizados) nas músicas e nos desafios.
  Não usamos a gravação original nem a melodia cantada, por direitos autorais.
- **"Ouvir como fica"**: a banda toca o refrão com um violão guia.
- **"Sua música"** no topo da tela inicial: a música escolhida, os acordes que faltam e um botão
  para o próximo passo. As músicas não ficam mais trancadas atrás de desafios.
- As lições de acorde ficam sempre abertas, e as unidades do curso aparecem recolhidas.

Fontes desta rodada:
- https://guitar.com/reviews/accessories/simply-guitar-review/
- https://www.riffhard.com/how-to-use-simply-guitar/
- https://stringshock.com/simply-guitar-app-review/
- https://www.musicradar.com/reviews/simply-piano-review
- https://tonypolecastro.com/learn/why-adults-quit-guitar/
- https://www.picktoplayguitar.com/learn-guitar-blog/learn-guitar-adult-beginners-sw-london-emne5

## O que o Violão de Bolso pegou de cada um

| Ideia | De onde | Como ficou |
|---|---|---|
| Questionário inicial e teste de nivelamento | Simply, Yousician | Boas-vindas + teste com 12 acordes |
| Trilha bloqueada com estrelas | Simply, Duolingo | 8 unidades, 41 lições, 1 a 3 estrelas |
| Microfone confere acorde | Simply, Yousician | Cromagrama + moldes feitos a partir da posição dos dedos |
| Pista rolante | Yousician | Blocos de acorde + setas ↓ ↑ passando pela linha |
| Palhetada para baixo → para cima → padrões | Simply (Strumming Basics) | Unidades 1 e 6, ritmo universal ↓ ↓↑ ↑↓↑ |
| Troca de 1 minuto | JustinGuitar | Lições de troca com metas de 10/20/30 e recorde |
| Música por partes e velocidade reduzida | Simply, Yousician | Seções + velocidade 50–100% + 3 níveis de ritmo |
| Sequência de dias, meta diária, medalhas | Simply, Duolingo | Dias seguidos, minutos tocados por dia, 19 conquistas |
| Afinador, metrônomo, dicionário | todos | Aba Treino |
| Indicar corda abafada | — | Bolinhas verde/vermelho embaixo do diagrama |

O que ficou de fora de propósito: vídeo-aulas (Fender Play), backing tracks com a gravação
original (direitos autorais) e letras das músicas (só a sequência de acordes).

## Fontes

- Simply Guitar na App Store: https://apps.apple.com/us/app/id1476695335
- Análise detalhada do Simply Guitar (Screenwise): https://screenwiseapp.com/guides/simply-guitar-app-deep-dive-is-it-the-best-way-to-learn-guitar
- Análise do Simply Guitar (Guitar Chalk): https://www.guitarchalk.com/simply-guitar-review/
- Comparação de 9 apps com "IA": https://aitoolsbakery.com/?p=18814
- Análise do Yousician (Guitar Chalk): https://www.guitarchalk.com/yousician-review/
- Análise do Yousician (Beginner Guitar HQ): https://beginnerguitarhq.com/yousician-guitar-review
- Fender Play x JustinGuitar: https://www.guitarchalk.com/fender-play-vs-justinguitar/
- Troca de 1 minuto (JustinGuitar): https://justinguitar.com/guitar-lessons/one-minute-changes-exercise-b1-110
- Rotina do estágio 1 (JustinGuitar): https://justinguitar.com/guitar-lessons/stage-1-practice-schedule-bc-119
- Reconhecimento de acordes por moldes (FMP, AudioLabs Erlangen): https://audiolabs-erlangen.de/resources/MIR/FMP/C5/C5S2_ChordRec_Templates.html
- Detector de acordes em navegador com cromagrama: https://samyooole.github.io/blog/jekyll/2024/07/18/swatch.html
- Acordes de referência (só a sequência, sem letra):
  - Wonderwall: https://pg.zachmanson.com/tab/oasis/wonderwall-chords-165916
  - Hurt (Johnny Cash): https://www.jonmaclennan.com/blog/hurt-johnny-cash-guitar-lesson
  - Tempo Perdido: https://acordesweb.com/cancion/legiao-urbana/tempo-perdido
  - Pais e Filhos: https://www.vagalume.com.br/legiao-urbana/pais-e-filhos-cifrada.html
  - A Horse With No Name: https://www.guitartabsexplorer.com/america/a-horse-with-no-name-chords
