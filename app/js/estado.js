/* Progresso do aluno: estrelas, XP, sequência de dias, meta diária,
 * conquistas e configurações. Fica salvo no navegador (localStorage).
 */
(function () {
  'use strict';
  const C = window.Conteudo;
  const CHAVE = 'violao-progresso-v1';

  const padrao = () => ({
    versao: 1,
    licoes: {},          // id -> {estrelas, melhor, vezes, data}
    musicas: {},         // id -> {estrelas, melhorPct, nivel, velocidade, partes: {secao: estrelas}}
    trocas: {},          // "Em-Am" -> recorde
    xp: 0,
    dias: [],            // datas (AAAA-MM-DD) com prática
    tempoHoje: { data: '', segundos: 0 },
    metaMinutos: 10,
    metaBatidaEm: '',
    conquistas: {},      // id -> data
    config: { latencia: null, volumeClique: 0.5, sensibilidade: 1, temCapo: true, demo: false },
    ritmo: { degrau: 0, bpm: 50 },
    treinoDia: { data: '', feitos: [false, false, false], bonus: false },
    boasVindas: false,
    nivelamento: false
  });

  let dados = padrao();
  const ouvintes = new Set();

  function carregar() {
    try {
      const txt = localStorage.getItem(CHAVE);
      if (txt) {
        const lido = JSON.parse(txt);
        const base = padrao();
        dados = Object.assign(base, lido);
        dados.config = Object.assign(padrao().config, lido.config || {});
      }
    } catch (e) { /* sem armazenamento: segue em memória */ }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch (e) { /* ignora */ }
    ouvintes.forEach((f) => f());
  }

  const hoje = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const diaAnterior = (s) => {
    const [a, m, d] = s.split('-').map(Number);
    const dt = new Date(a, m - 1, d - 1);
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  };

  function marcarDia() {
    const h = hoje();
    if (!dados.dias.includes(h)) { dados.dias.push(h); if (dados.dias.length > 400) dados.dias = dados.dias.slice(-400); }
  }

  function sequencia() {
    const set = new Set(dados.dias);
    let d = hoje();
    if (!set.has(d)) d = diaAnterior(d);
    let n = 0;
    while (set.has(d)) { n++; d = diaAnterior(d); }
    return n;
  }

  function nivelAtual() {
    let i = 0;
    while (i + 1 < C.NIVEIS.length && dados.xp >= C.NIVEIS[i + 1].xp) i++;
    const atual = C.NIVEIS[i], prox = C.NIVEIS[i + 1];
    return {
      numero: i + 1, nome: atual.nome, xp: dados.xp,
      base: atual.xp, proximo: prox ? prox.xp : null,
      fracao: prox ? (dados.xp - atual.xp) / (prox.xp - atual.xp) : 1
    };
  }

  function ganharXP(qtd) { dados.xp += Math.max(0, Math.round(qtd)); }

  // ---------- Tempo de prática ----------
  function somarTempo(segundos) {
    const h = hoje();
    if (dados.tempoHoje.data !== h) dados.tempoHoje = { data: h, segundos: 0 };
    dados.tempoHoje.segundos += segundos;
    let ganhouMeta = false;
    if (dados.tempoHoje.segundos >= dados.metaMinutos * 60 && dados.metaBatidaEm !== h) {
      dados.metaBatidaEm = h;
      ganharXP(20);
      marcarDia();
      ganhouMeta = true;
    }
    salvarAtrasado();
    return ganhouMeta;
  }
  let timerSalvar = null;
  function salvarAtrasado() { clearTimeout(timerSalvar); timerSalvar = setTimeout(salvar, 2000); }
  function tempoHoje() { return dados.tempoHoje.data === hoje() ? dados.tempoHoje.segundos : 0; }

  // ---------- Lições ----------
  function licao(id) { return dados.licoes[id] || null; }
  function concluida(id) { const l = dados.licoes[id]; return !!(l && l.estrelas > 0); }

  function registrarLicao(id, estrelas, extra) {
    const ant = dados.licoes[id] || { estrelas: 0, vezes: 0 };
    const novo = Object.assign({}, ant, extra || {});
    novo.vezes = (ant.vezes || 0) + 1;
    novo.data = hoje();
    const ganho = { xp: 0, novasConquistas: [], primeira: !(ant.estrelas > 0), estrelasAntes: ant.estrelas || 0 };
    if (estrelas > (ant.estrelas || 0)) {
      ganho.xp += (ant.estrelas > 0 ? 0 : 20) + 10 * (estrelas - (ant.estrelas || 0));
      novo.estrelas = estrelas;
    } else if (estrelas > 0) {
      ganho.xp += 3; // praticar de novo também conta
      novo.estrelas = ant.estrelas;
    }
    dados.licoes[id] = novo;
    if (estrelas > 0) marcarDia();
    ganharXP(ganho.xp);
    ganho.novasConquistas = verificarConquistas();
    salvar();
    return ganho;
  }

  function registrarMusica(id, secao, estrelas, pct, nivel, velocidade) {
    const ant = dados.musicas[id] || { estrelas: 0, melhorPct: 0, partes: {} };
    const m = Object.assign({ partes: {} }, ant);
    const ganho = { xp: 0, novasConquistas: [], primeira: false };
    if (secao) {
      const antes = m.partes[secao] || 0;
      if (estrelas > antes) { ganho.xp += (antes ? 0 : 10) + 5 * (estrelas - antes); m.partes[secao] = estrelas; }
    } else {
      if (estrelas > (m.estrelas || 0)) {
        ganho.primeira = !(m.estrelas > 0);
        ganho.xp += (m.estrelas > 0 ? 0 : 50) + 20 * (estrelas - (m.estrelas || 0));
        m.estrelas = estrelas;
      }
      if (pct > (m.melhorPct || 0)) m.melhorPct = pct;
      if (estrelas > 0) {
        const ordem = { facil: 0, medio: 1, original: 2 };
        if (!m.nivel || ordem[nivel] > ordem[m.nivel]) m.nivel = nivel;
        if (!m.velocidade || velocidade > m.velocidade) m.velocidade = velocidade;
      }
    }
    if (estrelas > 0) marcarDia();
    dados.musicas[id] = m;
    ganharXP(ganho.xp || (estrelas > 0 ? 3 : 0));
    ganho.novasConquistas = verificarConquistas();
    salvar();
    return ganho;
  }

  function registrarTroca(a, b, n) {
    const chave = [a, b].sort().join('-');
    const ant = dados.trocas[chave] || 0;
    if (n > ant) dados.trocas[chave] = n;
    salvar();
    return { recorde: n > ant, anterior: ant };
  }
  function recordeTroca(a, b) { return dados.trocas[[a, b].sort().join('-')] || 0; }

  // ---------- Desbloqueio ----------
  function licaoDesbloqueada(id) {
    const i = C.LICOES.findIndex((l) => l.id === id);
    if (i <= 0) return true;
    if (concluida(id)) return true;
    return concluida(C.LICOES[i - 1].id);
  }
  function unidadeConcluida(uid) {
    const u = C.UNIDADES.find((x) => x.id === uid);
    return u.licoes.every((l) => concluida(l.id));
  }
  function musicaDesbloqueada(m) { return m.requer.every(concluida); }

  // "Pular unidade": completar o desafio libera tudo antes dele
  function pularAte(licaoId) {
    const i = C.LICOES.findIndex((l) => l.id === licaoId);
    for (let k = 0; k < i; k++) {
      const l = C.LICOES[k];
      if (!concluida(l.id)) dados.licoes[l.id] = { estrelas: 1, vezes: 0, data: hoje(), pulada: true };
    }
    salvar();
  }

  function acordesAprendidos() {
    return C.LICOES.filter((l) => l.tipo === 'acorde' && concluida(l.id)).map((l) => l.acorde);
  }

  // ---------- Treino do dia ----------
  function ritmoAtual() {
    const e = C.ESCADA_RITMO;
    const d = Math.max(0, Math.min(dados.ritmo.degrau, e.length - 1));
    return { degrau: d, padrao: e[d].padrao, bpm: dados.ritmo.bpm, ate: e[d].ate };
  }
  function avancarRitmo(pct) {
    const e = C.ESCADA_RITMO, r = dados.ritmo;
    r.degrau = Math.max(0, Math.min(r.degrau, e.length - 1));
    let msg;
    if (pct >= 0.85) {
      if (r.bpm + 5 > e[r.degrau].ate) {
        if (r.degrau < e.length - 1) { r.degrau++; r.bpm = e[r.degrau].de; msg = 'Ritmo dominado! O próximo treino traz um ritmo novo: ' + C.PADROES[e[r.degrau].padrao].curto; }
        else msg = 'Você toca o ritmo universal em velocidade de música. Agora é com as músicas!';
      } else { r.bpm += 5; msg = 'Subiu de velocidade! Próximo treino: ' + r.bpm + ' bpm.'; }
    } else if (pct < 0.5 && r.bpm > 40) { r.bpm -= 5; msg = 'Vamos mais devagar: próximo treino em ' + r.bpm + ' bpm.'; }
    else msg = 'Continue em ' + r.bpm + ' bpm. Passando de 85%, a velocidade sobe.';
    salvar();
    return msg;
  }
  function treinoDia() {
    if (dados.treinoDia.data !== hoje()) dados.treinoDia = { data: hoje(), feitos: [false, false, false], bonus: false };
    return dados.treinoDia;
  }
  function marcarTreino(i) {
    const t = treinoDia();
    const jaFeito = t.feitos[i];
    t.feitos[i] = true;
    marcarDia();
    let xp = jaFeito ? 2 : 8, bonus = false;
    if (t.feitos.every(Boolean) && !t.bonus) { t.bonus = true; xp += 30; bonus = true; }
    ganharXP(xp);
    const novasConquistas = verificarConquistas();
    salvar();
    return { xp, bonus, novasConquistas };
  }
  function parFraco() {
    const ap = new Set(acordesAprendidos());
    const cands = C.PARES_TREINO.filter(([a, b]) => ap.has(a) && ap.has(b));
    const lista = cands.length ? cands : [['Em', 'Am']];
    return lista.slice().sort((p, q) => recordeTroca(p[0], p[1]) - recordeTroca(q[0], q[1]))[0];
  }

  // ---------- Conquistas ----------
  function dar(id, novas) { if (!dados.conquistas[id]) { dados.conquistas[id] = hoje(); novas.push(id); ganharXP(15); } }
  function verificarConquistas() {
    const novas = [];
    if (concluida('u1-afinar')) dar('afinado', novas);
    if (concluida('u1-calibrar')) dar('sincronizado', novas);
    const nAc = acordesAprendidos().length;
    if (nAc >= 1) dar('primeiro-acorde', novas);
    if (nAc >= 5) dar('cinco-acordes', novas);
    if (nAc >= 10) dar('dez-acordes', novas);
    if (nAc >= 17) dar('todos-acordes', novas);
    const ritmo3 = C.LICOES.some((l) => l.tipo === 'ritmo' && (dados.licoes[l.id] || {}).estrelas === 3);
    if (ritmo3) dar('ritmo-perfeito', novas);
    if (concluida('u6-pop')) dar('mao-pendulo', novas);
    if (Object.values(dados.trocas).some((n) => n >= 30)) dar('trocas-30', novas);
    const completas = Object.entries(dados.musicas).filter(([, m]) => m.estrelas > 0);
    if (completas.length >= 1) dar('primeira-musica', novas);
    if (completas.length >= 3) dar('tres-musicas', novas);
    const ids = completas.map(([id]) => id);
    if (ids.includes('tempoperdido') || ids.includes('paisefilhos')) dar('legiao', novas);
    if (ids.includes('hurt')) dar('hurt', novas);
    if (ids.includes('wonderwall')) dar('wonderwall', novas);
    if (completas.some(([, m]) => (m.velocidade || 0) >= 1)) dar('velocidade-original', novas);
    if (dados.treinoDia && dados.treinoDia.bonus) dar('treino-dia', novas);
    if (dados.ritmo && dados.ritmo.degrau >= C.ESCADA_RITMO.length - 1) dar('ritmo-universal', novas);
    const seq = sequencia();
    if (seq >= 3) dar('seq-3', novas);
    if (seq >= 7) dar('seq-7', novas);
    if (seq >= 30) dar('seq-30', novas);
    if (Object.values(dados.licoes).filter((l) => l.estrelas === 3).length >= 10) dar('perfeccionista', novas);
    return novas;
  }

  // ---------- Backup ----------
  function exportar() { return JSON.stringify(dados, null, 1); }
  function importar(txt) {
    const lido = JSON.parse(txt);
    if (!lido || lido.versao !== 1 || typeof lido.licoes !== 'object') throw new Error('Arquivo de progresso inválido.');
    dados = Object.assign(padrao(), lido);
    dados.config = Object.assign(padrao().config, lido.config || {});
    salvar();
  }
  function zerar() { const cfg = dados.config; dados = padrao(); dados.config = cfg; salvar(); }

  carregar();

  window.Estado = {
    get dados() { return dados; },
    salvar, hoje, sequencia, nivelAtual, ganharXP, somarTempo, tempoHoje,
    licao, concluida, registrarLicao, registrarMusica, registrarTroca, recordeTroca,
    licaoDesbloqueada, unidadeConcluida, musicaDesbloqueada, pularAte, acordesAprendidos,
    ritmoAtual, avancarRitmo, treinoDia, marcarTreino, parFraco,
    verificarConquistas, exportar, importar, zerar,
    aoMudar(f) { ouvintes.add(f); return () => ouvintes.delete(f); }
  };
})();
