/* Conteúdo do curso: ritmos, unidades da trilha, músicas, conquistas e níveis.
 * As músicas trazem só a sequência de acordes (sem letra). As estruturas são
 * versões simplificadas para estudo.
 */
(function () {
  'use strict';

  // Padrões de palhetada: 8 colcheias por compasso de 4 tempos.
  // B = para baixo, C = para cima, - = mão passa sem tocar
  const PADROES = {
    q1: { nome: '1 batida por compasso', curto: '↓ · · ·', slots: ['B', '-', '-', '-', '-', '-', '-', '-'] },
    q2: { nome: '2 batidas por compasso', curto: '↓ · ↓ ·', slots: ['B', '-', '-', '-', 'B', '-', '-', '-'] },
    q4: { nome: 'Para baixo nos 4 tempos', curto: '↓ ↓ ↓ ↓', slots: ['B', '-', 'B', '-', 'B', '-', 'B', '-'] },
    c8: { nome: 'Colcheias (baixo e cima)', curto: '↓↑ ↓↑ ↓↑ ↓↑', slots: ['B', 'C', 'B', 'C', 'B', 'C', 'B', 'C'] },
    ddu: { nome: 'Baixo, baixo-cima', curto: '↓ ↓↑ ↓ ↓↑', slots: ['B', '-', 'B', 'C', 'B', '-', 'B', 'C'] },
    pop: { nome: 'Ritmo universal do violão', curto: '↓ ↓↑ ↑↓↑', slots: ['B', '-', 'B', 'C', '-', 'C', 'B', 'C'] }
  };

  const UNIDADES = [
    {
      id: 'u1', titulo: 'Primeiros passos', subtitulo: 'Conheça o violão, afine e sinta o pulso',
      licoes: [
        {
          id: 'u1-conheca', tipo: 'info', titulo: 'Conheça o violão', resumo: 'Cordas, dedos e como ler um acorde',
          paginas: [
            { titulo: 'As 6 cordas', figura: 'cordas', texto: 'As cordas são numeradas de baixo para cima quando você segura o violão: a <b>1ª corda</b> é a mais fina (Mi agudo) e a <b>6ª</b> é a mais grossa (Mi grave). Da 6ª para a 1ª, as notas soltas são <b>Mi, Lá, Ré, Sol, Si, Mi</b>.' },
            { titulo: 'Os dedos da mão do braço', figura: 'dedos', texto: 'Na mão que aperta as cordas, os dedos têm número: <b>1</b> indicador, <b>2</b> médio, <b>3</b> anelar e <b>4</b> mínimo. O polegar fica atrás do braço do violão, mais ou menos atrás do dedo 2.' },
            { titulo: 'Como ler um diagrama de acorde', figura: 'diagrama', texto: 'Linhas verticais são as cordas (a 6ª fica à esquerda). Linhas horizontais são os trastes. A bolinha mostra onde apertar e o número diz qual dedo usar. <b>O</b> em cima = corda solta (toque sem apertar). <b>X</b> = não toque essa corda.' },
            { titulo: 'Postura e som limpo', figura: 'traste', texto: 'Aperte a corda <b>logo atrás do traste</b>, não em cima dele nem no meio da casa. Use a ponta dos dedos, com as unhas da mão do braço curtas. Se a corda zumbir, aperte um pouco mais ou chegue mais perto do traste.' },
            { titulo: 'Como o app escuta você', figura: 'celular', texto: 'Deixe o celular a uns 50 cm do violão, em um lugar silencioso, com a tela virada para você. O app compara o som com o acorde esperado. Fone de ouvido ajuda: o clique do metrônomo não atrapalha a escuta.' }
          ],
          quiz: [
            { pergunta: 'Qual é a 1ª corda?', opcoes: ['A mais fina (Mi agudo)', 'A mais grossa (Mi grave)', 'A do meio (Sol)'], certa: 0 },
            { pergunta: 'No diagrama, o que significa um X em cima da corda?', opcoes: ['Corda solta', 'Não tocar essa corda', 'Usar o dedo 10'], certa: 1 },
            { pergunta: 'Onde você aperta a corda para soar limpo?', opcoes: ['Em cima do traste', 'No meio da casa', 'Logo atrás do traste'], certa: 2 }
          ]
        },
        { id: 'u1-afinar', tipo: 'afinar', titulo: 'Afine o violão', resumo: 'O afinador escuta cada corda' },
        { id: 'u1-calibrar', tipo: 'calibrar', titulo: 'Sincronize o app', resumo: 'Mede o atraso do seu celular' },
        { id: 'u1-ritmo', tipo: 'ritmo', titulo: 'Palhetada para baixo', resumo: 'Cordas abafadas, 4 batidas por compasso', padrao: 'q4', bpm: 60, compassos: 4, acorde: null }
      ]
    },
    {
      id: 'u2', titulo: 'Seus primeiros acordes', subtitulo: 'Em e D6/9: já dá para tocar uma música',
      licoes: [
        { id: 'u2-em', tipo: 'acorde', acorde: 'Em', titulo: 'Acorde Em', resumo: 'Mi menor, com 2 dedos' },
        { id: 'u2-em-ritmo', tipo: 'ritmo', titulo: 'Em no ritmo', resumo: 'Em com 4 batidas por compasso', padrao: 'q4', bpm: 65, compassos: 4, acorde: 'Em' },
        { id: 'u2-d69', tipo: 'acorde', acorde: 'D69', titulo: 'Acorde D6/9', resumo: 'Mesmos dedos do Em, em outras cordas' },
        { id: 'u2-troca', tipo: 'troca', a: 'Em', b: 'D69', titulo: 'Troca Em ↔ D6/9', resumo: 'Quantas trocas em 1 minuto?', metas: [10, 20, 30] },
        { id: 'u2-troca-tempo', tipo: 'progressao', titulo: 'Troca no tempo: Em e D6/9', resumo: 'Uma batida por compasso e 3 tempos para trocar', compassos: 'Em | D69', repetir: 4, padrao: 'q1', bpm: 60 },
        { id: 'u2-desafio', tipo: 'progressao', titulo: 'Desafio: Em e D6/9', resumo: 'Feche a unidade tocando com a banda', compassos: 'Em | D69 | Em | D69', repetir: 2, padrao: 'q4', bpm: 70, desafio: true }
      ]
    },
    {
      id: 'u3', titulo: 'Lá menor e Mi maior', subtitulo: 'O formato que se repete',
      licoes: [
        { id: 'u3-am', tipo: 'acorde', acorde: 'Am', titulo: 'Acorde Am', resumo: 'Lá menor' },
        { id: 'u3-troca-em-am', tipo: 'troca', a: 'Em', b: 'Am', titulo: 'Troca Em ↔ Am', resumo: '1 minuto de trocas', metas: [10, 20, 30] },
        { id: 'u3-troca-tempo', tipo: 'progressao', titulo: 'Troca no tempo: Em e Am', resumo: 'Uma batida por compasso e 3 tempos para trocar', compassos: 'Em | Am', repetir: 4, padrao: 'q1', bpm: 60 },
        { id: 'u3-e', tipo: 'acorde', acorde: 'E', titulo: 'Acorde E', resumo: 'Mi maior: o Am uma corda acima' },
        { id: 'u3-troca-e-am', tipo: 'troca', a: 'E', b: 'Am', titulo: 'Troca E ↔ Am', resumo: 'O formato só muda de corda', metas: [10, 20, 30] },
        { id: 'u3-desafio', tipo: 'progressao', titulo: 'Desafio: Am, Em e E', resumo: 'Três acordes no ritmo', compassos: 'Am | Em | E | Am', repetir: 2, padrao: 'q4', bpm: 70, desafio: true }
      ]
    },
    {
      id: 'u4', titulo: 'Ré e Lá', subtitulo: 'Acordes das 4 e 5 cordas',
      licoes: [
        { id: 'u4-d', tipo: 'acorde', acorde: 'D', titulo: 'Acorde D', resumo: 'Ré maior, o triângulo' },
        { id: 'u4-a', tipo: 'acorde', acorde: 'A', titulo: 'Acorde A', resumo: 'Lá maior, três dedos juntos' },
        { id: 'u4-troca-a-d', tipo: 'troca', a: 'A', b: 'D', titulo: 'Troca A ↔ D', resumo: 'A troca clássica do iniciante', metas: [10, 20, 30] },
        { id: 'u4-troca-tempo', tipo: 'progressao', titulo: 'Troca no tempo: A e D', resumo: 'Uma batida por compasso e 3 tempos para trocar', compassos: 'A | D', repetir: 4, padrao: 'q1', bpm: 60 },
        { id: 'u4-desafio', tipo: 'progressao', titulo: 'Desafio: A, D e E', resumo: 'A base de mil músicas', compassos: 'A | D | A | E', repetir: 2, padrao: 'q4', bpm: 72, desafio: true }
      ]
    },
    {
      id: 'u5', titulo: 'Sol e Dó', subtitulo: 'Os acordes mais usados do violão',
      licoes: [
        { id: 'u5-g', tipo: 'acorde', acorde: 'G', titulo: 'Acorde G', resumo: 'Sol maior' },
        { id: 'u5-c', tipo: 'acorde', acorde: 'C', titulo: 'Acorde C', resumo: 'Dó maior, a escadinha' },
        { id: 'u5-troca-g-c', tipo: 'troca', a: 'G', b: 'C', titulo: 'Troca G ↔ C', resumo: '1 minuto de trocas', metas: [10, 20, 30] },
        { id: 'u5-troca-tempo', tipo: 'progressao', titulo: 'Troca no tempo: G e C', resumo: 'Uma batida por compasso e 3 tempos para trocar', compassos: 'G | C', repetir: 4, padrao: 'q1', bpm: 60 },
        { id: 'u5-troca-g-d', tipo: 'troca', a: 'G', b: 'D', titulo: 'Troca G ↔ D', resumo: '1 minuto de trocas', metas: [10, 20, 30] },
        { id: 'u5-desafio', tipo: 'progressao', titulo: 'Desafio: G, D, Am e C', resumo: 'Feche a unidade tocando com a banda', compassos: 'G | D | Am | Am | G | D | C | C', repetir: 1, padrao: 'q4', bpm: 68, desafio: true }
      ]
    },
    {
      id: 'u6', titulo: 'Palhetada para cima', subtitulo: 'A mão que nunca para',
      licoes: [
        {
          id: 'u6-info', tipo: 'info', titulo: 'Baixo e cima', resumo: 'Como funciona a mão do ritmo',
          paginas: [
            { titulo: 'A mão é um pêndulo', figura: 'pendulo', texto: 'A mão do ritmo sobe e desce o tempo todo, como um pêndulo. <b>Para baixo (↓)</b> cai em cima do tempo (1, 2, 3, 4). <b>Para cima (↑)</b> cai no "e" entre os tempos (1 <b>e</b> 2 <b>e</b>...).' },
            { titulo: 'Batida fantasma', figura: 'fantasma', texto: 'Quando o padrão tem um espaço (·), a mão continua o movimento, mas passa <b>sem encostar</b> nas cordas. É isso que mantém o ritmo firme. No ritmo universal (↓ ↓↑ ↑↓↑), a mão desce sem tocar no tempo 3.' },
            { titulo: 'Monte o ritmo em etapas', figura: 'fantasma', texto: 'Ninguém aprende ↓ ↓↑ ↑↓↑ de uma vez. Primeiro toque todas as 8 batidas (↓↑↓↑↓↑↓↑) com as cordas abafadas. Depois vá <b>tirando batidas</b>, sem mudar o movimento da mão. Na pista, a bolinha ao lado da linha é a sua mão: suba e desça junto com ela.' },
            { titulo: 'Trocar sem parar a mão', figura: 'pendulo', texto: 'A mão do ritmo <b>nunca espera</b> a mão dos acordes. Comece a soltar o acorde na última batida para cima do compasso. Tudo bem essa batida pegar cordas soltas: é assim que todo mundo toca.' },
            { titulo: 'Para cima é mais leve', figura: 'pendulo', texto: 'Na palhetada para cima, pegue só as 3 ou 4 cordas mais finas, com menos força. O app escuta o <b>momento</b> de cada batida. A direção (↓ ou ↑) ele não consegue ouvir, então siga as setas.' }
          ],
          quiz: [
            { pergunta: 'Em que momento cai a palhetada para baixo?', opcoes: ['Em cima do tempo (1, 2, 3, 4)', 'No "e" entre os tempos', 'Só no final do compasso'], certa: 0 },
            { pergunta: 'O que a mão faz no espaço (·) do padrão?', opcoes: ['Para e espera', 'Continua o movimento sem tocar', 'Toca mais forte'], certa: 1 }
          ]
        },
        { id: 'u6-colcheias', tipo: 'ritmo', titulo: 'Baixo e cima sem parar', resumo: 'Cordas abafadas, 8 batidas', padrao: 'c8', bpm: 60, compassos: 4, acorde: null },
        { id: 'u6-ddu-abafado', tipo: 'ritmo', titulo: 'Ritmo ↓ ↓↑ ↓ ↓↑ abafado', resumo: 'Etapa 1: tire duas batidas para cima', padrao: 'ddu', bpm: 55, compassos: 4, acorde: null },
        { id: 'u6-ddu', tipo: 'ritmo', titulo: 'Ritmo ↓ ↓↑ ↓ ↓↑', resumo: 'Com o acorde G', padrao: 'ddu', bpm: 60, compassos: 4, acorde: 'G' },
        { id: 'u6-pop-abafado', tipo: 'ritmo', titulo: 'Ritmo universal abafado', resumo: 'Etapa 2: a mão desce sem tocar no tempo 3', padrao: 'pop', bpm: 50, compassos: 4, acorde: null },
        { id: 'u6-pop', tipo: 'ritmo', titulo: 'Ritmo universal', resumo: '↓ ↓↑ ↑↓↑ com Em', padrao: 'pop', bpm: 58, compassos: 4, acorde: 'Em' },
        { id: 'u6-pop-troca', tipo: 'progressao', titulo: 'Ritmo universal com troca', resumo: 'Dois compassos em cada acorde', compassos: 'Em | Em | G | G', repetir: 2, padrao: 'pop', bpm: 58 },
        { id: 'u6-desafio', tipo: 'progressao', titulo: 'Desafio: G, Em, C e D', resumo: 'Feche a unidade tocando com a banda', compassos: 'G | Em | C | D', repetir: 2, padrao: 'pop', bpm: 70, desafio: true }
      ]
    },
    {
      id: 'u7', titulo: 'Acordes sem pestana', subtitulo: 'F, Bm e cores novas',
      licoes: [
        { id: 'u7-f', tipo: 'acorde', acorde: 'Fmaj7', titulo: 'Acorde F (simplificado)', resumo: 'O Fá sem pestana' },
        { id: 'u7-troca-c-f', tipo: 'troca', a: 'C', b: 'Fmaj7', titulo: 'Troca C ↔ F', resumo: 'Os dedos quase não saem do lugar', metas: [10, 20, 30] },
        { id: 'u7-am7', tipo: 'acorde', acorde: 'Am7', titulo: 'Acorde Am7', resumo: 'Lá menor com sétima' },
        { id: 'u7-bm', tipo: 'acorde', acorde: 'Bm7', titulo: 'Acorde Bm (simplificado)', resumo: 'Si menor sem pestana' },
        { id: 'u7-dsus2', tipo: 'acorde', acorde: 'Dsus2', titulo: 'Acorde Dsus2', resumo: 'O Ré aberto de "Hurt"' },
        { id: 'u7-desafio', tipo: 'progressao', titulo: 'Desafio: C, G, Am e F', resumo: 'Feche a unidade tocando com a banda', compassos: 'C | G | Am | Fmaj7', repetir: 2, padrao: 'q4', bpm: 70, desafio: true }
      ]
    },
    {
      id: 'u8', titulo: 'Wonderwall', subtitulo: 'Capotraste e dedos âncora',
      capo: 2,
      licoes: [
        {
          id: 'u8-info', tipo: 'info', titulo: 'Capotraste e âncora', resumo: 'O segredo dos acordes de Wonderwall',
          paginas: [
            { titulo: 'Capotraste', figura: 'capo', texto: 'O capotraste é uma braçadeira que aperta todas as cordas numa casa. Com ele na <b>casa 2</b>, os formatos de acorde continuam os mesmos, mas tudo soa 2 semitons mais agudo, no tom da gravação. Os diagramas mostram as casas contando a partir do capotraste.' },
            { titulo: 'Sem capotraste?', figura: 'capo', texto: 'Tudo bem. Ative a opção <b>"Estou sem capotraste"</b> na lição. O app passa a esperar o acorde no tom normal e você treina igual.' },
            { titulo: 'Dedos âncora', figura: 'ancora', texto: 'Nos acordes de Wonderwall, os dedos <b>3 e 4</b> ficam presos na <b>casa 3</b> das cordas 2 e 1 o tempo todo. Só os dedos 1 e 2 se mexem. Por isso a troca fica rápida.' }
          ],
          quiz: [
            { pergunta: 'Com o capotraste na casa 2, o formato dos acordes...', opcoes: ['Continua igual', 'Fica todo diferente', 'Precisa de pestana'], certa: 0 },
            { pergunta: 'Quais dedos ficam parados na casa 3?', opcoes: ['1 e 2', '3 e 4', '2 e 3'], certa: 1 }
          ]
        },
        { id: 'u8-em7', tipo: 'acorde', acorde: 'Em7', capo: 2, titulo: 'Acorde Em7', resumo: 'A âncora entra em cena' },
        { id: 'u8-g', tipo: 'acorde', acorde: 'Gww', capo: 2, titulo: 'Acorde G (Wonderwall)', resumo: 'G com a âncora' },
        { id: 'u8-dsus4', tipo: 'acorde', acorde: 'Dsus4', capo: 2, titulo: 'Acorde Dsus4', resumo: 'Ré com quarta' },
        { id: 'u8-a7sus4', tipo: 'acorde', acorde: 'A7sus4', capo: 2, titulo: 'Acorde A7sus4', resumo: 'Lá com sétima e quarta' },
        { id: 'u8-cadd9', tipo: 'acorde', acorde: 'Cadd9', capo: 2, titulo: 'Acorde Cadd9', resumo: 'Dó com nona' },
        { id: 'u8-desafio', tipo: 'progressao', titulo: 'Desafio: a volta de Wonderwall', resumo: 'Feche a unidade tocando com a banda', compassos: 'Em7 | Gww | Dsus4 | A7sus4', repetir: 2, padrao: 'pop', bpm: 72, capo: 2, desafio: true }
      ]
    }
  ];

  // Músicas: só acordes. compassos: "|" separa compassos; acordes no mesmo
  // compasso dividem o tempo igualmente.
  const MUSICAS = [
    {
      id: 'horse', titulo: 'A Horse With No Name', artista: 'America', bpm: 122, capo: 0, padrao: 'pop',
      requer: ['u2-desafio'], dificuldade: 1,
      nota: 'Só dois acordes do começo ao fim. A música original é bem rápida: comece em 60% da velocidade.',
      secoes: [
        { id: 'intro', nome: 'Introdução', compassos: 'Em | D69 | Em | D69' },
        { id: 'verso', nome: 'Verso', compassos: 'Em | D69 | Em | D69 | Em | D69 | Em | D69' },
        { id: 'refrao', nome: 'Refrão', compassos: 'Em | D69 | Em | D69 | Em | D69 | Em | D69' },
        { id: 'final', nome: 'Final', compassos: 'Em | D69 | Em' }
      ],
      estrutura: ['intro', 'verso', 'refrao', 'verso', 'refrao', 'final']
    },
    {
      id: 'knockin', titulo: "Knockin' on Heaven's Door", artista: 'Bob Dylan', bpm: 68, capo: 0, padrao: 'ddu',
      requer: ['u5-desafio'], dificuldade: 1,
      nota: 'Duas voltas de 4 acordes. O Am pode ser Am ou Am7, os dois soam bem.',
      secoes: [
        { id: 'verso', nome: 'Verso', compassos: 'G | D | Am | Am | G | D | C | C' },
        { id: 'refrao', nome: 'Refrão', compassos: 'G | D | Am | Am | G | D | C | C' },
        { id: 'final', nome: 'Final', compassos: 'G | D | Am | Am | G' }
      ],
      estrutura: ['verso', 'refrao', 'verso', 'refrao', 'final']
    },
    {
      id: 'standbyme', titulo: 'Stand By Me', artista: 'Ben E. King', bpm: 118, capo: 0, padrao: 'pop',
      requer: ['u6-desafio'], dificuldade: 2,
      nota: 'Tom de Sol (a gravação está em Lá: coloque capotraste na casa 2 se quiser tocar junto).',
      secoes: [
        { id: 'verso', nome: 'Verso', compassos: 'G | G | Em | Em | C | D | G | G' },
        { id: 'refrao', nome: 'Refrão', compassos: 'G | G | Em | Em | C | D | G | G' },
        { id: 'final', nome: 'Final', compassos: 'G | Em | C | D | G' }
      ],
      estrutura: ['verso', 'verso', 'refrao', 'verso', 'refrao', 'final']
    },
    {
      id: 'letitbe', titulo: 'Let It Be', artista: 'The Beatles', bpm: 72, capo: 0, padrao: 'q4',
      requer: ['u7-desafio'], dificuldade: 2,
      nota: 'Dois acordes por compasso: a troca vem no tempo 3. O F é a versão sem pestana.',
      secoes: [
        { id: 'verso', nome: 'Verso', compassos: 'C G | Am Fmaj7 | C G | Fmaj7 C | C G | Am Fmaj7 | C G | Fmaj7 C' },
        { id: 'refrao', nome: 'Refrão', compassos: 'Am G | Fmaj7 C | C G | Fmaj7 C' },
        { id: 'final', nome: 'Final', compassos: 'Fmaj7 C | G Fmaj7 | C' }
      ],
      estrutura: ['verso', 'refrao', 'verso', 'refrao', 'refrao', 'final']
    },
    {
      id: 'tempoperdido', titulo: 'Tempo Perdido', artista: 'Legião Urbana', bpm: 120, capo: 0, padrao: 'ddu',
      requer: ['u7-desafio'], dificuldade: 2,
      nota: 'Versão simplificada: a música inteira gira em torno do ciclo C, Am7, Bm, Em. O Bm é a versão sem pestana.',
      secoes: [
        { id: 'intro', nome: 'Introdução', compassos: 'Em | Em | C | Am7 | Bm7 | Em' },
        { id: 'verso', nome: 'Verso', compassos: 'C | Am7 | Bm7 | Em | C | Am7 | Bm7 | Em' },
        { id: 'refrao', nome: 'Refrão', compassos: 'C | Am7 | Bm7 | Em | C | Am7 | Bm7 | Em' },
        { id: 'final', nome: 'Final', compassos: 'C | Am7 | Bm7 | Em | Em' }
      ],
      estrutura: ['intro', 'verso', 'verso', 'refrao', 'verso', 'refrao', 'refrao', 'final']
    },
    {
      id: 'paisefilhos', titulo: 'Pais e Filhos', artista: 'Legião Urbana', bpm: 116, capo: 0, padrao: 'ddu',
      requer: ['u7-desafio'], dificuldade: 3,
      nota: 'Tom de Sol, versão simplificada: F e Bm sem pestana. A parte B tem mais acordes: treine ela separada.',
      secoes: [
        { id: 'intro', nome: 'Introdução', compassos: 'C | D | G | G | C | D | G | G' },
        { id: 'parteA', nome: 'Parte A', compassos: 'C | D | G | G | C | D | G | G' },
        { id: 'parteB', nome: 'Parte B', compassos: 'Fmaj7 | Em | C | Bm7 | Am | D' },
        { id: 'refrao', nome: 'Refrão', compassos: 'G | C | Em | C | G | C | Em | C' },
        { id: 'final', nome: 'Final', compassos: 'C | D | G | G | C | D | G' }
      ],
      estrutura: ['intro', 'parteA', 'parteB', 'parteA', 'parteB', 'refrao', 'parteA', 'parteB', 'refrao', 'final']
    },
    {
      id: 'hurt', titulo: 'Hurt', artista: 'Johnny Cash', bpm: 88, capo: 0, padrao: 'q4',
      requer: ['u7-desafio'], dificuldade: 2,
      nota: 'Versão de Johnny Cash, em Lá menor. Toque leve: batidas para baixo, ou dedilhe as cordas uma a uma.',
      secoes: [
        { id: 'intro', nome: 'Introdução', compassos: 'Am | C Dsus2 | Am | C Dsus2' },
        { id: 'verso', nome: 'Verso', compassos: 'Am | C Dsus2 | Am | C Dsus2 | Am | C Dsus2 | Am | C Dsus2' },
        { id: 'refrao', nome: 'Refrão', compassos: 'G | Am | Fmaj7 | C | G | Am | Fmaj7 | C' },
        { id: 'final', nome: 'Final', compassos: 'G | Am | Fmaj7 | C | G | Am | Fmaj7 | Am' }
      ],
      estrutura: ['intro', 'verso', 'verso', 'refrao', 'verso', 'verso', 'refrao', 'final']
    },
    {
      id: 'wonderwall', titulo: 'Wonderwall', artista: 'Oasis', bpm: 87, capo: 2, padrao: 'pop',
      requer: ['u8-desafio'], dificuldade: 3,
      nota: 'Capotraste na casa 2, dedos 3 e 4 sempre presos na casa 3. Sem capotraste, ative a opção e toque igual.',
      secoes: [
        { id: 'intro', nome: 'Introdução', compassos: 'Em7 | Gww | Dsus4 | A7sus4 | Em7 | Gww | Dsus4 | A7sus4' },
        { id: 'verso', nome: 'Verso', compassos: 'Em7 | Gww | Dsus4 | A7sus4 | Em7 | Gww | Dsus4 | A7sus4 | Em7 | Gww | Dsus4 | A7sus4 | Em7 | Gww | Dsus4 | A7sus4' },
        { id: 'pre', nome: 'Pré-refrão', compassos: 'Cadd9 | Dsus4 | Em7 | Em7 | Cadd9 | Dsus4 | Em7 | Em7 | Cadd9 | Dsus4 | Em7 | Em7 | Cadd9 | Dsus4 | A7sus4 | A7sus4' },
        { id: 'refrao', nome: 'Refrão', compassos: 'Cadd9 | Em7 | Gww | Em7 | Cadd9 | Em7 | Gww | Em7 | Cadd9 | Em7 | Gww | Em7 | Cadd9 | Em7 | Gww | Em7' },
        { id: 'final', nome: 'Final', compassos: 'Cadd9 | Em7 | Gww | Em7 | Em7' }
      ],
      estrutura: ['intro', 'verso', 'pre', 'refrao', 'verso', 'pre', 'refrao', 'final']
    }
  ];

  // Dicas de dedos para cada troca (chave: os dois ids em ordem alfabética)
  const DICAS_TROCA = {
    'Am-Em': 'Os dedos 2 e 3 andam juntos, lado a lado na casa 2: do Em para o Am, cada um passa para a corda vizinha mais fina. Depois é só pousar o dedo 1.',
    'D69-Em': 'Os dedos 2 e 3 não saem da casa 2. Eles só se afastam: o 2 vai para a 6ª corda e o 3 para a 3ª corda.',
    'Am-E': 'É o mesmo desenho de dedos. Levante os três juntos, como um carimbo, e pouse uma corda acima (E) ou abaixo (Am).',
    'A-D': 'O dedo 3 é o guia: ele não sai da 2ª corda, só desliza da casa 2 (A) para a casa 3 (D).',
    'A-E': 'O dedo 1 é o guia: sai da 4ª corda, casa 2 (A) e vai para a 3ª corda, casa 1 (E). Os dedos 2 e 3 pousam juntos.',
    'D-E': 'O dedo 1 fica na 3ª corda: desliza da casa 2 (D) para a casa 1 (E).',
    'D-G': 'O dedo 3 fica sempre na casa 3: só troca da 1ª corda (G) para a 2ª corda (D).',
    'Em-G': 'Truque: monte o Em com os dedos 1 e 2. Assim o dedo 1 fica parado na 5ª corda, casa 2, nos dois acordes.',
    'Am-C': 'Os dedos 1 e 2 ficam parados. Só o dedo 3 se move: 5ª corda, casa 3 (C) ou 3ª corda, casa 2 (Am).',
    'C-Fmaj7': 'O dedo 1 fica parado na 2ª corda. Os dedos 2 e 3 passam juntos para a corda vizinha.',
    'Am-Fmaj7': 'O dedo 1 fica parado na 2ª corda, casa 1. Só os dedos 2 e 3 mudam.',
    'Am-Am7': 'Só o dedo 3 sai. Os outros ficam parados.',
    'D-Dsus2': 'Só o dedo 2 sai da 1ª corda. Os outros ficam parados.'
  };
  const FORMATOS_WW = ['Em7', 'Gww', 'Dsus4', 'A7sus4', 'Cadd9'];
  function dicaTroca(a, b) {
    if (FORMATOS_WW.includes(a) && FORMATOS_WW.includes(b)) return 'Os dedos 3 e 4 não saem da casa 3. Só os dedos 1 e 2 mudam de lugar.';
    return DICAS_TROCA[[a, b].sort().join('-')] || 'Esses dois acordes não têm dedo em comum. Monte o desenho do próximo acorde no ar e pouse todos os dedos ao mesmo tempo, não um por um.';
  }

  // Pares usados no treino do dia (entram quando os dois acordes já foram aprendidos)
  const PARES_TREINO = [['Em', 'Am'], ['Em', 'D69'], ['Am', 'E'], ['A', 'D'], ['A', 'E'], ['D', 'E'], ['G', 'C'], ['G', 'D'], ['C', 'Am'], ['G', 'Em'], ['C', 'D'], ['D', 'Em'], ['C', 'Fmaj7'], ['Am', 'Fmaj7'], ['Am', 'D']];

  // Escada do ritmo: cada degrau vai de "de" até "ate" bpm, subindo 5 por vez
  const ESCADA_RITMO = [
    { padrao: 'q4', de: 50, ate: 80 },
    { padrao: 'c8', de: 50, ate: 80 },
    { padrao: 'ddu', de: 50, ate: 80 },
    { padrao: 'pop', de: 50, ate: 90 }
  ];

  // Níveis de ritmo para as músicas (do mais fácil ao original)
  const NIVEIS_RITMO = [
    { id: 'facil', nome: 'Fácil', desc: '1 batida em cada acorde', padrao: 'q1' },
    { id: 'medio', nome: 'Médio', desc: '4 batidas para baixo', padrao: 'q4' },
    { id: 'original', nome: 'Completo', desc: 'O ritmo da música', padrao: null }
  ];

  const CONQUISTAS = [
    { id: 'afinado', nome: 'Afinado', desc: 'Afinou as 6 cordas' },
    { id: 'sincronizado', nome: 'No tempo', desc: 'Calibrou o atraso do celular' },
    { id: 'primeiro-acorde', nome: 'Primeiro acorde', desc: 'Tocou o primeiro acorde certo' },
    { id: 'cinco-acordes', nome: 'Mão esquerda', desc: '5 acordes aprendidos' },
    { id: 'dez-acordes', nome: 'Dicionário de acordes', desc: '10 acordes aprendidos' },
    { id: 'todos-acordes', nome: 'Todos os formatos', desc: 'Todos os 17 acordes do curso' },
    { id: 'ritmo-perfeito', nome: 'Relógio', desc: '3 estrelas num exercício de ritmo' },
    { id: 'mao-pendulo', nome: 'Mão que não para', desc: 'Completou o ritmo universal' },
    { id: 'trocas-30', nome: 'Troca relâmpago', desc: '30 trocas em 1 minuto' },
    { id: 'primeira-musica', nome: 'Primeira música', desc: 'Tocou uma música inteira' },
    { id: 'tres-musicas', nome: 'Repertório', desc: '3 músicas inteiras' },
    { id: 'legiao', nome: 'Geração Coca-Cola', desc: 'Tocou uma música da Legião Urbana inteira' },
    { id: 'hurt', nome: 'Império de terra', desc: 'Tocou Hurt inteira' },
    { id: 'wonderwall', nome: 'Wonderwall', desc: 'Tocou Wonderwall inteira' },
    { id: 'velocidade-original', nome: 'Na velocidade', desc: 'Música inteira na velocidade original' },
    { id: 'treino-dia', nome: 'Treino em dia', desc: 'Completou os 3 passos do treino do dia' },
    { id: 'ritmo-universal', nome: 'Mão direita solta', desc: 'Chegou ao ritmo universal na escada do ritmo' },
    { id: 'seq-3', nome: '3 dias seguidos', desc: 'Praticou 3 dias seguidos' },
    { id: 'seq-7', nome: 'Uma semana', desc: 'Praticou 7 dias seguidos' },
    { id: 'seq-30', nome: 'Um mês', desc: 'Praticou 30 dias seguidos' },
    { id: 'perfeccionista', nome: 'Perfeccionista', desc: '10 lições com 3 estrelas' }
  ];

  const NIVEIS = [
    { xp: 0, nome: 'Calouro' },
    { xp: 100, nome: 'Aprendiz' },
    { xp: 250, nome: 'Batedor de corda' },
    { xp: 450, nome: 'Trocador de acordes' },
    { xp: 700, nome: 'Violeiro' },
    { xp: 1000, nome: 'Seresteiro' },
    { xp: 1400, nome: 'Rei da roda' },
    { xp: 1900, nome: 'Músico de luau' },
    { xp: 2500, nome: 'Mestre das cifras' },
    { xp: 3300, nome: 'Lenda do violão' }
  ];

  MUSICAS.forEach((m) => { m.acordes = [...new Set(m.secoes.flatMap((x) => x.compassos.split(/[|\s]+/).filter(Boolean)))]; });

  // Lista plana de lições na ordem da trilha
  const LICOES = [];
  UNIDADES.forEach((u) => u.licoes.forEach((l) => { l.unidade = u.id; if (l.capo === undefined && u.capo && l.tipo !== 'info') l.capo = u.capo; LICOES.push(l); }));

  // Converte "Am | C D" em blocos [{id, inicio, dur}] (em tempos)
  function blocosDe(compassos, repetir, tempos) {
    const tc = tempos || 4;
    const blocos = [];
    let inicio = 0;
    for (let r = 0; r < (repetir || 1); r++) {
      compassos.split('|').map((c) => c.trim()).filter(Boolean).forEach((compasso) => {
        const ids = compasso.split(/\s+/);
        const dur = tc / ids.length;
        ids.forEach((id) => {
          if (!window.Teoria.ACORDES[id]) console.warn('Acorde desconhecido:', id);
          blocos.push({ id, inicio, dur });
          inicio += dur;
        });
      });
    }
    return { blocos, total: inicio };
  }

  function blocosDaMusica(musica, secaoId) {
    const ids = secaoId ? [secaoId] : musica.estrutura;
    const todos = [];
    const marcas = [];
    let inicio = 0;
    ids.forEach((sid) => {
      const sec = musica.secoes.find((s) => s.id === sid);
      const { blocos, total } = blocosDe(sec.compassos, 1);
      marcas.push({ nome: sec.nome, inicio });
      blocos.forEach((b) => todos.push({ id: b.id, inicio: b.inicio + inicio, dur: b.dur }));
      inicio += total;
    });
    return { blocos: todos, total: inicio, marcas };
  }

  window.Conteudo = { PADROES, UNIDADES, LICOES, MUSICAS, NIVEIS_RITMO, CONQUISTAS, NIVEIS, blocosDe, blocosDaMusica, DICAS_TROCA, dicaTroca, PARES_TREINO, ESCADA_RITMO };
})();
