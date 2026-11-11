/* Telas principais: Trilha, Músicas, Treino e Perfil. */
(function () {
  'use strict';
  const { el, icone, estrelas, diagrama, aviso, abrirPalco } = window.UI;
  const C = window.Conteudo, E = window.Estado, L = window.Licoes, T = window.Teoria, M = window.Motor;

  const ABAS = [
    { id: 'trilha', nome: 'Trilha', ic: 'trilha' },
    { id: 'musicas', nome: 'Músicas', ic: 'musica' },
    { id: 'treino', nome: 'Treino', ic: 'treino' },
    { id: 'perfil', nome: 'Perfil', ic: 'perfil' }
  ];
  const ICONE_TIPO = { info: 'info', afinar: 'afinar', calibrar: 'relogio', ritmo: 'setas', acorde: 'acorde', troca: 'troca', progressao: 'bandeira' };
  let aba = 'trilha';
  const main = () => document.getElementById('conteudo');

  // ---------- Topo ----------
  function anelMeta() {
    const seg = E.tempoHoje(), meta = E.dados.metaMinutos * 60;
    const f = Math.min(1, seg / meta);
    const r = 15, c = 2 * Math.PI * r;
    return window.UI.svgEl(`<svg class="anel" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="${r}" class="anel-fundo"/><circle cx="20" cy="20" r="${r}" class="anel-valor" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 20 20)"/></svg>`);
  }
  function renderTopo() {
    const topo = document.getElementById('topo-stats');
    const nv = E.nivelAtual();
    const seq = E.sequencia();
    const min = Math.floor(E.tempoHoje() / 60);
    topo.innerHTML = '';
    topo.append(
      el('div', { class: 'stat', title: 'Dias seguidos praticando' }, icone('fogo', seq ? 'fogo-aceso' : ''), el('b', null, String(seq))),
      el('div', { class: 'stat', title: 'Meta de hoje' }, anelMeta(), el('b', null, `${min}/${E.dados.metaMinutos}`), el('span', null, 'min')),
      el('div', { class: 'stat nivel', title: nv.nome }, el('span', { class: 'nivel-num' }, 'Nv ' + nv.numero), el('b', null, nv.xp + ' XP'))
    );
  }

  // ---------- Trilha ----------
  function renderTrilha() {
    const c = main();
    const nAprendidos = E.acordesAprendidos().length;
    const foco = C.MUSICAS.find((m) => m.id === E.dados.foco) || C.MUSICAS.find((m) => !(E.dados.musicas[m.id] || {}).estrelas) || C.MUSICAS[0];
    const faltam = E.acordesFaltando(foco);
    const sabe = new Set(E.acordesAprendidos());
    const proxAcorde = faltam.length ? C.LICOES.find((l) => l.tipo === 'acorde' && l.acorde === faltam[0]) : null;
    c.append(el('section', { class: 'cartao-foco' },
      el('div', { class: 'rotulo' }, 'Sua música'),
      el('h2', null, foco.titulo), el('div', { class: 'musica-artista' }, foco.artista),
      el('div', { class: 'cm-acordes' }, ...foco.acordes.map((id) => el('span', { class: 'tag' + (sabe.has(id) ? ' sabe' : '') }, T.ACORDES[id].nome))),
      el('p', null, faltam.length ? 'Falta aprender: ' + faltam.map((id) => T.ACORDES[id].nome).join(', ') + '.' : 'Você já sabe todos os acordes. Comece no ritmo Fácil, uma batida por acorde.'),
      el('div', { class: 'linha-botoes' },
        proxAcorde ? el('button', { class: 'bt', onclick: () => L.rodarLicao(proxAcorde) }, 'Aprender o acorde ' + T.ACORDES[proxAcorde.acorde].nome) : el('button', { class: 'bt', onclick: () => L.abrirMusica(foco) }, icone('play'), ' Tocar a música'),
        proxAcorde ? el('button', { class: 'bt bt-secundario', onclick: () => L.abrirMusica(foco) }, 'Tocar mesmo assim') : null,
        el('button', { class: 'bt bt-secundario', onclick: () => irPara('musicas') }, 'Trocar de música'))));
    const licAtual = C.LICOES.find((l) => !E.concluida(l.id) && E.licaoDesbloqueada(l.id));
    const unidadeAtual = licAtual ? licAtual.unidade : null;
    c.append(el('h3', null, 'Curso passo a passo'));
    const td = E.treinoDia(), nFeitos = td.feitos.filter(Boolean).length, ra = E.ritmoAtual();
    c.append(el('button', { class: 'cartao-treino' + (nFeitos === 3 ? ' completo' : ''), onclick: () => L.treinoDoDia() },
      el('div', { class: 'ct-texto' },
        el('div', { class: 'rotulo' }, 'Treino do dia · ' + nFeitos + '/3'),
        el('b', null, nFeitos === 3 ? 'Treino completo. Volte amanhã!' : 'Troca de acordes + mão do ritmo'),
        el('span', null, 'Hoje: ritmo ' + C.PADROES[ra.padrao].curto + ' a ' + ra.bpm + ' bpm e a sua troca mais lenta. Uns 5 minutos.')),
      el('div', { class: 'ct-passos' }, ...td.feitos.map((x) => el('i', { class: x ? 'feito' : '' })))));
    if (!E.dados.nivelamento && nAprendidos < 3) {
      c.append(el('div', { class: 'faixa' },
        el('div', null, el('b', null, 'Já sabe alguns acordes?'), el('span', null, 'Faça o teste de nivelamento e pule o que você já toca.')),
        el('div', { class: 'linha-botoes' },
          el('button', { class: 'bt bt-pequeno', onclick: () => L.nivelamento() }, 'Fazer teste'),
          el('button', { class: 'bt bt-pequeno bt-secundario', onclick: () => { E.dados.nivelamento = true; E.salvar(); atualizar(); } }, 'Agora não'))));
    }
    let atualMarcada = false;
    C.UNIDADES.forEach((u, ui) => {
      const feitas = u.licoes.filter((l) => E.concluida(l.id)).length;
      const primeiraBloqueada = !E.licaoDesbloqueada(u.licoes[0].id);
      const desafio = u.licoes.find((l) => l.desafio);
      const sec = el('section', { class: 'unidade' + (feitas === u.licoes.length ? ' completa' : '') });
      sec.append(el('header', { class: 'unidade-topo' },
        el('div', null, el('div', { class: 'rotulo' }, `Unidade ${ui + 1} · ${feitas}/${u.licoes.length}`), el('h2', null, u.titulo), el('p', null, u.subtitulo)),
        primeiraBloqueada && desafio ? el('button', { class: 'bt bt-pequeno bt-secundario', onclick: () => L.rodarLicao(Object.assign({}, desafio, { pularAte: true, titulo: 'Pular até: ' + u.titulo })) }, icone('pular'), ' Pular até aqui') : null));
      const caminho = el('ol', { class: 'caminho' });
      u.licoes.forEach((l, i) => {
        const feita = E.concluida(l.id);
        const livre = E.licaoDesbloqueada(l.id);
        const atual = livre && !feita && !atualMarcada;
        if (atual) atualMarcada = true;
        const reg = E.licao(l.id);
        const no = el('li', { class: 'no ' + (feita ? 'feita' : livre ? 'livre' : 'bloqueada') + (atual ? ' atual' : '') + (l.desafio ? ' desafio' : ''), style: { '--desloc': String([0, 1, 0, -1][i % 4]) } },
          el('button', {
            class: 'no-botao', 'aria-label': l.titulo + (livre ? '' : ' (bloqueada)'),
            onclick: () => { if (!livre) { aviso('Complete a lição anterior para liberar esta.'); return; } L.rodarLicao(l); }
          }, icone(livre ? ICONE_TIPO[l.tipo] : 'cadeado')),
          el('div', { class: 'no-texto' }, el('b', null, l.titulo), el('span', null, l.resumo), feita ? estrelas(reg.estrelas) : atual ? el('span', { class: 'no-comecar' }, 'Comece aqui') : null));
        caminho.append(no);
      });
      // músicas liberadas pela unidade
      C.MUSICAS.filter((m) => desafio && m.requer.includes(desafio.id)).forEach((m) => {
        const livre = E.musicaDesbloqueada(m);
        const pm = E.dados.musicas[m.id] || {};
        caminho.append(el('li', { class: 'no musica ' + (livre ? 'livre' : 'bloqueada') },
          el('button', { class: 'no-botao', 'aria-label': 'Música ' + m.titulo, onclick: () => L.abrirMusica(m) }, icone(livre ? 'musica' : 'cadeado')),
          el('div', { class: 'no-texto' }, el('b', null, m.titulo), el('span', null, m.artista), pm.estrelas ? estrelas(pm.estrelas) : null)));
      });
      const aberta = u.id === unidadeAtual;
      caminho.hidden = !aberta;
      const alternar = el('button', { class: 'bt bt-pequeno bt-secundario alternar', 'aria-expanded': String(aberta) }, aberta ? 'Ocultar lições' : 'Ver lições');
      alternar.addEventListener('click', () => { caminho.hidden = !caminho.hidden; alternar.textContent = caminho.hidden ? 'Ver lições' : 'Ocultar lições'; alternar.setAttribute('aria-expanded', String(!caminho.hidden)); });
      sec.append(alternar, caminho);
      c.append(sec);
    });
    c.append(el('section', { class: 'unidade final' },
      el('header', { class: 'unidade-topo' }, el('div', null, el('div', { class: 'rotulo' }, 'Projeto final'), el('h2', null, 'Toque uma música inteira'), el('p', null, 'Escolha uma música liberada e toque do começo ao fim. Comece no ritmo Fácil e devagar; depois suba a velocidade.'))),
      el('button', { class: 'bt', onclick: () => irPara('musicas') }, icone('musica'), ' Ver músicas')));
  }

  // ---------- Músicas ----------
  function renderMusicas() {
    const c = main();
    c.append(el('p', { class: 'intro-aba' }, 'Escolha uma música e toque por partes. Comece no ritmo Fácil, uma batida por acorde. Sem letra; se quiser cantar, abra a letra num site de cifras.'));
    const lista = el('div', { class: 'lista-musicas' });
    C.MUSICAS.forEach((m) => {
      const livre = E.musicaDesbloqueada(m);
      const pm = E.dados.musicas[m.id] || {};
      const ids = [...new Set(m.secoes.flatMap((s) => s.compassos.split(/[|\s]+/).filter(Boolean)))];
      const falta = E.acordesFaltando(m).map((id) => T.ACORDES[id].nome);
      lista.append(el('button', {
        class: 'cartao-musica',
        onclick: () => L.abrirMusica(m)
      },
      el('div', { class: 'cm-topo' },
        el('div', null, el('b', null, m.titulo), el('span', null, m.artista)),
        estrelas(pm.estrelas || 0)),
      el('div', { class: 'cm-acordes' }, ...ids.map((id) => el('span', { class: 'tag' }, T.ACORDES[id].nome))),
      el('div', { class: 'cm-rodape' },
        el('span', { class: 'dificuldade', 'aria-label': 'Dificuldade ' + m.dificuldade + ' de 3' }, ...[1, 2, 3].map((n) => el('i', { class: n <= m.dificuldade ? 'cheio' : '' }))),
        el('span', null, livre ? (m.capo ? `capotraste ${m.capo} · ` : '') + m.bpm + ' bpm' : 'Falta aprender: ' + falta.join(', ')))));
    });
    c.append(lista);
  }

  // ---------- Treino ----------
  function renderTreino() {
    const c = main();
    const itens = [
      { ic: 'fogo', nome: 'Treino do dia', desc: 'Troca + ritmo, no seu nível', f: L.treinoDoDia },
      { ic: 'setas', nome: 'Treino de ritmo', desc: 'Escolha ritmo, velocidade e acorde', f: L.ritmoLivre },
      { ic: 'afinar', nome: 'Afinador', desc: 'Afine as 6 cordas', f: L.afinadorLivre },
      { ic: 'acorde', nome: 'Detector de acordes', desc: 'Veja o que o app está ouvindo', f: L.detectorLivre },
      { ic: 'troca', nome: 'Troca de 1 minuto', desc: 'Escolha dois acordes e treine', f: L.trocaLivre },
      { ic: 'relogio', nome: 'Metrônomo', desc: 'Pulso de 40 a 160 bpm', f: L.metronomoLivre },
      { ic: 'celular', nome: 'Sincronizar', desc: 'Mede o atraso do celular', f: L.calibrarLivre },
      { ic: 'bandeira', nome: 'Teste de nivelamento', desc: 'Marque os acordes que já sabe', f: L.nivelamento },
      { ic: 'info', nome: 'Dicionário de acordes', desc: 'Todos os acordes do curso', f: dicionario }
    ];
    c.append(el('div', { class: 'grade-ferramentas' }, ...itens.map((it) => el('button', { class: 'ferramenta', onclick: () => it.f() }, icone(it.ic), el('b', null, it.nome), el('span', null, it.desc)))));
  }

  function dicionario() {
    const palco = abrirPalco('Dicionário de acordes');
    const aprendidos = new Set(E.acordesAprendidos());
    const grupos = [['Básicos', L.BASICOS], ['Formatos de Wonderwall (capotraste na casa 2)', L.WW]];
    grupos.forEach(([titulo, ids]) => {
      palco.corpo.append(el('div', { class: 'rotulo' }, titulo), el('div', { class: 'grade-dicionario' }, ...ids.map((id) => el('button', { class: 'dic-item' + (aprendidos.has(id) ? ' aprendido' : ''), 'aria-label': 'Ouvir ' + T.ACORDES[id].nome, onclick: () => M.tocarAcorde(id, L.WW.includes(id) && E.dados.config.temCapo ? 2 : 0) },
        el('b', null, T.ACORDES[id].nome), diagrama(id, { largura: 96 }), el('span', null, T.ACORDES[id].extenso)))));
    });
    palco.corpo.append(el('p', { class: 'nota' }, 'Toque num acorde para ouvir como ele soa. Os que têm borda colorida você já aprendeu.'));
  }

  // ---------- Perfil ----------
  function renderPerfil() {
    const c = main();
    const nv = E.nivelAtual();
    const d = E.dados;
    const musicasCompletas = Object.values(d.musicas).filter((m) => m.estrelas > 0).length;
    c.append(el('div', { class: 'cartao-nivel' },
      el('div', { class: 'rotulo' }, 'Nível ' + nv.numero),
      el('h2', null, nv.nome),
      el('div', { class: 'barra-xp' }, el('div', { style: { width: (nv.fracao * 100).toFixed(1) + '%' } })),
      el('p', null, nv.proximo ? `${nv.xp} de ${nv.proximo} XP para o próximo nível` : `${nv.xp} XP · nível máximo`)));
    c.append(el('div', { class: 'grade-numeros' },
      numero(E.acordesAprendidos().length, 'acordes aprendidos'),
      numero(musicasCompletas, 'músicas completas'),
      numero(E.sequencia(), 'dias seguidos'),
      numero(Object.values(d.licoes).filter((l) => l.estrelas > 0).length + '/' + C.LICOES.length, 'lições feitas')));

    c.append(el('h3', null, 'Conquistas'), el('div', { class: 'grade-conquistas' }, ...C.CONQUISTAS.map((cq) => el('div', { class: 'conquista' + (d.conquistas[cq.id] ? ' ganha' : '') }, icone('trofeu'), el('b', null, cq.nome), el('span', null, cq.desc)))));

    // Configurações
    const meta = el('select', { id: 'cfg-meta' }, ...[5, 10, 15, 20, 30].map((n) => el('option', { value: String(n), selected: d.metaMinutos === n }, n + ' minutos')));
    meta.addEventListener('change', () => { d.metaMinutos = Number(meta.value); E.salvar(); atualizar(); });
    const vol = el('input', { type: 'range', id: 'cfg-vol', min: '0', max: '100', value: String(Math.round(d.config.volumeClique * 100)) });
    vol.addEventListener('change', () => { d.config.volumeClique = Number(vol.value) / 100; M.volumeClique = d.config.volumeClique; E.salvar(); });
    const sens = el('input', { type: 'range', id: 'cfg-sens', min: '60', max: '160', value: String(Math.round(d.config.sensibilidade * 100)) });
    sens.addEventListener('change', () => { d.config.sensibilidade = Number(sens.value) / 100; M.definirSensibilidade(d.config.sensibilidade); E.salvar(); });
    const capo = el('input', { type: 'checkbox', id: 'cfg-capo', checked: d.config.temCapo });
    capo.addEventListener('change', () => { d.config.temCapo = capo.checked; E.salvar(); });
    const demo = el('input', { type: 'checkbox', id: 'cfg-demo', checked: d.config.demo });
    demo.addEventListener('change', () => { d.config.demo = demo.checked; E.salvar(); aviso(demo.checked ? 'Modo demonstração ligado: um violão virtual toca nas lições.' : 'Modo demonstração desligado: o app escuta o microfone.'); });
    const lat = d.config.latencia;
    c.append(el('h3', null, 'Configurações'), el('div', { class: 'config' },
      campo('cfg-meta', 'Meta diária de prática', meta),
      campo('cfg-vol', 'Volume do metrônomo', vol),
      campo('cfg-sens', 'Sensibilidade das batidas', sens, 'Aumente se o app não ouvir as palhetadas para cima; diminua se ouvir batidas que você não deu.'),
      el('div', { class: 'campo' }, el('span', null, 'Atraso do celular'), el('div', { class: 'campo-valor' }, el('b', null, lat === null || lat === undefined ? 'não medido' : Math.round(lat * 1000) + ' ms'), el('button', { class: 'bt bt-pequeno bt-secundario', onclick: () => L.calibrarLivre() }, 'Medir'))),
      el('label', { class: 'opcao', for: 'cfg-capo' }, capo, el('span', null, 'Tenho capotraste')),
      el('label', { class: 'opcao', for: 'cfg-demo' }, demo, el('span', null, 'Modo demonstração (violão virtual, sem microfone)'))));

    // Backup
    const arquivo = el('input', { type: 'file', accept: 'application/json,.json', id: 'cfg-import', hidden: true });
    arquivo.addEventListener('change', async () => {
      const f = arquivo.files[0]; if (!f) return;
      try { E.importar(await f.text()); aviso('Progresso importado.', 'ok'); atualizar(); } catch (e) { aviso(e.message, 'erro'); }
    });
    const confirmar = el('div', { class: 'confirmar', hidden: true },
      el('p', null, 'Apagar todo o progresso (estrelas, XP e conquistas)? Isso não pode ser desfeito.'),
      el('div', { class: 'linha-botoes' },
        el('button', { class: 'bt bt-perigo', onclick: () => { E.zerar(); aviso('Progresso apagado.'); atualizar(); } }, 'Apagar tudo'),
        el('button', { class: 'bt bt-secundario', onclick: () => { confirmar.hidden = true; } }, 'Cancelar')));
    c.append(el('h3', null, 'Seu progresso'), el('div', { class: 'config' },
      el('p', { class: 'nota' }, 'O progresso fica salvo neste navegador. Para levar para outro aparelho, exporte aqui e importe lá.'),
      el('div', { class: 'linha-botoes' },
        el('button', { class: 'bt bt-secundario', onclick: exportar }, 'Exportar progresso'),
        el('button', { class: 'bt bt-secundario', onclick: () => arquivo.click() }, 'Importar progresso'), arquivo,
        el('button', { class: 'bt bt-secundario', onclick: () => { confirmar.hidden = false; } }, 'Apagar progresso')),
      confirmar));

    const celular = el('div', { class: 'config', hidden: true });
    c.append(celular);
    preencherCelular(celular);
  }
  function numero(v, rotulo) { return el('div', { class: 'numero' }, el('b', null, String(v)), el('span', null, rotulo)); }
  function campo(id, rotulo, controle, ajuda) {
    return el('div', { class: 'campo' }, el('label', { for: id }, rotulo), controle, ajuda ? el('small', null, ajuda) : null);
  }
  function exportar() {
    const blob = new Blob([E.exportar()], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'violao-progresso-' + E.hoje() + '.json' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function preencherCelular(caixa) {
    try {
      const r = await fetch('/api/enderecos', { cache: 'no-store' });
      if (!r.ok) return;
      const info = await r.json();
      const url = (info.https && info.https[0]) || null;
      if (!url) return;
      caixa.hidden = false;
      caixa.before(el('h3', null, 'Abrir no celular'));
      const qr = el('div', { class: 'qr' });
      caixa.append(
        el('p', { class: 'nota' }, 'Com o celular na mesma rede Wi-Fi, aponte a câmera para o código ou digite o endereço. O navegador vai avisar que o certificado não é confiável: toque em "Avançado" e depois em "Continuar". É o seu próprio computador.'),
        qr,
        el('div', { class: 'enderecos' }, ...info.https.map((u) => el('code', null, u))));
      await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js');
      if (window.qrcode) {
        const q = window.qrcode(0, 'M'); q.addData(url); q.make();
        qr.innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
      }
    } catch (e) { /* app aberto fora do servidor local */ }
  }
  function carregarScript(src) {
    return new Promise((ok, falha) => { const s = el('script', { src }); s.onload = ok; s.onerror = falha; document.head.appendChild(s); });
  }

  // ---------- Boas-vindas ----------
  function boasVindas() {
    const palco = abrirPalco('Bem-vindo');
    palco.corpo.append(el('div', { class: 'boas-vindas' },
      el('div', { class: 'bv-marca' }, 'Violão de Bolso'),
      el('h2', null, 'Aprenda tocando, com o app escutando você.'),
      el('p', null, 'Cada lição usa o microfone para conferir se o acorde soou certo e se a batida caiu no tempo. Você ganha estrelas, XP e libera músicas até tocar uma inteira.'),
      el('div', { class: 'rotulo' }, 'Você já toca violão?'),
      el('div', { class: 'linha-botoes coluna' },
        el('button', { class: 'bt', onclick: () => { E.dados.boasVindas = true; E.dados.nivelamento = true; E.salvar(); palco.fechar(); atualizar(); } }, 'Nunca toquei: começar do zero'),
        el('button', { class: 'bt bt-secundario', onclick: () => { E.dados.boasVindas = true; E.salvar(); L.nivelamento(); } }, 'Sei alguns acordes: fazer o teste de nivelamento')),
      el('p', { class: 'nota' }, 'Dica: deixe o celular a uns 50 cm do violão, num lugar silencioso.')));
  }

  // ---------- Navegação ----------
  function irPara(id) { if (location.hash !== '#' + id) location.hash = id; else atualizar(); }
  function lerHash() {
    const h = (location.hash || '').replace('#', '');
    aba = ABAS.some((a) => a.id === h) ? h : 'trilha';
  }
  function renderNav() {
    const nav = document.getElementById('abas');
    nav.innerHTML = '';
    ABAS.forEach((a) => nav.append(el('a', { href: '#' + a.id, class: 'aba' + (a.id === aba ? ' ativa' : ''), 'aria-current': a.id === aba ? 'page' : null }, icone(a.ic), el('span', null, a.nome))));
  }
  function atualizar() {
    const c = main();
    const rolagem = window.scrollY;
    c.innerHTML = '';
    renderTopo();
    renderNav();
    document.getElementById('titulo-aba').textContent = ABAS.find((a) => a.id === aba).nome;
    ({ trilha: renderTrilha, musicas: renderMusicas, treino: renderTreino, perfil: renderPerfil })[aba]();
    window.scrollTo(0, rolagem);
  }
  window.addEventListener('hashchange', () => { lerHash(); window.scrollTo(0, 0); atualizar(); });
  E.aoMudar(() => { if (!window.UI.palco) renderTopo(); });

  function iniciar() {
    lerHash();
    if (new URLSearchParams(location.search).get('demo') === '1') { E.dados.config.demo = true; E.salvar(); }
    atualizar();
    if (!E.dados.boasVindas) boasVindas();
    if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  window.App = { atualizar, irPara };
  iniciar();
})();
