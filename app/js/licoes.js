/* Execução das lições: leitura + quiz, aprender acorde, troca de 1 minuto,
 * afinador, sincronização, pista (ritmo/progressão/música), nivelamento
 * e ferramentas livres (detector, metrônomo).
 */
(function () {
  'use strict';
  const { el, icone, diagrama, estrelas, figura, aviso, abrirPalco } = window.UI;
  const T = window.Teoria, C = window.Conteudo, DSP = window.DSP, M = window.Motor, E = window.Estado;

  const BASICOS = ['Em', 'Am', 'E', 'A', 'D', 'G', 'C', 'Fmaj7', 'Am7', 'Bm7', 'Dsus2', 'D69'];
  const WW = ['Em7', 'Gww', 'Dsus4', 'A7sus4', 'Cadd9'];
  const candidatosPara = (id) => (WW.includes(id) ? WW : BASICOS);
  const capoEfetivo = (capo) => (E.dados.config.temCapo ? (capo || 0) : 0);

  // ---------- Microfone ----------
  async function ligarMic(palco, aoTentarDeNovo) {
    try {
      M.simulado = !!E.dados.config.demo;
      if (M.simulado) aviso('Modo demonstração: um violão virtual toca no seu lugar e o microfone fica desligado. Desligue em Perfil.');
      await M.ligarMicrofone();
      const cfg = E.dados.config;
      M.latencia = M.simulado ? 0.012 : (cfg.latencia !== null && cfg.latencia !== undefined ? cfg.latencia : M.latenciaPadrao());
      M.volumeClique = cfg.volumeClique;
      M.definirSensibilidade(cfg.sensibilidade);
      window.TelaAcesa.ligar();
      return true;
    } catch (e) {
      mostrarErroMic(palco, e, aoTentarDeNovo);
      return false;
    }
  }

  function mostrarErroMic(palco, e, aoTentarDeNovo) {
    const textos = {
      inseguro: 'O navegador só libera o microfone em endereço seguro. No computador, abra pelo endereço http://localhost:8080. No celular, use o endereço https:// que aparece na janela do servidor (o passo a passo está no arquivo LEIA-ME).',
      negado: 'A permissão do microfone foi negada. Toque no ícone ao lado do endereço do site, permita o microfone e tente de novo.',
      falhou: 'Não consegui abrir o microfone. Feche outros apps que possam estar usando ele e tente de novo.',
      'sem-audio': 'Este navegador não tem suporte a áudio. Use o Chrome, Edge ou Safari atualizados.'
    };
    palco.corpo.innerHTML = '';
    palco.corpo.append(el('div', { class: 'cartao-erro' },
      el('div', { class: 'erro-icone' }, icone('mic')),
      el('h2', null, 'Microfone indisponível'),
      el('p', null, textos[e.codigo] || e.message),
      el('div', { class: 'linha-botoes' },
        el('button', { class: 'bt', onclick: () => aoTentarDeNovo && aoTentarDeNovo() }, 'Tentar de novo'),
        el('button', { class: 'bt bt-secundario', onclick: () => { E.dados.config.demo = true; E.salvar(); aviso('Modo demonstração ligado: um violão virtual toca por você.'); aoTentarDeNovo && aoTentarDeNovo(); } }, 'Ver em modo demonstração'))
    ));
  }

  // ---------- Resultado ----------
  function telaResultado(palco, o) {
    palco.corpo.innerHTML = '';
    const caixaEstrelas = estrelas(o.estrelas, 3, 'grandes animar');
    const cont = el('div', { class: 'resultado' },
      el('div', { class: 'resultado-topo' }, caixaEstrelas,
        el('h2', null, o.titulo || (o.estrelas >= 3 ? 'Perfeito!' : o.estrelas === 2 ? 'Muito bem!' : o.estrelas === 1 ? 'Passou!' : 'Quase lá')),
        o.subtitulo ? el('p', { class: 'resultado-sub' }, o.subtitulo) : null),
      o.linhas && o.linhas.length ? el('dl', { class: 'resultado-linhas' }, ...o.linhas.map(([k, v]) => el('div', null, el('dt', null, k), el('dd', null, v)))) : null,
      o.ganho && o.ganho.xp ? el('div', { class: 'resultado-xp' }, '+' + o.ganho.xp + ' XP') : null,
      o.dicas && o.dicas.length ? el('ul', { class: 'resultado-dicas' }, ...o.dicas.map((d) => el('li', null, d))) : null,
      o.ganho && o.ganho.novasConquistas && o.ganho.novasConquistas.length ? el('div', { class: 'resultado-conquistas' },
        el('div', { class: 'rotulo' }, 'Conquista nova'),
        ...o.ganho.novasConquistas.map((id) => { const c = C.CONQUISTAS.find((x) => x.id === id); return el('div', { class: 'conquista-mini' }, icone('trofeu'), el('b', null, c.nome), el('span', null, c.desc)); })) : null,
      o.extra || null,
      el('div', { class: 'linha-botoes coluna' }, ...(o.botoes || []).map((b) => el('button', { class: 'bt' + (b.primario ? '' : ' bt-secundario'), onclick: b.acao }, b.texto)))
    );
    palco.corpo.append(cont);
    if (o.estrelas > 0) M.somSucesso();
  }

  function proximaLicao(id) {
    const i = C.LICOES.findIndex((l) => l.id === id);
    return C.LICOES[i + 1] || null;
  }

  function botoesFim(palco, licao, repetir) {
    const prox = proximaLicao(licao.id);
    const b = [];
    if (prox && E.licaoDesbloqueada(prox.id)) b.push({ texto: 'Próxima: ' + prox.titulo, primario: true, acao: () => rodarLicao(prox) });
    b.push({ texto: 'Repetir', primario: !b.length, acao: repetir });
    b.push({ texto: 'Voltar para a trilha', acao: () => palco.fechar() });
    return b;
  }

  function musicasLiberadasPor(licao) {
    if (licao.tipo !== 'acorde') return [];
    return C.MUSICAS.filter((m) => m.acordes.includes(licao.acorde) && E.musicaDesbloqueada(m));
  }

  function concluir(palco, licao, estrelasN, o) {
    const jaTinha = E.concluida(licao.id);
    const ganho = estrelasN > 0 ? E.registrarLicao(licao.id, estrelasN) : null;
    if (estrelasN > 0 && licao.pularAte) E.pularAte(licao.id);
    let extra = null;
    if (estrelasN > 0 && !jaTinha) {
      const novas = musicasLiberadasPor(licao);
      if (novas.length) extra = el('div', { class: 'resultado-liberou' }, icone('musica'), el('div', null, el('b', null, 'Você já sabe todos os acordes de'), el('span', null, novas.map((m) => m.titulo).join(', '))));
    }
    telaResultado(palco, Object.assign({ estrelas: estrelasN, ganho, extra, botoes: botoesFim(palco, licao, () => rodarLicao(licao, palco)) }, o));
    if (window.App) window.App.atualizar();
  }

  // ---------- Despacho ----------
  function rodarLicao(licao, palcoExistente) {
    const palco = palcoExistente && palcoExistente === window.UI.palco ? (palcoExistente.limpar(), palcoExistente) : abrirPalco(licao.titulo, { aoFechar: () => window.App && window.App.atualizar() });
    palco.tituloEl.textContent = licao.titulo;
    const f = { info: licaoInfo, acorde: licaoAcorde, troca: licaoTroca, afinar: licaoAfinar, calibrar: licaoCalibrar, ritmo: licaoPista, progressao: licaoPista }[licao.tipo];
    f(palco, licao);
  }

  // ---------- Leitura + quiz ----------
  function licaoInfo(palco, licao) {
    let pag = 0;
    const total = licao.paginas.length;
    function mostrarPagina() {
      palco.corpo.innerHTML = '';
      const p = licao.paginas[pag];
      const pontos = el('div', { class: 'pontos' }, ...licao.paginas.map((_, i) => el('span', { class: i === pag ? 'ativo' : i < pag ? 'feito' : '' })));
      palco.corpo.append(el('div', { class: 'info-pagina' },
        pontos,
        figura(p.figura),
        el('h2', null, p.titulo),
        el('p', { html: p.texto }),
        el('div', { class: 'linha-botoes' },
          pag > 0 ? el('button', { class: 'bt bt-secundario', onclick: () => { pag--; mostrarPagina(); } }, 'Voltar') : null,
          el('button', { class: 'bt', onclick: () => { if (pag < total - 1) { pag++; mostrarPagina(); } else quiz(0, 0); } }, pag < total - 1 ? 'Próximo' : 'Fazer o quiz'))
      ));
    }
    function quiz(q, acertos) {
      if (q >= licao.quiz.length) {
        const n = licao.quiz.length;
        const est = acertos === n ? 3 : acertos >= n - 1 ? 2 : 1;
        concluir(palco, licao, est, { subtitulo: `${acertos} de ${n} respostas certas` });
        return;
      }
      const item = licao.quiz[q];
      palco.corpo.innerHTML = '';
      const fb = el('p', { class: 'quiz-retorno', 'aria-live': 'polite' });
      const opcoes = item.opcoes.map((op, i) => el('button', {
        class: 'quiz-opcao',
        onclick: () => {
          opcoes.forEach((b) => { b.disabled = true; });
          const certo = i === item.certa;
          opcoes[item.certa].classList.add('certa');
          if (!certo) opcoes[i].classList.add('errada');
          fb.textContent = certo ? 'Isso!' : 'A resposta certa está marcada em verde.';
          fb.className = 'quiz-retorno ' + (certo ? 'ok' : 'erro');
          prox.hidden = false;
          prox.onclick = () => quiz(q + 1, acertos + (certo ? 1 : 0));
        }
      }, op));
      const prox = el('button', { class: 'bt', hidden: true }, q < licao.quiz.length - 1 ? 'Próxima pergunta' : 'Ver resultado');
      palco.corpo.append(el('div', { class: 'quiz' },
        el('div', { class: 'rotulo' }, `Pergunta ${q + 1} de ${licao.quiz.length}`),
        el('h2', null, item.pergunta),
        el('div', { class: 'quiz-opcoes' }, ...opcoes), fb, prox));
    }
    mostrarPagina();
  }

  // ---------- Opção de capotraste ----------
  function opcaoCapo(capo, aoMudar) {
    if (!capo) return null;
    const id = 'sem-capo-' + Math.random().toString(36).slice(2, 7);
    const chk = el('input', { type: 'checkbox', id, checked: !E.dados.config.temCapo });
    chk.addEventListener('change', () => { E.dados.config.temCapo = !chk.checked; E.salvar(); aoMudar && aoMudar(); });
    return el('label', { class: 'opcao', for: id }, chk, el('span', null, 'Estou sem capotraste'));
  }

  // ---------- Aprender acorde ----------
  async function licaoAcorde(palco, licao) {
    const id = licao.acorde, ac = T.ACORDES[id];
    const precisa = 3;
    let sucessos = 0, falhas = 0, estado = 'esperando', okSeq = 0, tentativaDesde = 0, falhouNestaTentativa = false;
    const historicoCordas = [];
    const capoLicao = licao.capo || 0;
    let capo = capoEfetivo(capoLicao);

    const caixaDiag = el('div', { class: 'ac-diagrama' }, diagrama(id, { largura: 210, cordas: [null, null, null, null, null, null], capo }));
    const status = el('div', { class: 'ac-status', 'aria-live': 'polite' }, 'Monte o acorde e toque todas as cordas indicadas');
    const barraSim = el('div', { class: 'ac-sim' }, el('div'));
    const medidor = el('div', { class: 'medidor' }, el('div'));
    const progresso = el('div', { class: 'ac-progresso' }, ...Array.from({ length: precisa }, () => el('span')));
    const btOuvir = el('button', { class: 'bt bt-secundario' }, icone('som'), ' Ouvir');
    btOuvir.addEventListener('click', () => M.tocarAcorde(id, capo));
    const capoOpc = opcaoCapo(capoLicao, () => { capo = capoEfetivo(capoLicao); redesenhar([null, null, null, null, null, null]); });

    palco.corpo.innerHTML = '';
    palco.corpo.append(el('div', { class: 'licao-acorde' },
      el('div', { class: 'ac-cabeca' }, el('div', { class: 'ac-nome' }, ac.nome), el('div', { class: 'ac-extenso' }, ac.extenso)),
      caixaDiag,
      el('p', { class: 'ac-dica' }, ac.dica),
      el('div', { class: 'linha-botoes' }, btOuvir, capoOpc),
      el('div', { class: 'ac-escuta' }, el('div', { class: 'linha-medidor' }, icone('mic'), medidor), barraSim, status),
      progresso,
      el('p', { class: 'ac-legenda' }, 'Bolinhas embaixo do diagrama: verde = corda soando, vermelho = corda que talvez esteja abafada.')
    ));

    function redesenhar(cordas) {
      caixaDiag.innerHTML = '';
      caixaDiag.append(diagrama(id, { largura: 210, cordas, capo }));
    }

    const ok = await ligarMic(palco, () => licaoAcorde(palco, licao));
    if (!ok) return;

    let roboTimer = null;
    if (M.simulado) {
      const tocar = () => {
        const errar = Math.random() < 0.2;
        const outro = candidatosPara(id).filter((x) => x !== id)[Math.floor(Math.random() * 4)];
        M.roboBatida(errar ? outro : id, capo, M.agora() + 0.35, 'baixo', 0.8);
        roboTimer = setTimeout(tocar, 2600);
      };
      roboTimer = setTimeout(tocar, 800);
    }

    let tempoAcum = 0;
    const onAtaque = () => {
      if (estado === 'soando') { estado = 'esperando'; okSeq = 0; status.textContent = 'Ouvindo...'; }
      tentativaDesde = M.agora(); falhouNestaTentativa = false;
    };
    const onQuadro = (r) => {
      const fr = Math.max(0, Math.min(1, (r.db + 60) / 50));
      medidor.firstChild.style.width = (fr * 100).toFixed(0) + '%';
      if (r.silenciado) { status.textContent = 'Tocando o exemplo...'; return; }
      if (!r.temSinal) {
        barraSim.firstChild.style.width = '0%';
        if (estado === 'soando') { estado = 'esperando'; okSeq = 0; }
        return;
      }
      tempoAcum += 0.07;
      if (tempoAcum > 5) { E.somarTempo(tempoAcum); tempoAcum = 0; }
      const av = DSP.avaliarAlvo(r.chroma, id, capo, candidatosPara(id));
      barraSim.firstChild.style.width = Math.max(0, Math.min(100, (av.sAlvo - 0.55) / 0.43 * 100)).toFixed(0) + '%';
      barraSim.classList.toggle('ok', av.ok);
      historicoCordas.push(DSP.verificarCordas(r.picos, ac, capo));
      if (historicoCordas.length > 6) historicoCordas.shift();
      const cordas = [0, 1, 2, 3, 4, 5].map((s) => {
        let v = 0, f = 0;
        historicoCordas.forEach((h) => { if (h[s] === true) v++; else if (h[s] === false) f++; });
        return v + f < 3 ? null : f > v ? false : true;
      });
      redesenhar(cordas);
      if (estado === 'soando') return;
      if (av.ok) {
        okSeq++;
        status.textContent = 'Isso! ' + ac.nome;
        status.className = 'ac-status ok';
        if (okSeq >= 3) {
          sucessos++;
          progresso.children[sucessos - 1].classList.add('feito');
          estado = 'soando';
          if (sucessos >= precisa) { terminar(); return; }
          status.textContent = 'Muito bem! Solte os dedos, monte de novo e toque.';
        }
      } else {
        okSeq = 0;
        status.className = 'ac-status';
        const abafada = cordas.findIndex((c) => c === false);
        if (av.melhor.id !== id && av.melhor.s > av.sAlvo + 0.02) status.textContent = 'Parece ' + av.melhor.nome + '. Confira o diagrama.';
        else if (abafada >= 0) status.textContent = `A ${6 - abafada}ª corda (${T.NOMES_CORDAS[abafada]}) parece abafada.`;
        else status.textContent = 'Quase... aperte bem perto do traste.';
        if (!falhouNestaTentativa && tentativaDesde && M.agora() - tentativaDesde > 2.5) { falhas++; falhouNestaTentativa = true; }
      }
    };
    M.ouvQuadro.add(onQuadro);
    M.ouvAtaque.add(onAtaque);
    const limpar = () => { M.ouvQuadro.delete(onQuadro); M.ouvAtaque.delete(onAtaque); clearTimeout(roboTimer); if (tempoAcum) E.somarTempo(tempoAcum); tempoAcum = 0; };
    palco.aoFechar(limpar);

    function terminar() {
      limpar();
      M.desligarMicrofone();
      const est = falhas <= 1 ? 3 : falhas <= 3 ? 2 : 1;
      setTimeout(() => concluir(palco, licao, est, { titulo: 'Você tocou ' + ac.nome + '!', subtitulo: falhas ? `${falhas} ${falhas > 1 ? 'tentativas erradas' : 'tentativa errada'} no caminho` : 'Sem erros' }), 500);
    }
  }

  // ---------- Troca de 1 minuto ----------
  async function licaoTroca(palco, licao, opcoes) {
    const a = licao.a, b = licao.b;
    const capoLicao = licao.capo || 0;
    const capo = capoEfetivo(capoLicao);
    const duracao = 60;
    const metas = licao.metas || [10, 20, 30];
    const recorde = E.recordeTroca(a, b);
    palco.corpo.innerHTML = '';
    const cartao = (id) => el('div', { class: 'troca-cartao', 'data-id': id }, el('div', { class: 'troca-nome' }, T.ACORDES[id].nome), diagrama(id, { largura: 120 }));
    const ca = cartao(a), cb = cartao(b);
    const contador = el('div', { class: 'troca-contador' }, '0');
    const relogio = el('div', { class: 'troca-relogio' }, '1:00');
    const status = el('div', { class: 'ac-status', 'aria-live': 'polite' }, '');
    const btComecar = el('button', { class: 'bt' }, 'Começar');
    palco.corpo.append(el('div', { class: 'licao-troca' },
      el('p', { class: 'ac-dica' }, `Troque entre ${T.ACORDES[a].nome} e ${T.ACORDES[b].nome} o mais rápido que conseguir, sempre com som limpo. Toque uma batida em cada acorde. O app conta cada troca certa.`),
      caixaDica(C.dicaTroca(a, b)),
      el('div', { class: 'troca-par' }, ca, icone('troca', 'troca-seta'), cb),
      el('div', { class: 'troca-placar' }, el('div', null, el('div', { class: 'rotulo' }, 'Trocas'), contador), el('div', null, el('div', { class: 'rotulo' }, 'Tempo'), relogio), el('div', null, el('div', { class: 'rotulo' }, 'Recorde'), el('div', { class: 'troca-recorde' }, String(recorde)))),
      el('div', { class: 'troca-metas' }, ...metas.map((m, i) => el('span', null, estrelas(i + 1), ' ' + m))),
      status, btComecar));

    btComecar.addEventListener('click', async () => {
      btComecar.hidden = true;
      const ok = await ligarMic(palco, () => licaoTroca(palco, licao, opcoes));
      if (!ok) return;
      let n = 0, esperado = a, okSeq = 0, fim = 0, rodando = false, tempoAcum = 0;
      const marcar = () => { ca.classList.toggle('esperado', esperado === a); cb.classList.toggle('esperado', esperado === b); };
      marcar();
      // contagem 3-2-1
      for (const k of ['3', '2', '1']) { status.textContent = k; status.className = 'ac-status grande'; await new Promise((r) => setTimeout(r, 700)); if (!window.UI.palco) return; }
      status.textContent = 'Vai!'; status.className = 'ac-status';
      fim = M.agora() + duracao;
      rodando = true;
      let roboTimer = null;
      if (M.simulado) {
        const roboTocar = () => { M.roboBatida(esperado, capo, M.agora() + 0.31, 'baixo', 0.8); roboTimer = setTimeout(roboTocar, 900 + Math.random() * 700); };
        roboTocar();
      }
      const onQuadro = (r) => {
        if (!rodando) return;
        const resta = Math.max(0, fim - r.t);
        relogio.textContent = window.UI.formatarTempo(Math.ceil(resta));
        if (resta <= 0) { terminar(); return; }
        if (!r.temSinal || r.silenciado) { okSeq = 0; return; }
        tempoAcum += 0.07;
        const av = DSP.avaliarAlvo(r.chroma, esperado, capo, [a, b]);
        if (av.ok) {
          okSeq++;
          if (okSeq >= 2) {
            n++; contador.textContent = String(n);
            contador.classList.remove('pulso'); void contador.offsetWidth; contador.classList.add('pulso');
            esperado = esperado === a ? b : a; okSeq = 0; marcar();
          }
        } else okSeq = 0;
      };
      M.ouvQuadro.add(onQuadro);
      const limpar = () => { rodando = false; M.ouvQuadro.delete(onQuadro); clearTimeout(roboTimer); M.pararRobo(); if (tempoAcum) E.somarTempo(tempoAcum); tempoAcum = 0; };
      palco.aoFechar(limpar);
      function terminar() {
        if (!rodando) return;
        limpar();
        M.desligarMicrofone();
        // a 1ª detecção não é troca: conta trocas a partir do 1º acorde
        const trocas = Math.max(0, n - 1);
        const rec = E.registrarTroca(a, b, trocas);
        const est = trocas >= metas[2] ? 3 : trocas >= metas[1] ? 2 : trocas >= metas[0] ? 1 : 0;
        const linhas = [['Trocas em 1 minuto', String(trocas)], ['Recorde anterior', String(rec.anterior)]];
        const dicas = est < 3 ? ['Faça o movimento devagar e certo antes de acelerar. Velocidade vem da repetição.', 'Procure dedos que não precisam sair do lugar entre os dois acordes.'] : [];
        if (opcoes && opcoes.aoFim) { opcoes.aoFim({ estrelas: est, titulo: rec.recorde ? 'Novo recorde: ' + trocas + ' trocas!' : trocas + ' trocas', linhas, dicas }); return; }
        if (licao.id && licao.id.startsWith('livre')) {
          telaResultado(palco, { estrelas: est, titulo: rec.recorde ? 'Novo recorde!' : trocas + ' trocas', linhas, dicas, botoes: [{ texto: 'De novo', primario: true, acao: () => licaoTroca(palco, licao, opcoes) }, { texto: 'Fechar', acao: () => palco.fechar() }] });
        } else {
          concluir(palco, licao, est, { titulo: rec.recorde ? 'Novo recorde: ' + trocas + ' trocas!' : trocas + ' trocas', linhas, dicas: est ? dicas : ['Para passar, faça pelo menos ' + metas[0] + ' trocas. Treine devagar e tente de novo.'] });
        }
      }
    });
  }

  // ---------- Afinador ----------
  async function licaoAfinar(palco, licao) {
    const afinadas = [false, false, false, false, false, false];
    palco.corpo.innerHTML = '';
    const chips = T.CORDAS_SOLTAS.map((m, s) => el('button', { class: 'corda-chip', 'aria-label': `Tocar nota da ${6 - s}ª corda`, onclick: () => M.tocarNota(m, 2) }, el('b', null, String(6 - s) + 'ª'), el('span', null, T.NOMES_NOTAS[m % 12] + (Math.floor(m / 12) - 1))));
    const nota = el('div', { class: 'afin-nota' }, '–');
    const cents = el('div', { class: 'afin-cents' }, 'toque uma corda solta');
    const ponteiro = el('div', { class: 'afin-ponteiro' });
    const instr = el('div', { class: 'ac-status', 'aria-live': 'polite' }, '');
    const medidor = el('div', { class: 'medidor' }, el('div'));
    const gauge = el('div', { class: 'afin-escala' }, el('div', { class: 'afin-zona' }), ponteiro, el('span', { class: 'e' }, '−50'), el('span', { class: 'c' }, '0'), el('span', { class: 'd' }, '+50'));
    const btPular = licao ? el('button', { class: 'bt bt-secundario', onclick: () => fim(true) }, 'Já está afinado, pular') : null;
    palco.corpo.append(el('div', { class: 'afinador' },
      el('p', { class: 'ac-dica' }, 'Toque uma corda solta por vez e deixe soar. Ajuste a tarraxa até o ponteiro ficar no meio. Toque num botão para ouvir a nota certa.'),
      el('div', { class: 'cordas-chips' }, ...chips),
      nota, gauge, cents, instr,
      el('div', { class: 'linha-medidor' }, icone('mic'), medidor),
      btPular));
    const ok = await ligarMic(palco, () => licaoAfinar(palco, licao));
    if (!ok) return;

    let roboTimer = null;
    if (M.simulado) {
      let s = 0; const desv = [-35, 22, -12, 8, -4, 2];
      const tocar = () => { const m = T.CORDAS_SOLTAS[s] + (afinadas[s] ? 0 : desv[s] * Math.random()) / 100; M.roboNota(m, M.agora() + 0.35); if (afinadas[s]) s = (s + 1) % 6; roboTimer = setTimeout(tocar, 1800); };
      tocar();
    }
    const hist = [];
    let estavel = 0, cordaAtual = -1;
    const onQuadro = (r) => {
      medidor.firstChild.style.width = (Math.max(0, Math.min(1, (r.db + 60) / 50)) * 100).toFixed(0) + '%';
      if (!r.temSinal || r.silenciado) { estavel = 0; return; }
      const y = DSP.yin(M.buf, M.ctx.sampleRate, { tamanho: 4096 });
      if (!y.freq || y.confianca < 0.75) return;
      const midi = T.midiDeFreq(y.freq);
      hist.push(midi); if (hist.length > 5) hist.shift();
      const ordenado = [...hist].sort((p, q) => p - q);
      const med = ordenado[ordenado.length >> 1];
      let s = -1, dmin = 3;
      T.CORDAS_SOLTAS.forEach((m, i) => { const d = Math.abs(med - m); if (d < dmin) { dmin = d; s = i; } });
      const prox = Math.round(med);
      nota.textContent = T.NOMES_NOTAS[((prox % 12) + 12) % 12] + (Math.floor(prox / 12) - 1);
      if (s < 0) { cents.textContent = 'não parece uma corda solta'; ponteiro.style.transform = 'translateX(-50%) rotate(0deg)'; return; }
      const c = (med - T.CORDAS_SOLTAS[s]) * 100;
      if (s !== cordaAtual) { cordaAtual = s; estavel = 0; }
      chips.forEach((ch, i) => ch.classList.toggle('atual', i === s));
      const cl = Math.max(-50, Math.min(50, c));
      ponteiro.style.transform = `translateX(-50%) rotate(${(cl * 1.1).toFixed(1)}deg)`;
      cents.textContent = `${6 - s}ª corda · ${c > 0 ? '+' : ''}${c.toFixed(0)} cents`;
      if (Math.abs(c) <= 6) {
        instr.textContent = 'Afinada!'; instr.className = 'ac-status ok'; ponteiro.classList.add('ok');
        if (++estavel >= 8 && !afinadas[s]) {
          afinadas[s] = true; chips[s].classList.add('feito');
          if (afinadas.every(Boolean)) fim(false);
        }
      } else {
        estavel = 0; ponteiro.classList.remove('ok'); instr.className = 'ac-status';
        instr.textContent = c < 0 ? 'Está grave: suba a afinação (aperte a corda)' : 'Está aguda: desça a afinação (afrouxe a corda)';
      }
    };
    M.ouvQuadro.add(onQuadro);
    const limpar = () => { M.ouvQuadro.delete(onQuadro); clearTimeout(roboTimer); };
    palco.aoFechar(limpar);
    function fim(pulou) {
      limpar();
      M.desligarMicrofone();
      if (!licao) { telaResultado(palco, { estrelas: 3, titulo: 'Violão afinado', botoes: [{ texto: 'Fechar', primario: true, acao: () => palco.fechar() }] }); return; }
      concluir(palco, licao, pulou ? 1 : 3, { titulo: pulou ? 'Pulamos a afinação' : 'Violão afinado!', subtitulo: pulou ? 'Volte aqui sempre que o som parecer estranho.' : 'As 6 cordas estão no lugar.' });
    }
  }

  // ---------- Sincronização (latência) ----------
  async function licaoCalibrar(palco, licao) {
    palco.corpo.innerHTML = '';
    const bpm = 80, batida = 60 / bpm, contagem = 4, medir = 12;
    const btComecar = el('button', { class: 'bt' }, 'Começar');
    const status = el('div', { class: 'ac-status', 'aria-live': 'polite' }, '');
    const bolas = el('div', { class: 'calib-bolas' }, ...Array.from({ length: medir }, () => el('span')));
    const btPular = licao ? el('button', { class: 'bt bt-secundario', onclick: () => salvarEFim(null) }, 'Pular (usar valor padrão)') : null;
    palco.corpo.append(el('div', { class: 'calibrar' },
      figura('pendulo'),
      el('p', { class: 'ac-dica' }, 'Todo celular demora um pouco para tocar e para ouvir. Para medir esse atraso: abafe as cordas com a mão do braço (encoste sem apertar) e bata para baixo junto com cada clique. São 4 cliques de contagem e 12 para medir. Fone de ouvido deixa a medida mais precisa.'),
      bolas, status, el('div', { class: 'linha-botoes coluna' }, btComecar, btPular)));

    btComecar.addEventListener('click', async () => {
      btComecar.hidden = true;
      const ok = await ligarMic(palco, () => licaoCalibrar(palco, licao));
      if (!ok) return;
      const volAntes = M.volumeClique;
      if (M.volumeClique < 0.3) M.volumeClique = 0.5;
      const t0 = M.agora() + 0.6;
      const tempos = Array.from({ length: medir }, (_, k) => t0 + (contagem + k) * batida);
      const parar = M.metronomo(t0, batida, contagem + medir, 4);
      if (M.simulado) tempos.forEach((t) => M.roboBatida('Em', 0, t + (Math.random() - 0.5) * 0.02, 'baixo', 0.4));
      const difs = new Array(medir).fill(null);
      const onAtaque = (ev) => {
        let k = -1, dm = 0.3;
        tempos.forEach((t, i) => { const d = Math.abs(ev.t - t); if (d < dm && difs[i] === null) { dm = d; k = i; } });
        if (k >= 0) { difs[k] = ev.t - tempos[k]; bolas.children[k].classList.add('feito'); }
      };
      M.ouvAtaque.add(onAtaque);
      let raf = 0;
      const tick = () => {
        const agora = M.agora();
        const k = Math.floor((agora - t0) / batida);
        status.textContent = k < contagem ? 'Contagem: ' + (contagem - Math.max(0, k)) : k < contagem + medir ? 'Bata junto com o clique' : '';
        if (agora > tempos[medir - 1] + 0.6) { fim(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const limpar = () => { cancelAnimationFrame(raf); parar(); M.ouvAtaque.delete(onAtaque); M.volumeClique = volAntes; };
      palco.aoFechar(limpar);
      function fim() {
        limpar();
        const v = difs.filter((d) => d !== null).sort((p, q) => p - q);
        if (v.length < 6) {
          status.textContent = `Só ouvi ${v.length} de ${medir} batidas. Toque um pouco mais forte e tente de novo.`;
          btComecar.hidden = false; btComecar.textContent = 'Tentar de novo';
          M.desligarMicrofone();
          return;
        }
        const med = v[v.length >> 1];
        const desvios = v.map((d) => Math.abs(d - med)).sort((p, q) => p - q);
        const mad = desvios[desvios.length >> 1];
        if (mad > 0.06 || med < -0.1 || med > 0.45) {
          status.textContent = 'As batidas ficaram irregulares. Tente seguir o clique com calma.';
          btComecar.hidden = false; btComecar.textContent = 'Tentar de novo';
          M.desligarMicrofone();
          return;
        }
        M.desligarMicrofone();
        salvarEFim(med, v.length);
      }
    });

    function salvarEFim(latencia, n) {
      if (!M.simulado) { E.dados.config.latencia = latencia; E.salvar(); }
      M.latencia = latencia !== null ? latencia : M.latenciaPadrao();
      const linhas = latencia !== null ? [['Atraso medido', Math.round(latencia * 1000) + ' ms'], ['Batidas ouvidas', n + ' de 12']] : [];
      if (!licao) { telaResultado(palco, { estrelas: 3, titulo: 'Sincronizado', linhas, botoes: [{ texto: 'Fechar', primario: true, acao: () => palco.fechar() }] }); return; }
      concluir(palco, licao, latencia !== null ? 3 : 1, { titulo: latencia !== null ? 'App sincronizado' : 'Usando o valor padrão', linhas });
    }
  }

  // ---------- Tela de preparo da pista ----------
  function chipsAcordes(ids, capo) {
    return el('div', { class: 'chips-acordes' }, ...ids.map((id) => el('button', { class: 'chip-acorde', 'aria-label': 'Ouvir ' + T.ACORDES[id].nome, onclick: () => M.tocarAcorde(id, capo) }, diagrama(id, { largura: 64 }), el('span', null, T.ACORDES[id].nome))));
  }
  function setasPadrao(padraoId) {
    const slots = C.PADROES[padraoId].slots;
    const rot = ['1', 'e', '2', 'e', '3', 'e', '4', 'e'];
    return el('div', { class: 'padrao-visual', 'aria-label': C.PADROES[padraoId].nome },
      ...slots.map((s, i) => el('div', { class: 'padrao-slot ' + (s === 'B' ? 'baixo' : s === 'C' ? 'cima' : 'vazio') }, el('span', { class: 'seta' }, s === 'B' ? '↓' : s === 'C' ? '↑' : '·'), el('span', { class: 'conta' }, rot[i]))));
  }
  function caixaDica(texto) { return el('div', { class: 'dica-troca' }, icone('info'), el('span', null, texto)); }
  // botão que toca o exemplo do ritmo; obter() devolve {padrao, bpm, ids, capo}
  function botaoOuvir(obter) {
    const b = el('button', { class: 'bt bt-secundario' });
    const desenhar = (tocando) => { b.innerHTML = ''; b.append(icone(tocando ? 'fechar' : 'som'), tocando ? ' Parar' : ' Ouvir o ritmo'); };
    desenhar(false);
    b.addEventListener('click', () => {
      if (M.exemplo) { M.pararExemplo(); return; }
      const o = obter();
      desenhar(true);
      M.tocarPadrao(C.PADROES[o.padrao].slots, o.bpm, o.ids, o.capo || 0, o.ids.length > 1 ? 4 : 2, () => desenhar(false));
    });
    return b;
  }
  function opcaoConfig(chave, rotulo) {
    const id = 'op-' + chave + '-' + Math.random().toString(36).slice(2, 7);
    const chk = el('input', { type: 'checkbox', id, checked: !!E.dados.config[chave] });
    chk.addEventListener('change', () => { E.dados.config[chave] = chk.checked; E.salvar(); });
    return el('label', { class: 'opcao', for: id }, chk, el('span', null, rotulo));
  }
  function opcoesBanda() { return [opcaoConfig('bandaSint', 'Bateria e baixo sintetizados (não é a gravação)'), opcaoConfig('fone', 'Estou de fone de ouvido')]; }
  const AVISO_FONE = 'Sem fone, o som da banda entra no microfone: o app confere só os acordes e fica mais generoso. Com fone de ouvido ele confere também cada batida.';
  function opcaoMetronomo() {
    const id = 'metro-' + Math.random().toString(36).slice(2, 7);
    const chk = el('input', { type: 'checkbox', id, checked: E.dados.config.volumeClique > 0 });
    chk.addEventListener('change', () => { if (chk.checked && E.dados.config.volumeClique <= 0) E.dados.config.volumeClique = 0.5; if (!chk.checked) E.dados.config.volumeClique = 0; E.salvar(); });
    return el('label', { class: 'opcao', for: id }, chk, el('span', null, 'Clique do metrônomo'));
  }

  function licaoPista(palco, licao) {
    const capoLicao = licao.capo || 0;
    const ritmo = licao.tipo === 'ritmo';
    const montar = () => {
      const capo = capoEfetivo(capoLicao);
      let blocos = [], total;
      if (ritmo) {
        total = licao.compassos * 4;
        if (licao.acorde) for (let c = 0; c < licao.compassos; c++) blocos.push({ id: licao.acorde, inicio: c * 4, dur: 4 });
      } else {
        const r = C.blocosDe(licao.compassos, licao.repetir);
        blocos = r.blocos; total = r.total;
      }
      return { capo, blocos, total };
    };
    const ids = ritmo ? (licao.acorde ? [licao.acorde] : []) : [...new Set(C.blocosDe(licao.compassos, 1).blocos.map((b) => b.id))];
    palco.corpo.innerHTML = '';
    const semCalib = (E.dados.config.latencia === null || E.dados.config.latencia === undefined) && !E.dados.config.demo;
    const btComecar = el('button', { class: 'bt' }, icone('play'), ' Começar');
    palco.corpo.append(el('div', { class: 'preparo' },
      licao.desafio ? el('div', { class: 'selo-desafio' }, icone('bandeira'), licao.pularAte ? 'Teste para pular a unidade' : 'Desafio da unidade') : null,
      el('p', { class: 'ac-dica' }, licao.resumo + '. ' + (ritmo && !licao.acorde ? 'Abafe as cordas e bata no ritmo das setas quando elas passarem pela linha.' : 'Troque de acorde quando o bloco chegar na linha e siga as setas.')),
      ids.length ? chipsAcordes(ids, capoEfetivo(capoLicao)) : null,
      el('div', { class: 'rotulo' }, 'Ritmo: ' + C.PADROES[licao.padrao].nome),
      setasPadrao(licao.padrao),
      el('div', { class: 'preparo-info' }, el('span', null, licao.bpm + ' batidas por minuto'), el('span', null, (ritmo ? licao.compassos : C.blocosDe(licao.compassos, licao.repetir).total / 4) + ' compassos')),
      ids.length === 2 ? caixaDica(C.dicaTroca(ids[0], ids[1])) : null,
      el('div', { class: 'linha-botoes' }, botaoOuvir(() => ({ padrao: licao.padrao, bpm: licao.bpm, ids, capo: capoEfetivo(capoLicao) }))),
      el('div', { class: 'opcoes' }, opcaoMetronomo(), opcaoCapo(capoLicao, () => { M.pararExemplo(); licaoPista(palco, licao); }), ...(ritmo ? [] : opcoesBanda())),
      ritmo ? null : el('p', { class: 'nota' }, AVISO_FONE),
      semCalib ? el('p', { class: 'nota' }, 'Dica: faça a lição "Sincronize o app" para o tempo das batidas ser medido com precisão.') : null,
      btComecar));
    palco.aoFechar(() => M.pararExemplo());
    btComecar.addEventListener('click', async () => {
      M.pararExemplo();
      const ok = await ligarMic(palco, () => licaoPista(palco, licao));
      if (!ok) return;
      const { capo, blocos, total } = montar();
      const r = await window.Pista.rodarPista(palco, {
        blocos, total, padrao: licao.padrao, bpm: licao.bpm, capo,
        avaliarAcordes: blocos.length > 0, avaliarRitmo: ritmo || !E.dados.config.bandaSint || E.dados.config.fone, abafado: ritmo && !licao.acorde,
        banda: !ritmo && E.dados.config.bandaSint, metronomo: E.dados.config.volumeClique > 0, candidatos: [...new Set(blocos.map((b) => b.id))].concat(candidatosPara(ids[0] || 'Em')).filter((v, i, a) => a.indexOf(v) === i),
        acordeRobo: 'Em'
      });
      M.desligarMicrofone();
      if (!r) { licaoPista(palco, licao); return; }
      const linhas = [];
      if (r.avaliouAcordes) linhas.push(['Acordes certos', `${r.okBlocos} de ${r.nBlocos}`]);
      if (r.avaliouRitmo) linhas.push(['Batidas no tempo', `${r.perf + r.bom} de ${r.nBatidas}`], ['Perfeitas', String(r.perf)]);
      linhas.push(['Nota', Math.round(r.pct * 100) + '%']);
      concluir(palco, licao, r.estrelas, { linhas, dicas: window.Pista.dicasDoResultado(r).concat(r.estrelas ? [] : ['Para passar, chegue a 60%. Diminua a pressa: firmeza vem antes da velocidade.']) });
    });
  }

  // ---------- Músicas ----------
  function abrirMusica(m) {
    const palco = abrirPalco(m.titulo, { aoFechar: () => window.App && window.App.atualizar() });
    paginaMusica(palco, m);
  }

  function paginaMusica(palco, m) {
    palco.limpar();
    palco.tituloEl.textContent = m.titulo;
    if (m.gravacao) { paginaGravacao(palco, m); return; }
    const prog = E.dados.musicas[m.id] || { partes: {} };
    const pref = E.dados.config['musica-' + m.id] || { velocidade: 0.7, nivel: 'medio' };
    const ids = [...new Set(m.secoes.flatMap((s) => s.compassos.split(/[|\s]+/).filter(Boolean)))];
    const capo = capoEfetivo(m.capo);

    const vel = el('input', { type: 'range', id: 'vel-' + m.id, min: '50', max: '100', step: '5', value: String(Math.round(pref.velocidade * 100)) });
    const velTxt = el('output', { for: vel.id }, Math.round(pref.velocidade * 100) + '% · ' + Math.round(m.bpm * pref.velocidade) + ' bpm');
    vel.addEventListener('input', () => { pref.velocidade = Number(vel.value) / 100; velTxt.textContent = vel.value + '% · ' + Math.round(m.bpm * pref.velocidade) + ' bpm'; salvarPref(); });
    const niveis = el('div', { class: 'segmentado', role: 'radiogroup', 'aria-label': 'Nível do ritmo' }, ...C.NIVEIS_RITMO.map((n) => {
      const b = el('button', { role: 'radio', 'aria-checked': String(pref.nivel === n.id), class: pref.nivel === n.id ? 'ativo' : '' }, el('b', null, n.nome), el('span', null, n.id === 'original' ? C.PADROES[m.padrao].curto : n.desc));
      b.addEventListener('click', () => { pref.nivel = n.id; salvarPref(); [...niveis.children].forEach((c) => { c.classList.remove('ativo'); c.setAttribute('aria-checked', 'false'); }); b.classList.add('ativo'); b.setAttribute('aria-checked', 'true'); });
      return b;
    }));
    function salvarPref() { E.dados.config['musica-' + m.id] = pref; E.salvar(); }

    const btPrevia = el('button', { class: 'bt bt-secundario' });
    const desenharPrevia = (tocando) => { btPrevia.innerHTML = ''; btPrevia.append(icone(tocando ? 'fechar' : 'som'), tocando ? ' Parar' : ' Ouvir como fica'); };
    desenharPrevia(false);
    btPrevia.hidden = !!m.gravacao;
    btPrevia.addEventListener('click', async () => {
      if (M.bandaAtual) { M.pararBanda(); return; }
      await M.garantirContexto();
      const sec = m.secoes.find((x) => x.id === 'refrao') || m.secoes[0];
      const trecho = C.blocosDaMusica(m, sec.id);
      const nv = C.NIVEIS_RITMO.find((n) => n.id === pref.nivel) || C.NIVEIS_RITMO[1];
      desenharPrevia(true);
      M.banda(M.agora() + 0.3, 60 / Math.round(m.bpm * pref.velocidade), trecho.blocos, trecho.total, capoEfetivo(m.capo), { slotsGuia: C.PADROES[nv.padrao || m.padrao].slots, aoFim: () => desenharPrevia(false) });
    });
    palco.aoFechar(() => M.pararBanda());
    const faltando = E.acordesFaltando(m);
    const caixaFalta = faltando.length ? el('div', { class: 'falta-acordes' },
      el('b', null, faltando.length === 1 ? 'Falta 1 acorde para esta música' : 'Faltam ' + faltando.length + ' acordes para esta música'),
      el('span', null, 'Aprenda cada um em 2 minutos. Você também pode tocar agora mesmo e ir pegando no caminho.'),
      el('div', { class: 'linha-botoes' }, ...faltando.map((id) => el('button', { class: 'bt bt-pequeno', onclick: () => rodarLicao(C.LICOES.find((l) => l.tipo === 'acorde' && l.acorde === id)) }, 'Aprender ' + T.ACORDES[id].nome)))) : null;
    const totalCompassos = C.blocosDaMusica(m).total / 4;
    const minutos = (totalCompassos * 4 * 60 / m.bpm) / 60;
    palco.corpo.append(el('div', { class: 'musica-pagina' },
      el('div', { class: 'musica-cabeca' },
        el('div', null, el('h2', null, m.titulo), el('div', { class: 'musica-artista' }, m.artista)),
        prog.estrelas ? estrelas(prog.estrelas) : null),
      el('p', { class: 'ac-dica' }, m.nota),
      caixaFalta,
      secaoGravacao(palco, m, pref),
      el('div', { class: 'rotulo' }, 'Acordes' + (m.capo && capo ? ` · capotraste na casa ${m.capo}` : '')),
      chipsAcordes(ids, capo),
      el('div', { class: 'opcoes' }, ...opcoesBanda(), opcaoCapo(m.capo, () => paginaMusica(palco, m)), opcaoMetronomo()),
      el('p', { class: 'nota' }, AVISO_FONE),
      el('div', { class: 'rotulo' }, m.gravacao ? 'Ou treine sem a gravação · ritmo' : 'Ritmo'), niveis,
      el('div', { class: 'rotulo' }, 'Velocidade'), el('div', { class: 'linha-range' }, vel, velTxt),
      el('div', { class: 'linha-botoes' }, btPrevia, E.dados.foco === m.id ? null : el('button', { class: 'bt bt-secundario', onclick: () => { E.dados.foco = m.id; E.salvar(); aviso('Esta agora é a sua música na tela inicial.', 'ok'); } }, 'Escolher como minha música')),
      el('div', { class: 'rotulo' }, 'Treine por partes'),
      el('div', { class: 'secoes' }, ...m.secoes.map((s) => el('button', { class: 'secao', onclick: () => tocarMusica(palco, m, s.id, pref) },
        el('div', null, el('b', null, s.nome), el('span', null, s.compassos.split('|').map((c) => c.trim().split(/\s+/).map((i) => T.ACORDES[i].nome).join(' ')).join(' · '))),
        estrelas(prog.partes ? prog.partes[s.id] || 0 : 0)))),
      el('div', { class: 'projeto-final' },
        el('div', null, el('div', { class: 'rotulo' }, 'Projeto final'), el('b', null, 'Música completa'), el('span', null, `${totalCompassos} compassos · ${minutos.toFixed(1).replace('.', ',')} min na velocidade original`)),
        el('button', { class: 'bt', onclick: () => tocarMusica(palco, m, null, pref) }, icone('play'), ' Tocar tudo')),
      prog.melhorPct ? el('p', { class: 'nota' }, `Seu melhor: ${Math.round(prog.melhorPct * 100)}% · ritmo ${(C.NIVEIS_RITMO.find((n) => n.id === prog.nivel) || {}).nome || '-'} · ${Math.round((prog.velocidade || 0) * 100)}% da velocidade`) : null
    ));
  }

  async function tocarMusica(palco, m, secaoId, pref) {
    palco.limpar();
    const ok = await ligarMic(palco, () => paginaMusica(palco, m));
    if (!ok) return;
    const capo = capoEfetivo(m.capo);
    const { blocos, total, marcas } = C.blocosDaMusica(m, secaoId);
    const nivel = C.NIVEIS_RITMO.find((n) => n.id === pref.nivel) || C.NIVEIS_RITMO[1];
    const padrao = nivel.padrao || m.padrao;
    const bpm = Math.round(m.bpm * pref.velocidade);
    const sec = secaoId ? m.secoes.find((s) => s.id === secaoId) : null;
    palco.tituloEl.textContent = m.titulo + (sec ? ' · ' + sec.nome : '');
    const ids = [...new Set(blocos.map((b) => b.id))];
    const r = await window.Pista.rodarPista(palco, {
      blocos, total, padrao, bpm, capo, marcas: secaoId ? [] : marcas,
      avaliarAcordes: true, avaliarRitmo: nivel.id !== 'facil' && (!E.dados.config.bandaSint || E.dados.config.fone),
      banda: E.dados.config.bandaSint, metronomo: E.dados.config.volumeClique > 0, candidatos: ids.concat(candidatosPara(ids[0])).filter((v, i, a) => a.indexOf(v) === i)
    });
    M.desligarMicrofone();
    if (!r) { paginaMusica(palco, m); return; }
    const ganho = E.registrarMusica(m.id, secaoId, r.estrelas, r.pct, nivel.id, pref.velocidade);
    const linhas = [['Acordes certos', `${r.okBlocos} de ${r.nBlocos}`]];
    if (r.avaliouRitmo) linhas.push(['Batidas no tempo', `${r.perf + r.bom} de ${r.nBatidas}`]);
    linhas.push(['Velocidade', Math.round(pref.velocidade * 100) + '%'], ['Nota', Math.round(r.pct * 100) + '%']);
    const dicas = window.Pista.dicasDoResultado(r);
    if (E.dados.config.bandaSint && !E.dados.config.fone && nivel.id !== 'facil') dicas.push('Sem fone, o app conferiu só os acordes. Com fone de ouvido ele confere também as batidas.');
    if (!secaoId && r.estrelas > 0 && pref.velocidade < 1) dicas.push('Próximo passo: suba a velocidade aos poucos até 100%.');
    if (!secaoId && r.estrelas > 0 && nivel.id !== 'original') dicas.push('Quando ficar fácil, troque o ritmo para "Completo".');
    telaResultado(palco, {
      estrelas: r.estrelas, ganho, linhas, dicas,
      titulo: !secaoId && r.estrelas > 0 ? (ganho.primeira ? 'Você tocou ' + m.titulo + ' inteira!' : 'Música completa!') : null,
      botoes: [
        { texto: 'Repetir', primario: true, acao: () => tocarMusica(palco, m, secaoId, pref) },
        { texto: 'Voltar para a música', acao: () => paginaMusica(palco, m) }
      ]
    });
    if (window.App) window.App.atualizar();
  }

  // ---------- Tocar com a gravação original ----------
  // O áudio é do próprio usuário e fica só no aparelho (IndexedDB). Nada é enviado.
  const Gravacoes = {
    db() { return new Promise((ok, falha) => { const r = indexedDB.open('violao-gravacoes', 1); r.onupgradeneeded = () => r.result.createObjectStore('arquivos'); r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); }); },
    async ler(id) { try { const db = await this.db(); return await new Promise((ok) => { const q = db.transaction('arquivos').objectStore('arquivos').get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); } catch (e) { return null; } },
    async gravar(id, blob) { const db = await this.db(); return new Promise((ok, falha) => { const tx = db.transaction('arquivos', 'readwrite'); tx.objectStore('arquivos').put(blob, id); tx.oncomplete = () => ok(); tx.onerror = () => falha(tx.error); }); },
    async obter(id) {
      let b = await this.ler(id);
      if (b) return b;
      try { // servidor local do PC: pega da pasta musicas-originais
        const r = await fetch('/gravacoes/' + id, { cache: 'no-store' });
        if (r.ok && (r.headers.get('content-type') || '').startsWith('audio')) { b = await r.blob(); try { await this.gravar(id, b); } catch (e) { /* segue sem guardar */ } return b; }
      } catch (e) { /* sem servidor local */ }
      return null;
    }
  };

  function secaoGravacao(palco, m, pref) {
    if (!m.gravacao) return null;
    const g = m.gravacao, fmt = window.UI.formatarTempo;
    const guardar = () => { E.dados.config['musica-' + m.id] = pref; E.salvar(); };
    const status = el('p', { class: 'nota' }, 'Procurando a gravação neste aparelho...');
    const lista = el('div', { class: 'secoes' });
    const arq = el('input', { type: 'file', accept: 'audio/*', id: 'grav-arq-' + m.id, hidden: true });
    const btArq = el('button', { class: 'bt bt-secundario bt-pequeno', onclick: () => arq.click() }, 'Escolher o arquivo de áudio');
    const vel = el('select', { id: 'grav-vel-' + m.id }, ...[[1, 'Velocidade normal'], [0.85, '85% (mais devagar)'], [0.75, '75% (bem devagar)']].map(([v, t]) => el('option', { value: String(v), selected: (pref.velGrav || 1) === v }, t)));
    vel.addEventListener('change', () => { pref.velGrav = Number(vel.value); guardar(); });
    const aj = el('input', { type: 'range', id: 'grav-aj-' + m.id, min: '-1', max: '1', step: '0.1', value: String(pref.ajuste || 0) });
    const ajTxt = el('output', { for: aj.id });
    const mostrarAj = () => { const v = Number(aj.value); ajTxt.textContent = v === 0 ? 'no ponto' : (v < 0 ? 'acordes ' + (-v).toFixed(1) + ' s antes' : 'acordes ' + v.toFixed(1) + ' s depois'); };
    mostrarAj();
    aj.addEventListener('input', () => { pref.ajuste = Number(aj.value); mostrarAj(); guardar(); });
    function pronto(blob) {
      status.textContent = 'Gravação pronta neste aparelho. Use fone de ouvido: sem fone, a música entra no microfone e o app não distingue o seu violão.';
      btArq.textContent = 'Trocar o arquivo';
      lista.innerHTML = '';
      lista.append(
        el('button', { class: 'secao', onclick: () => tocarGravacao(palco, m, blob, null, pref) }, el('div', null, el('b', null, 'Música inteira'), el('span', null, fmt(g.duracao))), icone('play')),
        ...g.marcas.map((mk) => el('button', { class: 'secao', onclick: () => tocarGravacao(palco, m, blob, mk, pref) }, el('div', null, el('b', null, mk.nome), el('span', null, fmt(mk.ini) + ' a ' + fmt(mk.fim))), icone('play'))));
    }
    arq.addEventListener('change', async () => { const fl = arq.files[0]; if (!fl) return; try { await Gravacoes.gravar(m.id, fl); } catch (e) { aviso('Não consegui guardar o arquivo; ele vale só para agora.'); } pronto(fl); });
    Gravacoes.obter(m.id).then((b) => { if (b) pronto(b); else status.textContent = 'Escolha o arquivo de áudio desta música no seu aparelho. Ele fica guardado só aqui e não é enviado para a internet.'; });
    return el('div', { class: 'gravacao' },
      el('div', { class: 'rotulo' }, 'Tocar com a gravação original'),
      status, lista,
      el('div', { class: 'campo' }, el('label', { for: vel.id }, 'Velocidade da gravação'), vel),
      el('div', { class: 'campo' }, el('label', { for: aj.id }, 'Ajuste fino da sincronia'), el('div', { class: 'linha-range' }, aj, ajTxt)),
      el('div', { class: 'opcoes' }, opcaoConfig('fone', 'Estou de fone de ouvido')),
      btArq, arq);
  }

  async function tocarGravacao(palco, m, blob, trecho, pref) {
    // o toque do usuário libera o áudio: toca mudo e pausa já
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    audio.src = url; audio.preload = 'auto';
    audio.muted = true;
    const destravar = audio.play().then(() => { audio.pause(); }).catch(() => {});
    M.pararBanda(); M.pararExemplo();
    palco.limpar();
    const ok = await ligarMic(palco, () => paginaMusica(palco, m));
    if (!ok) { URL.revokeObjectURL(url); return; }
    await destravar;
    const g = m.gravacao, taxa = pref.velGrav || 1, aj = pref.ajuste || 0;
    const ini = trecho ? trecho.ini : 0, fim = trecho ? trecho.fim : g.duracao;
    const blocos = [];
    g.acordes.forEach(([t, id], i) => {
      const a = Math.max(t + aj, ini), b = Math.min(i + 1 < g.acordes.length ? g.acordes[i + 1][0] + aj : g.duracao, fim);
      if (id && b - a > 0.3) blocos.push({ id, inicio: a - ini, dur: b - a });
    });
    audio.muted = false; audio.playbackRate = taxa;
    try { audio.currentTime = ini; } catch (e) { /* ajusta ao tocar */ }
    let tPlay = 0, tocando = false, timer = 0;
    const relogio = () => (tocando ? audio.currentTime - ini : (M.agora() - tPlay) * taxa);
    palco.tituloEl.textContent = m.titulo + (trecho ? ' · ' + trecho.nome : ' · gravação');
    const ids = [...new Set(blocos.map((x) => x.id))];
    const fone = !!E.dados.config.fone;
    const r = await window.Pista.rodarPista(palco, {
      blocos, total: fim - ini, padrao: 'livre', bpm: 60 * taxa, capo: g.capo || 0,
      avaliarAcordes: true, avaliarRitmo: fone, metronomo: false, semGrade: true, relogio,
      marcas: trecho ? [] : g.marcas.map((mk) => ({ nome: mk.nome, inicio: mk.ini })),
      candidatos: ids.concat(candidatosPara(ids[0])).filter((v, i, arr) => arr.indexOf(v) === i),
      aoIniciar: (t0) => {
        tPlay = t0;
        timer = setTimeout(() => { if (Math.abs(audio.currentTime - ini) > 0.05) audio.currentTime = ini; audio.play().then(() => { tocando = true; }).catch(() => aviso('O navegador bloqueou o áudio. Toque em Repetir.', 'erro')); }, Math.max(0, (t0 - M.agora()) * 1000));
      },
      aoLimpar: () => { clearTimeout(timer); audio.pause(); URL.revokeObjectURL(url); }
    });
    M.desligarMicrofone();
    if (!r) { paginaMusica(palco, m); return; }
    const ganho = E.registrarMusica(m.id, trecho ? 'grav-' + trecho.nome : null, r.estrelas, r.pct, 'facil', taxa);
    const linhas = [['Acordes certos', r.okBlocos + ' de ' + r.nBlocos]];
    if (r.avaliouRitmo) linhas.push(['Trocas no tempo', (r.perf + r.bom) + ' de ' + r.nBatidas]);
    linhas.push(['Velocidade', Math.round(taxa * 100) + '%'], ['Nota', Math.round(r.pct * 100) + '%']);
    const dicas = window.Pista.dicasDoResultado(r);
    if (!fone) dicas.push('Sem fone, a gravação entra no microfone e a nota fica pouco confiável. Marque "Estou de fone de ouvido" quando estiver com ele.');
    dicas.push('Se os acordes na tela parecem trocar antes ou depois da música, use o "Ajuste fino da sincronia" na página da música.');
    telaResultado(palco, {
      estrelas: r.estrelas, ganho, linhas, dicas,
      titulo: !trecho && r.estrelas > 0 ? 'Você tocou ' + m.titulo + ' com a gravação!' : null,
      botoes: [{ texto: 'Repetir', primario: true, acao: () => tocarGravacao(palco, m, blob, trecho, pref) }, { texto: 'Voltar para a música', acao: () => paginaMusica(palco, m) }]
    });
    if (window.App) window.App.atualizar();
  }

  // ---------- A música como uma escada de 4 etapas, tocada com a gravação ----------
  const ETAPAS = [
    { id: 'e1', nome: 'Uma batida por acorde', padrao: 'livre', nivel: 'facil', desc: 'Só a troca: uma batida para baixo cada vez que o acorde muda. O resto do tempo você escuta a música.' },
    { id: 'e2', nome: 'Para baixo em cada tempo', padrao: 'q4', nivel: 'medio', desc: 'A mão desce junto com o pulso da música: 1, 2, 3, 4.' },
    { id: 'e3', nome: 'Entra a batida para cima', padrao: 'ddu', nivel: 'medio', desc: 'A mão agora sobe tocando depois dos tempos 2 e 4.' },
    { id: 'e4', nome: 'O ritmo da música', padrao: 'pop', nivel: 'original', desc: 'Baixo, baixo-cima, cima-baixo-cima. No tempo 3 a mão desce sem encostar nas cordas. É assim que se toca a música.' }
  ];

  // pulso real da gravação: divide cada acorde em 2, 4 ou 8 tempos
  function gradeDaGravacao(g, aj) {
    const segs = [], tempos = [];
    let cont = 0;
    g.acordes.forEach(([t, id], i) => {
      if (!id) return;
      const a = t + aj, b = (i + 1 < g.acordes.length ? g.acordes[i + 1][0] : g.duracao) + aj;
      if (g.marcas.some((mk) => Math.abs(mk.ini - t) < 0.05)) cont = 0;
      const bruto = (b - a) / g.batida;
      const nb = bruto < 3 ? 2 : bruto < 6 ? 4 : 8;
      segs.push({ id, a, b });
      for (let k = 0; k < nb; k++) { tempos.push({ t: a + k * (b - a) / nb, dt: (b - a) / nb, n: cont % 4 + 1, k }); cont++; }
    });
    return { segs, tempos };
  }

  function etapaLiberada(m, i) {
    if (i === 0) return true;
    const partes = (E.dados.musicas[m.id] || {}).partes || {};
    return Object.keys(partes).some((k) => k.startsWith(ETAPAS[i - 1].id + '-') && partes[k] > 0);
  }
  function estrelasDaEtapa(m, et) {
    const partes = (E.dados.musicas[m.id] || {}).partes || {};
    return Math.max(0, ...Object.keys(partes).filter((k) => k.startsWith(et.id + '-')).map((k) => partes[k]));
  }

  function paginaGravacao(palco, m) {
    const g = m.gravacao, fmt = window.UI.formatarTempo;
    const pref = Object.assign({ velGrav: 1, ajuste: 0 }, E.dados.config['musica-' + m.id] || {});
    const guardar = () => { E.dados.config['musica-' + m.id] = pref; E.salvar(); };
    const partes = (E.dados.musicas[m.id] || {}).partes || {};
    const faltando = E.acordesFaltando(m);
    const status = el('p', { class: 'nota' }, 'Procurando a gravação neste aparelho...');
    const escada = el('ol', { class: 'etapas' });
    const arq = el('input', { type: 'file', accept: 'audio/*', id: 'grav-arq-' + m.id, hidden: true });
    const btArq = el('button', { class: 'bt bt-secundario bt-pequeno', onclick: () => arq.click() }, 'Escolher o arquivo de áudio');
    const vel = el('select', { id: 'grav-vel-' + m.id }, ...[[1, 'Velocidade normal'], [0.85, '85% (mais devagar)'], [0.75, '75% (bem devagar)']].map(([v, t]) => el('option', { value: String(v), selected: pref.velGrav === v }, t)));
    vel.addEventListener('change', () => { pref.velGrav = Number(vel.value); guardar(); });
    const aj = el('input', { type: 'range', id: 'grav-aj-' + m.id, min: '-1', max: '1', step: '0.1', value: String(pref.ajuste) });
    const ajTxt = el('output', { for: aj.id });
    const mostrarAj = () => { const v = Number(aj.value); ajTxt.textContent = v === 0 ? 'no ponto' : (v < 0 ? (-v).toFixed(1) + ' s antes' : v.toFixed(1) + ' s depois'); };
    mostrarAj();
    aj.addEventListener('input', () => { pref.ajuste = Number(aj.value); mostrarAj(); guardar(); });

    function montar(blob) {
      status.textContent = 'Você toca junto com a gravação original. Use fone de ouvido para o app ouvir só o seu violão.';
      btArq.textContent = 'Trocar o arquivo';
      escada.innerHTML = '';
      const atual = ETAPAS.findIndex((et, i) => etapaLiberada(m, i) && !estrelasDaEtapa(m, et));
      ETAPAS.forEach((et, i) => {
        const livre = etapaLiberada(m, i), est = estrelasDaEtapa(m, et);
        const trechos = g.marcas.concat([{ nome: 'Música inteira', ini: 0, fim: g.duracao, inteira: true }]);
        escada.append(el('li', { class: 'etapa' + (livre ? '' : ' bloqueada') + (i === atual ? ' atual' : '') + (est ? ' feita' : '') },
          el('div', { class: 'etapa-topo' },
            el('span', { class: 'tp-num' }, livre ? String(i + 1) : icone('cadeado')),
            el('div', null, el('b', null, et.nome), el('span', null, et.desc)),
            est ? estrelas(est) : null),
          et.padrao !== 'livre' ? setasPadrao(et.padrao) : null,
          livre ? el('div', { class: 'etapa-trechos' },
            ...trechos.map((tr) => el('button', { class: 'trecho' + (tr.inteira ? ' inteira' : ''), onclick: () => tocarEtapa(palco, m, blob, et, tr.inteira ? null : tr, pref) },
              el('b', null, tr.nome), el('span', null, tr.inteira ? fmt(g.duracao) : fmt(tr.ini)), estrelas(partes[et.id + '-' + (tr.inteira ? 'inteira' : tr.nome)] || 0))),
            et.padrao !== 'livre' ? botaoOuvir(() => ({ padrao: et.padrao, bpm: Math.round(60 / g.batida * pref.velGrav), ids: [m.acordes[0]], capo: g.capo || 0 })) : null)
            : el('p', { class: 'nota' }, 'Libera quando você passar em algum trecho da etapa ' + i + '.')));
      });
    }
    arq.addEventListener('change', async () => { const fl = arq.files[0]; if (!fl) return; try { await Gravacoes.gravar(m.id, fl); } catch (e) { aviso('Não consegui guardar o arquivo; ele vale só para agora.'); } montar(fl); });
    Gravacoes.obter(m.id).then((b) => { if (b) montar(b); else status.textContent = 'Escolha o arquivo de áudio desta música no seu aparelho. Ele fica guardado só aqui e não é enviado para a internet.'; });
    palco.aoFechar(() => M.pararExemplo());

    palco.corpo.append(el('div', { class: 'musica-pagina' },
      el('div', { class: 'musica-cabeca' }, el('div', null, el('h2', null, m.titulo), el('div', { class: 'musica-artista' }, m.artista))),
      faltando.length ? el('div', { class: 'falta-acordes' },
        el('b', null, faltando.length === 1 ? 'Falta 1 acorde para esta música' : 'Faltam ' + faltando.length + ' acordes para esta música'),
        el('div', { class: 'linha-botoes' }, ...faltando.map((id) => el('button', { class: 'bt bt-pequeno', onclick: () => rodarLicao(C.LICOES.find((l) => l.tipo === 'acorde' && l.acorde === id)) }, 'Aprender ' + T.ACORDES[id].nome)))) : null,
      chipsAcordes(m.acordes, g.capo || 0),
      el('div', { class: 'rotulo' }, 'O caminho até tocar a música'),
      status, escada,
      el('div', { class: 'config' },
        el('div', { class: 'campo' }, el('label', { for: vel.id }, 'Velocidade da gravação'), vel),
        el('div', { class: 'campo' }, el('label', { for: aj.id }, 'Os acordes na tela chegam'), el('div', { class: 'linha-range' }, aj, ajTxt)),
        el('div', { class: 'opcoes' }, opcaoConfig('fone', 'Estou de fone de ouvido')),
        btArq, arq)));
  }

  async function tocarEtapa(palco, m, blob, et, trecho, pref) {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    audio.src = url; audio.preload = 'auto'; audio.muted = true;
    const destravar = audio.play().then(() => { audio.pause(); }).catch(() => {});
    M.pararBanda(); M.pararExemplo();
    palco.limpar();
    const ok = await ligarMic(palco, () => paginaMusica(palco, m));
    if (!ok) { URL.revokeObjectURL(url); return; }
    await destravar;
    const g = m.gravacao, taxa = pref.velGrav || 1;
    const ini = trecho ? trecho.ini : 0, fim = trecho ? trecho.fim : g.duracao;
    const { segs, tempos } = gradeDaGravacao(g, pref.ajuste || 0);
    const blocos = [];
    segs.forEach((sg) => { const a = Math.max(sg.a, ini), b = Math.min(sg.b, fim); if (b - a > 0.3) blocos.push({ id: sg.id, inicio: a - ini, dur: b - a }); });
    const dentro = tempos.filter((tp) => tp.t >= ini - 0.01 && tp.t < fim - 0.05);
    const slots = C.PADROES[et.padrao].slots;
    const batidas = [], fantasmas = [];
    dentro.forEach((tp) => {
      const si = (tp.k % 4) * 2;
      if (et.padrao === 'livre') { if (tp.k === 0) batidas.push({ tempo: tp.t - ini, dir: 'baixo', slot: 0 }); return; }
      [0, 1].forEach((meio) => {
        const sl = slots[si + meio], t = tp.t - ini + meio * tp.dt / 2;
        if (sl === '-') fantasmas.push({ tempo: t, dir: meio ? 'cima' : 'baixo' });
        else batidas.push({ tempo: t, dir: sl === 'B' ? 'baixo' : 'cima', slot: si + meio });
      });
    });
    audio.muted = false; audio.playbackRate = taxa;
    try { audio.currentTime = ini; } catch (e) { /* ajusta ao tocar */ }
    let tPlay = 0, tocando = false, timer = 0;
    const relogio = () => (tocando ? audio.currentTime - ini : (M.agora() - tPlay) * taxa);
    palco.tituloEl.textContent = 'Etapa ' + (ETAPAS.indexOf(et) + 1) + ' · ' + (trecho ? trecho.nome : 'música inteira');
    const ids = [...new Set(blocos.map((x) => x.id))];
    const fone = !!E.dados.config.fone;
    const r = await window.Pista.rodarPista(palco, {
      blocos, total: fim - ini, padrao: et.padrao, bpm: 60 * taxa, capo: g.capo || 0,
      batidas, fantasmas, grade: dentro.map((tp) => ({ t: tp.t - ini, n: tp.n })), zoom: 1.7,
      avaliarAcordes: true, avaliarRitmo: fone, metronomo: false, semGrade: true, relogio,
      marcas: trecho ? [] : g.marcas.map((mk) => ({ nome: mk.nome, inicio: mk.ini })),
      candidatos: ids.concat(candidatosPara(ids[0])).filter((v, i, arr) => arr.indexOf(v) === i),
      aoIniciar: (t0) => {
        tPlay = t0;
        timer = setTimeout(() => { if (Math.abs(audio.currentTime - ini) > 0.05) audio.currentTime = ini; audio.play().then(() => { tocando = true; }).catch(() => aviso('O navegador bloqueou o áudio. Toque em Repetir.', 'erro')); }, Math.max(0, (t0 - M.agora()) * 1000));
      },
      aoLimpar: () => { clearTimeout(timer); audio.pause(); URL.revokeObjectURL(url); }
    });
    M.desligarMicrofone();
    if (!r) { paginaMusica(palco, m); return; }
    const iEt = ETAPAS.indexOf(et);
    const liberouAntes = iEt + 1 < ETAPAS.length && etapaLiberada(m, iEt + 1);
    const ganho = E.registrarMusica(m.id, et.id + '-' + (trecho ? trecho.nome : 'inteira'), r.estrelas, r.pct, et.nivel, taxa);
    if (!trecho && r.estrelas > 0) { const g2 = E.registrarMusica(m.id, null, r.estrelas, r.pct, et.nivel, taxa); ganho.xp += g2.xp; ganho.novasConquistas = ganho.novasConquistas.concat(g2.novasConquistas); }
    const liberou = !liberouAntes && iEt + 1 < ETAPAS.length && etapaLiberada(m, iEt + 1);
    const linhas = [['Acordes certos', r.okBlocos + ' de ' + r.nBlocos]];
    if (r.avaliouRitmo) linhas.push(['Batidas no tempo', (r.perf + r.bom) + ' de ' + r.nBatidas]);
    linhas.push(['Nota', Math.round(r.pct * 100) + '%']);
    const dicas = window.Pista.dicasDoResultado(r);
    if (!fone) dicas.push('Sem fone, a gravação entra no microfone: o app conferiu só os acordes e a nota fica pouco confiável.');
    if (!r.estrelas) dicas.push('Tente a 85% ou 75% da velocidade, ou volte um trecho menor.');
    const botoes = [];
    if (r.estrelas > 0 && iEt + 1 < ETAPAS.length) botoes.push({ texto: 'Próxima etapa: ' + ETAPAS[iEt + 1].nome, primario: true, acao: () => tocarEtapa(palco, m, blob, ETAPAS[iEt + 1], trecho, pref) });
    botoes.push({ texto: 'Repetir', primario: !botoes.length, acao: () => tocarEtapa(palco, m, blob, et, trecho, pref) }, { texto: 'Voltar para a música', acao: () => paginaMusica(palco, m) });
    telaResultado(palco, {
      estrelas: r.estrelas, ganho, linhas, dicas,
      titulo: !trecho && r.estrelas > 0 && iEt === ETAPAS.length - 1 ? 'Você tocou ' + m.titulo + ' inteira, no ritmo da música!' : null,
      extra: liberou ? el('div', { class: 'resultado-liberou' }, icone('check'), el('div', null, el('b', null, 'Etapa ' + (iEt + 2) + ' liberada'), el('span', null, ETAPAS[iEt + 1].nome))) : null,
      botoes
    });
    if (window.App) window.App.atualizar();
  }

  // ---------- Teste de nivelamento ----------
  async function nivelamento() {
    const palco = abrirPalco('Teste de nivelamento', { aoFechar: () => window.App && window.App.atualizar() });
    const lista = C.LICOES.filter((l) => l.tipo === 'acorde' && !WW.includes(l.acorde));
    palco.corpo.append(el('div', { class: 'preparo' },
      el('p', { class: 'ac-dica' }, `Vamos ver quais acordes você já sabe. Para cada um dos ${lista.length} acordes, monte e toque. Se não souber, toque em "Não sei esse". Os acordes que você acertar contam como aprendidos na trilha.`),
      el('button', { class: 'bt', onclick: () => comecar() }, 'Começar')));
    async function comecar() {
      const ok = await ligarMic(palco, () => comecar());
      if (!ok) return;
      const certos = [];
      for (let i = 0; i < lista.length; i++) {
        if (!window.UI.palco) return;
        const r = await testarAcorde(lista[i], i, lista.length);
        if (r === 'sair') return;
        if (r === 'ok') certos.push(lista[i]);
      }
      M.desligarMicrofone();
      certos.forEach((l) => { if (!E.concluida(l.id)) E.registrarLicao(l.id, 2); });
      E.dados.nivelamento = true; E.salvar();
      telaResultado(palco, {
        estrelas: certos.length >= 8 ? 3 : certos.length >= 4 ? 2 : certos.length ? 1 : 0,
        titulo: certos.length ? `Você já sabe ${certos.length} acordes` : 'Vamos começar do começo',
        subtitulo: certos.length ? certos.map((l) => T.ACORDES[l.acorde].nome).join(', ') : 'A trilha ensina cada acorde passo a passo.',
        dicas: certos.length ? ['As lições desses acordes foram marcadas como feitas. Os exercícios de ritmo, troca e os desafios continuam esperando por você.', 'Para pular uma unidade inteira, use "Pular unidade" na trilha.'] : [],
        botoes: [{ texto: 'Ir para a trilha', primario: true, acao: () => palco.fechar() }]
      });
      if (window.App) window.App.atualizar();
    }
    function testarAcorde(licao, i, n) {
      return new Promise((resolver) => {
        const id = licao.acorde;
        palco.corpo.innerHTML = '';
        const status = el('div', { class: 'ac-status', 'aria-live': 'polite' }, 'Toque o acorde');
        const tempo = el('div', { class: 'nivel-tempo' }, el('div'));
        palco.corpo.append(el('div', { class: 'licao-acorde' },
          el('div', { class: 'rotulo' }, `Acorde ${i + 1} de ${n}`),
          el('div', { class: 'ac-cabeca' }, el('div', { class: 'ac-nome' }, T.ACORDES[id].nome), el('div', { class: 'ac-extenso' }, T.ACORDES[id].extenso)),
          el('div', { class: 'ac-diagrama' }, diagrama(id, { largura: 170 })),
          tempo, status,
          el('button', { class: 'bt bt-secundario', onclick: () => fim('nao') }, 'Não sei esse')));
        let okSeq = 0;
        const limite = 25, inicio = M.agora();
        let roboTimer = null;
        if (M.simulado && Math.random() < 0.7) roboTimer = setTimeout(() => M.roboBatida(id, 0, M.agora() + 0.35, 'baixo', 0.8), 900);
        const onQuadro = (r) => {
          const pass = (r.t - inicio) / limite;
          tempo.firstChild.style.width = Math.max(0, 100 - pass * 100).toFixed(1) + '%';
          if (pass >= 1) { fim('nao'); return; }
          if (!r.temSinal || r.silenciado) { okSeq = 0; return; }
          const av = DSP.avaliarAlvo(r.chroma, id, 0, BASICOS);
          if (av.ok) { if (++okSeq >= 4) { status.textContent = 'Certo!'; status.className = 'ac-status ok'; fim('ok'); } }
          else { okSeq = 0; status.textContent = av.melhor.id !== id ? 'Parece ' + av.melhor.nome : 'Quase...'; }
        };
        M.ouvQuadro.add(onQuadro);
        const sair = () => { M.ouvQuadro.delete(onQuadro); clearTimeout(roboTimer); resolver('sair'); };
        palco.aoFechar(sair);
        let feito = false;
        function fim(res) {
          if (feito) return; feito = true;
          M.ouvQuadro.delete(onQuadro); clearTimeout(roboTimer); M.pararRobo();
          const idx = palco._limpezas.indexOf(sair); if (idx >= 0) palco._limpezas.splice(idx, 1);
          setTimeout(() => resolver(res), res === 'ok' ? 600 : 50);
        }
      });
    }
  }

  // ---------- Ferramentas livres ----------
  async function detectorLivre() {
    const palco = abrirPalco('Detector de acordes');
    const nome = el('div', { class: 'det-nome' }, '–');
    const alt = el('div', { class: 'det-alt' }, 'Toque qualquer acorde');
    const barras = el('div', { class: 'det-chroma' }, ...T.NOMES_NOTAS.map((n) => el('div', { class: 'det-barra' }, el('div', { class: 'det-valor' }), el('span', null, n))));
    const medidor = el('div', { class: 'medidor' }, el('div'));
    palco.corpo.append(el('div', { class: 'detector' },
      el('p', { class: 'ac-dica' }, 'Mostra qual acorde o app está ouvindo e a força de cada nota. Útil para conferir se o microfone está pegando bem o seu violão.'),
      nome, alt, barras, el('div', { class: 'linha-medidor' }, icone('mic'), medidor)));
    const ok = await ligarMic(palco, () => { palco.fechar(); detectorLivre(); });
    if (!ok) return;
    let roboTimer = null;
    if (M.simulado) { const ac = ['G', 'C', 'D', 'Em', 'Am']; let k = 0; const t = () => { M.roboBatida(ac[k++ % ac.length], 0, M.agora() + 0.35, 'baixo', 0.8); roboTimer = setTimeout(t, 2200); }; t(); }
    const conhecidos = BASICOS;
    const onQuadro = (r) => {
      medidor.firstChild.style.width = (Math.max(0, Math.min(1, (r.db + 60) / 50)) * 100).toFixed(0) + '%';
      if (!r.temSinal) { alt.textContent = 'Toque qualquer acorde'; return; }
      const res = DSP.reconhecerLivre(r.chroma, conhecidos);
      const top = res[0];
      nome.textContent = top.nome;
      alt.textContent = 'também parece: ' + res.slice(1, 4).filter((x) => x.nome !== top.nome).map((x) => x.nome).join(', ') + ` · semelhança ${(top.s * 100).toFixed(0)}%`;
      const max = Math.max(...r.chroma);
      [...barras.children].forEach((b, i) => { b.firstChild.style.height = (max ? r.chroma[i] / max * 100 : 0).toFixed(0) + '%'; });
    };
    M.ouvQuadro.add(onQuadro);
    palco.aoFechar(() => { M.ouvQuadro.delete(onQuadro); clearTimeout(roboTimer); });
  }

  function metronomoLivre() {
    const palco = abrirPalco('Metrônomo');
    let bpm = E.dados.config.bpmMetronomo || 70, parar = null, raf = 0, inicio = 0;
    const visor = el('div', { class: 'metro-bpm' }, String(bpm));
    const luzes = el('div', { class: 'metro-luzes' }, el('span'), el('span'), el('span'), el('span'));
    const range = el('input', { type: 'range', id: 'metro-bpm', min: '40', max: '160', value: String(bpm), 'aria-label': 'Batidas por minuto' });
    const bt = el('button', { class: 'bt' }, icone('play'), ' Tocar');
    range.addEventListener('input', () => { bpm = Number(range.value); visor.textContent = String(bpm); E.dados.config.bpmMetronomo = bpm; E.salvar(); if (parar) { pararTudo(); comecar(); } });
    palco.corpo.append(el('div', { class: 'metronomo' }, visor, el('div', { class: 'rotulo' }, 'batidas por minuto'), luzes, range,
      el('div', { class: 'linha-botoes' }, el('button', { class: 'bt bt-secundario', onclick: () => { range.value = String(Math.max(40, bpm - 5)); range.dispatchEvent(new Event('input')); } }, '−5'), bt, el('button', { class: 'bt bt-secundario', onclick: () => { range.value = String(Math.min(160, bpm + 5)); range.dispatchEvent(new Event('input')); } }, '+5'))));
    async function comecar() {
      await M.garantirContexto();
      if (M.volumeClique <= 0) M.volumeClique = 0.5;
      inicio = M.agora() + 0.1;
      parar = M.metronomo(inicio, 60 / bpm, 100000, 4);
      bt.innerHTML = ''; bt.append(icone('fechar'), ' Parar');
      const tick = () => {
        const k = Math.floor((M.agora() - (M.ctx.outputLatency || 0) - inicio) / (60 / bpm));
        [...luzes.children].forEach((l, i) => l.classList.toggle('ativa', k >= 0 && k % 4 === i));
        raf = requestAnimationFrame(tick);
      };
      tick();
    }
    function pararTudo() { if (parar) parar(); parar = null; cancelAnimationFrame(raf); bt.innerHTML = ''; bt.append(icone('play'), ' Tocar'); [...luzes.children].forEach((l) => l.classList.remove('ativa')); }
    bt.addEventListener('click', () => (parar ? pararTudo() : comecar()));
    palco.aoFechar(pararTudo);
  }

  function trocaLivre() {
    const palco = abrirPalco('Troca de 1 minuto');
    const aprendidos = E.acordesAprendidos();
    const opcoes = (aprendidos.length >= 2 ? aprendidos : BASICOS);
    let a = opcoes[0], b = opcoes[1];
    const sel = (valor, aoMudar, rotulo) => {
      const s = el('select', { 'aria-label': rotulo }, ...opcoes.map((id) => el('option', { value: id, selected: id === valor }, T.ACORDES[id].nome)));
      s.addEventListener('change', () => aoMudar(s.value));
      return s;
    };
    palco.corpo.append(el('div', { class: 'preparo' },
      el('p', { class: 'ac-dica' }, 'Escolha dois acordes e conte quantas trocas limpas você faz em 1 minuto. Esse exercício é o jeito mais rápido de destravar a mão do braço.'),
      el('div', { class: 'linha-botoes' }, sel(a, (v) => { a = v; }, 'Primeiro acorde'), icone('troca'), sel(b, (v) => { b = v; }, 'Segundo acorde')),
      el('button', { class: 'bt', onclick: () => { if (a === b) { aviso('Escolha dois acordes diferentes.'); return; } palco.limpar(); licaoTroca(palco, { id: 'livre', a, b, capo: WW.includes(a) ? 2 : 0, metas: [10, 20, 30] }); } }, 'Continuar')));
  }

  // ---------- Exercício de pista genérico (preparo + execução) ----------
  function linhasDaPista(r) {
    const linhas = [];
    if (r.avaliouAcordes) linhas.push(['Acordes certos', r.okBlocos + ' de ' + r.nBlocos]);
    if (r.avaliouRitmo) linhas.push(['Batidas no tempo', (r.perf + r.bom) + ' de ' + r.nBatidas], ['Perfeitas', String(r.perf)]);
    linhas.push(['Nota', Math.round(r.pct * 100) + '%']);
    return linhas;
  }
  function blocosAlternados(a, b, compassos) {
    const blocos = [];
    if (a) for (let c = 0; c < compassos; c++) blocos.push({ id: b && c % 2 ? b : a, inicio: c * 4, dur: 4 });
    return blocos;
  }
  async function executarPista(palco, o) {
    const ids = [...new Set(o.blocos.map((x) => x.id))];
    const r = await window.Pista.rodarPista(palco, {
      blocos: o.blocos, total: o.total, padrao: o.padrao, bpm: o.bpm, capo: o.capo || 0,
      avaliarAcordes: o.blocos.length > 0, avaliarRitmo: true, abafado: !o.blocos.length,
      metronomo: E.dados.config.volumeClique > 0, acordeRobo: 'Em',
      candidatos: ids.concat(candidatosPara(ids[0] || 'Em')).filter((v, i, arr) => arr.indexOf(v) === i)
    });
    M.desligarMicrofone();
    return r;
  }
  function exercicioPista(palco, o) {
    return new Promise((resolver) => {
      palco.limpar();
      palco.tituloEl.textContent = o.titulo;
      const ids = [...new Set(o.blocos.map((x) => x.id))];
      const bt = el('button', { class: 'bt' }, icone('play'), ' Começar');
      palco.corpo.append(el('div', { class: 'preparo' },
        el('p', { class: 'ac-dica' }, o.texto),
        ids.length ? chipsAcordes(ids, o.capo || 0) : null,
        ids.length === 2 ? caixaDica(C.dicaTroca(ids[0], ids[1])) : null,
        el('div', { class: 'rotulo' }, 'Ritmo: ' + C.PADROES[o.padrao].nome),
        setasPadrao(o.padrao),
        el('div', { class: 'preparo-info' }, el('span', null, o.bpm + ' batidas por minuto'), el('span', null, (o.total / 4) + ' compassos')),
        el('div', { class: 'linha-botoes' }, botaoOuvir(() => ({ padrao: o.padrao, bpm: o.bpm, ids, capo: o.capo }))),
        el('div', { class: 'opcoes' }, opcaoMetronomo()),
        bt));
      palco.aoFechar(() => M.pararExemplo());
      bt.addEventListener('click', async () => {
        M.pararExemplo();
        const ok = await ligarMic(palco, () => resolver(exercicioPista(palco, o)));
        if (!ok) return;
        resolver(await executarPista(palco, o));
      });
    });
  }

  // ---------- Treino do dia ----------
  function treinoDoDia() {
    const palco = abrirPalco('Treino do dia', { aoFechar: () => window.App && window.App.atualizar() });
    menuTreino(palco);
  }
  function planoTreino() {
    const [a, b] = E.parFraco();
    const r = E.ritmoAtual();
    const padraoTroca = r.degrau > 0 ? C.ESCADA_RITMO[r.degrau - 1].padrao : 'q2';
    return { a, b, r, padraoTroca };
  }
  function menuTreino(palco) {
    palco.limpar();
    palco.tituloEl.textContent = 'Treino do dia';
    const t = E.treinoDia();
    const p = planoTreino();
    const na = T.ACORDES[p.a].nome, nb = T.ACORDES[p.b].nome;
    const passos = [
      { nome: 'Troca de 1 minuto: ' + na + ' ↔ ' + nb, desc: 'Seu par mais lento. Recorde atual: ' + E.recordeTroca(p.a, p.b) + ' trocas.', f: () => passoTroca(palco, p) },
      { nome: 'Mão do ritmo: ' + C.PADROES[p.r.padrao].curto, desc: 'Cordas abafadas, a ' + p.r.bpm + ' bpm. Passando de 85%, a velocidade sobe sozinha.', f: () => passoRitmo(palco, p) },
      { nome: 'Troca no ritmo: ' + na + ' e ' + nb, desc: 'Ritmo ' + C.PADROES[p.padraoTroca].curto + ' a 60 bpm, trocando a cada compasso.', f: () => passoTrocaRitmo(palco, p) }
    ];
    const proximo = t.feitos.findIndex((x) => !x);
    palco.corpo.append(el('div', { class: 'preparo' },
      el('p', { class: 'ac-dica' }, 'Três exercícios curtos, escolhidos pelo que você mais precisa: a troca mais lenta e o seu degrau na escada do ritmo. Leva uns 5 minutos.'),
      el('ol', { class: 'treino-passos' }, ...passos.map((ps, i) => el('li', { class: t.feitos[i] ? 'feito' : i === proximo ? 'atual' : '' },
        el('button', { onclick: ps.f }, el('span', { class: 'tp-num' }, t.feitos[i] ? icone('check') : String(i + 1)), el('div', null, el('b', null, ps.nome), el('span', null, ps.desc)))))),
      escadaVisual(p.r),
      proximo >= 0 ? el('button', { class: 'bt', onclick: passos[proximo].f }, icone('play'), ' ' + (proximo === 0 ? 'Começar' : 'Continuar: passo ' + (proximo + 1))) : el('p', { class: 'ac-status ok' }, 'Treino de hoje completo. Volte amanhã!')));
  }
  function escadaVisual(r) {
    return el('div', { class: 'escada' }, el('div', { class: 'rotulo' }, 'Escada do ritmo'),
      el('div', { class: 'escada-degraus' }, ...C.ESCADA_RITMO.map((d, i) => el('div', { class: i < r.degrau ? 'feito' : i === r.degrau ? 'atual' : '' },
        el('b', null, C.PADROES[d.padrao].curto), el('span', null, i < r.degrau ? 'dominado' : i === r.degrau ? r.bpm + ' de ' + d.ate + ' bpm' : 'bloqueado')))));
  }
  function fimPasso(palco, i, res, repetir) {
    const g = E.marcarTreino(i);
    const falta = E.treinoDia().feitos.some((x) => !x);
    telaResultado(palco, {
      estrelas: res.estrelas, titulo: res.titulo, linhas: res.linhas, dicas: res.dicas,
      ganho: { xp: g.xp, novasConquistas: g.novasConquistas },
      extra: g.bonus ? el('div', { class: 'resultado-liberou' }, icone('check'), el('div', null, el('b', null, 'Treino do dia completo'), el('span', null, 'Bônus de 30 XP. Constância vale mais que horas seguidas.'))) : null,
      botoes: [{ texto: falta ? 'Próximo passo' : 'Concluir', primario: true, acao: () => menuTreino(palco) }, { texto: 'Repetir este passo', acao: repetir }]
    });
    if (window.App) window.App.atualizar();
  }
  function passoTroca(palco, p) {
    palco.limpar();
    palco.tituloEl.textContent = 'Passo 1: troca de 1 minuto';
    licaoTroca(palco, { id: 'livre-dia', a: p.a, b: p.b, capo: 0, metas: [10, 20, 30] }, { aoFim: (res) => fimPasso(palco, 0, res, () => passoTroca(palco, p)) });
  }
  async function passoRitmo(palco, p) {
    const r = await exercicioPista(palco, {
      titulo: 'Passo 2: mão do ritmo', padrao: p.r.padrao, bpm: p.r.bpm, blocos: [], total: 16,
      texto: 'Abafe as cordas com a mão do braço e siga as setas. A mão sobe e desce sem parar, como um pêndulo; nos espaços (·) ela passa sem encostar. Ouça o exemplo antes.'
    });
    if (!r) { menuTreino(palco); return; }
    const msg = E.avancarRitmo(r.pctRitmo);
    fimPasso(palco, 1, { estrelas: r.estrelas, linhas: linhasDaPista(r), dicas: [msg].concat(window.Pista.dicasDoResultado(r)) }, () => passoRitmo(palco, planoTreino()));
  }
  async function passoTrocaRitmo(palco, p) {
    const r = await exercicioPista(palco, {
      titulo: 'Passo 3: troca no ritmo', padrao: p.padraoTroca, bpm: 60, blocos: blocosAlternados(p.a, p.b, 8), total: 32,
      texto: 'Agora as duas mãos juntas. A mão do ritmo não espera: comece a soltar o acorde na última batida do compasso para chegar no próximo a tempo.'
    });
    if (!r) { menuTreino(palco); return; }
    fimPasso(palco, 2, { estrelas: r.estrelas, linhas: linhasDaPista(r), dicas: window.Pista.dicasDoResultado(r) }, () => passoTrocaRitmo(palco, p));
  }

  // ---------- Treino de ritmo livre ----------
  function ritmoLivre() {
    const palco = abrirPalco('Treino de ritmo', { aoFechar: () => window.App && window.App.atualizar() });
    const pref = Object.assign({ padrao: 'pop', bpm: 60, a: '', b: '' }, E.dados.config.ritmoLivre || {});
    const guardar = () => { E.dados.config.ritmoLivre = pref; E.salvar(); };
    function tela() {
      palco.limpar();
      palco.tituloEl.textContent = 'Treino de ritmo';
      const aprendidos = E.acordesAprendidos().filter((id) => !WW.includes(id));
      const acordes = aprendidos.length ? aprendidos : ['Em', 'Am', 'E', 'A', 'D', 'G', 'C'];
      if (pref.a && !acordes.includes(pref.a)) pref.a = '';
      if (pref.b && !acordes.includes(pref.b)) pref.b = '';
      const caixaSetas = el('div', null, setasPadrao(pref.padrao));
      const selPadrao = el('select', { id: 'rl-padrao' }, ...Object.entries(C.PADROES).filter(([k]) => k !== 'q1' && k !== 'q2' && k !== 'livre').map(([k, v]) => el('option', { value: k, selected: k === pref.padrao }, v.curto + '  ' + v.nome)));
      selPadrao.addEventListener('change', () => { pref.padrao = selPadrao.value; guardar(); M.pararExemplo(); caixaSetas.innerHTML = ''; caixaSetas.append(setasPadrao(pref.padrao)); });
      const bpm = el('input', { type: 'range', id: 'rl-bpm', min: '40', max: '120', step: '5', value: String(pref.bpm) });
      const bpmTxt = el('output', { for: 'rl-bpm' }, pref.bpm + ' bpm');
      bpm.addEventListener('input', () => { pref.bpm = Number(bpm.value); bpmTxt.textContent = pref.bpm + ' bpm'; guardar(); M.pararExemplo(); });
      const selA = el('select', { id: 'rl-a' }, el('option', { value: '' }, 'Cordas abafadas'), ...acordes.map((id) => el('option', { value: id, selected: id === pref.a }, T.ACORDES[id].nome)));
      const selB = el('select', { id: 'rl-b' }, el('option', { value: '' }, 'Sem troca'), ...acordes.map((id) => el('option', { value: id, selected: id === pref.b }, T.ACORDES[id].nome)));
      selA.addEventListener('change', () => { pref.a = selA.value; guardar(); M.pararExemplo(); });
      selB.addEventListener('change', () => { pref.b = selB.value; guardar(); M.pararExemplo(); });
      const idsAtuais = () => (pref.a ? (pref.b && pref.b !== pref.a ? [pref.a, pref.b] : [pref.a]) : []);
      palco.corpo.append(el('div', { class: 'preparo' },
        el('p', { class: 'ac-dica' }, 'Monte o seu treino: escolha o ritmo, comece devagar e só suba a velocidade quando sair limpo. Primeiro abafado, depois com um acorde, depois trocando.'),
        el('div', { class: 'campo' }, el('label', { for: 'rl-padrao' }, 'Ritmo'), selPadrao), caixaSetas,
        el('div', { class: 'campo' }, el('label', { for: 'rl-bpm' }, 'Velocidade'), el('div', { class: 'linha-range' }, bpm, bpmTxt)),
        el('div', { class: 'campo' }, el('label', { for: 'rl-a' }, 'Acorde'), selA),
        el('div', { class: 'campo' }, el('label', { for: 'rl-b' }, 'Trocar com (a cada compasso)'), selB),
        el('div', { class: 'linha-botoes' }, botaoOuvir(() => ({ padrao: pref.padrao, bpm: pref.bpm, ids: idsAtuais(), capo: 0 }))),
        el('div', { class: 'opcoes' }, opcaoMetronomo()),
        el('button', { class: 'bt', onclick: tocar }, icone('play'), ' Começar')));
      palco.aoFechar(() => M.pararExemplo());
    }
    async function tocar() {
      M.pararExemplo();
      const ids = pref.a ? (pref.b && pref.b !== pref.a ? [pref.a, pref.b] : [pref.a]) : [];
      const compassos = ids.length === 2 ? 8 : 4;
      palco.limpar();
      const ok = await ligarMic(palco, tela);
      if (!ok) return;
      const r = await executarPista(palco, { padrao: pref.padrao, bpm: pref.bpm, blocos: blocosAlternados(ids[0], ids[1], compassos), total: compassos * 4 });
      if (!r) { tela(); return; }
      const botoes = [{ texto: 'Repetir', primario: r.estrelas < 2, acao: tocar }];
      if (r.estrelas >= 2 && pref.bpm < 120) botoes.unshift({ texto: 'Mais rápido: ' + (pref.bpm + 5) + ' bpm', primario: true, acao: () => { pref.bpm += 5; guardar(); tocar(); } });
      if (r.estrelas === 0 && pref.bpm > 40) botoes.unshift({ texto: 'Mais devagar: ' + (pref.bpm - 5) + ' bpm', primario: true, acao: () => { pref.bpm -= 5; guardar(); tocar(); } });
      botoes.push({ texto: 'Mudar o treino', acao: tela });
      E.ganharXP(r.estrelas > 0 ? 3 : 0); E.salvar();
      telaResultado(palco, { estrelas: r.estrelas, linhas: linhasDaPista(r).concat([['Velocidade', pref.bpm + ' bpm']]), dicas: window.Pista.dicasDoResultado(r), botoes });
    }
    tela();
  }

  function afinadorLivre() { const p = abrirPalco('Afinador'); licaoAfinar(p, null); }
  function calibrarLivre() { const p = abrirPalco('Sincronizar'); licaoCalibrar(p, null); }

  window.Licoes = { treinoDoDia, ritmoLivre, rodarLicao, abrirMusica, nivelamento, detectorLivre, metronomoLivre, trocaLivre, afinadorLivre, calibrarLivre, BASICOS, WW };
})();
