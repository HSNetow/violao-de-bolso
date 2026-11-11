/* Utilitários de interface: criação de elementos, diagrama de acorde,
 * ilustrações das lições, ícones, estrelas, avisos e palco das lições.
 */
(function () {
  'use strict';
  const T = window.Teoria;

  function el(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'texto') e.textContent = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const f of filhos.flat()) {
      if (f === null || f === undefined || f === false) continue;
      e.appendChild(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(String(f)) : f);
    }
    return e;
  }
  const svgEl = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };

  // ---------- Ícones ----------
  const ICONES = {
    trilha: '<path d="M6 20c0-4 4-4 6-8s6-4 6-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="6" cy="20" r="2.2" fill="currentColor"/><circle cx="18" cy="4" r="2.2" fill="currentColor"/>',
    musica: '<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.6" fill="currentColor"/><circle cx="16.5" cy="16" r="2.6" fill="currentColor"/>',
    treino: '<path d="M8 3v8a4 4 0 0 0 8 0V3M12 15v6M8 21h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    perfil: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/>',
    estrela: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/>',
    fogo: '<path d="M12 22c4.4 0 7-2.9 7-6.6 0-3.6-2.6-5.7-3.6-8.9-.4 1.9-1.3 3-2.4 3.6.2-3.4-1.4-6.3-4-8.1.2 3.3-1.5 5.3-3 7.2C4.8 11.3 5 13 5 15.4 5 19.1 7.6 22 12 22z" fill="currentColor"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    fechar: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
    som: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    afinar: '<path d="M4 18a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 18l4-7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    relogio: '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l3 2M9 2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
    setas: '<path d="M8 4v14M4 14l4 4 4-4M16 20V6M12 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    troca: '<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    acorde: '<rect x="5" y="3" width="14" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 9h14M5 15h14M9.7 3v18M14.3 3v18" stroke="currentColor" stroke-width="1.3"/><circle cx="9.7" cy="12" r="2" fill="currentColor"/>',
    trofeu: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    bandeira: '<path d="M5 21V4M5 4h12l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    celular: '<rect x="7" y="2.5" width="10" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 18.5h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    pular: '<path d="M5 5l8 7-8 7zM13 5l8 7-8 7z" fill="currentColor"/>',
    repetir: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function icone(nome, classe) {
    return svgEl(`<svg class="ico ${classe || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ''}</svg>`);
  }

  function estrelas(n, total, classe) {
    const c = el('span', { class: 'estrelas ' + (classe || ''), 'aria-label': `${n} de ${total || 3} estrelas` });
    for (let i = 0; i < (total || 3); i++) c.appendChild(icone('estrela', i < n ? 'cheia' : 'vazia'));
    return c;
  }

  // ---------- Diagrama de acorde ----------
  // opcoes: {largura, cordas: [null|true|false x6], capo, mostrarNome}
  function diagrama(id, opcoes) {
    const o = Object.assign({ largura: 150, cordas: null, capo: 0, nome: false }, opcoes || {});
    const ac = T.ACORDES[id];
    const W = 120, H = 150, x0 = 14, x1 = 106, y0 = 30, y1 = 136, nCasas = 4;
    const dx = (x1 - x0) / 5, dy = (y1 - y0) / nCasas;
    let s = `<svg class="diagrama" viewBox="0 0 ${W} ${H + (o.cordas ? 14 : 0)}" width="${o.largura}" role="img" aria-label="Diagrama do acorde ${ac.nome}">`;
    // trastes
    for (let j = 0; j <= nCasas; j++) {
      const y = y0 + j * dy;
      s += `<line class="${j === 0 ? 'dg-pestana' : 'dg-traste'}" x1="${x0 - (j === 0 ? 1.5 : 0)}" x2="${x1 + (j === 0 ? 1.5 : 0)}" y1="${y}" y2="${y}"/>`;
    }
    // cordas (mais grossas à esquerda)
    for (let i = 0; i < 6; i++) {
      const x = x0 + i * dx;
      s += `<line class="dg-corda" style="stroke-width:${(2.1 - i * 0.25).toFixed(2)}" x1="${x}" x2="${x}" y1="${y0}" y2="${y1}"/>`;
    }
    if (o.capo) s += `<text class="dg-capo" x="${W / 2}" y="${y0 - 21}" text-anchor="middle">capotraste na casa ${o.capo}</text>`;
    ac.casas.forEach((c, i) => {
      const x = x0 + i * dx;
      if (c < 0) s += `<g class="dg-x"><line x1="${x - 4.5}" y1="${y0 - 14}" x2="${x + 4.5}" y2="${y0 - 5}"/><line x1="${x + 4.5}" y1="${y0 - 14}" x2="${x - 4.5}" y2="${y0 - 5}"/></g>`;
      else if (c === 0) s += `<circle class="dg-o" cx="${x}" cy="${y0 - 9.5}" r="4.6"/>`;
      else {
        const y = y0 + (c - 0.5) * dy;
        s += `<circle class="dg-ponto" cx="${x}" cy="${y}" r="${Math.min(dx, dy) * 0.4}"/>`;
        if (ac.dedos[i]) s += `<text class="dg-dedo" x="${x}" y="${y + 4}" text-anchor="middle">${ac.dedos[i]}</text>`;
      }
    });
    if (o.cordas) {
      o.cordas.forEach((st, i) => {
        if (ac.casas[i] < 0) return;
        const x = x0 + i * dx;
        const cls = st === true ? 'dg-ok' : st === false ? 'dg-erro' : 'dg-neutro';
        s += `<circle class="${cls}" cx="${x}" cy="${H + 4}" r="3.6"/>`;
      });
    }
    s += '</svg>';
    return svgEl(s);
  }

  // ---------- Ilustrações das lições ----------
  const FIGURAS = {
    cordas: () => {
      const notas = ['Mi', 'Lá', 'Ré', 'Sol', 'Si', 'Mi'];
      let s = '<svg viewBox="0 0 320 170" class="figura" role="img" aria-label="As seis cordas numeradas">';
      s += '<rect x="20" y="18" width="250" height="134" rx="6" class="fg-madeira"/>';
      for (let k = 1; k <= 4; k++) s += `<line x1="${20 + k * 50}" y1="18" x2="${20 + k * 50}" y2="152" class="fg-traste"/>`;
      s += '<rect x="16" y="18" width="6" height="134" class="fg-pestana"/>';
      for (let i = 0; i < 6; i++) {
        const y = 30 + i * 22;
        const corda = i + 1;
        s += `<line x1="10" y1="${y}" x2="280" y2="${y}" class="fg-corda" style="stroke-width:${(0.9 + i * 0.35).toFixed(2)}"/>`;
        s += `<text x="292" y="${y + 5}" class="fg-num">${corda}</text><text x="306" y="${y + 5}" class="fg-nota">${notas[5 - i]}</text>`;
      }
      s += '<text x="145" y="168" text-anchor="middle" class="fg-legenda">fina em cima, grossa embaixo (visto por quem toca)</text></svg>';
      return s;
    },
    dedos: () => `<svg viewBox="0 0 320 180" class="figura" role="img" aria-label="Números dos dedos">
      <rect x="95" y="95" width="130" height="78" rx="30" class="fg-mao"/>
      ${[['1', 105, 'indicador'], ['2', 137, 'médio'], ['3', 169, 'anelar'], ['4', 199, 'mínimo']].map(([n, x, nome], i) => {
        const h = [70, 82, 76, 58][i];
        return `<rect x="${x}" y="${105 - h}" width="24" height="${h + 20}" rx="12" class="fg-mao"/><circle cx="${x + 12}" cy="${118 - h}" r="11" class="fg-bolinha"/><text x="${x + 12}" y="${123 - h}" text-anchor="middle" class="fg-bolinha-txt">${n}</text><text x="${x + 12}" y="176" text-anchor="middle" class="fg-legenda">${nome}</text>`;
      }).join('')}
      <rect x="40" y="110" width="66" height="26" rx="13" class="fg-mao" transform="rotate(-25 72 123)"/><text x="52" y="104" class="fg-legenda">polegar atrás</text></svg>`,
    diagrama: () => {
      const d = diagrama('Em', { largura: 150 }).outerHTML;
      return `<div class="figura-diagrama">${d}<ul class="figura-lista"><li><b>O</b> corda solta</li><li><b>X</b> não tocar</li><li><b>bolinha</b> onde apertar</li><li><b>número</b> qual dedo</li></ul></div>`;
    },
    traste: () => `<svg viewBox="0 0 320 140" class="figura" role="img" aria-label="Onde apertar a corda">
      <rect x="20" y="20" width="280" height="90" rx="6" class="fg-madeira"/>
      <line x1="120" y1="20" x2="120" y2="110" class="fg-traste" style="stroke-width:5"/><line x1="220" y1="20" x2="220" y2="110" class="fg-traste" style="stroke-width:5"/>
      <line x1="20" y1="65" x2="300" y2="65" class="fg-corda" style="stroke-width:2.2"/>
      <circle cx="205" cy="65" r="13" class="fg-bolinha"/><text x="205" y="70" text-anchor="middle" class="fg-bolinha-txt">1</text>
      <path d="M205 128 L205 86" class="fg-seta"/><path d="M198 94 L205 84 L212 94" class="fg-seta"/>
      <text x="160" y="137" text-anchor="middle" class="fg-legenda">logo atrás do traste</text></svg>`,
    celular: () => `<svg viewBox="0 0 320 140" class="figura" role="img" aria-label="Celular a 50 cm do violão">
      <ellipse cx="80" cy="80" rx="50" ry="44" class="fg-madeira"/><ellipse cx="80" cy="80" rx="15" ry="15" class="fg-buraco"/><rect x="118" y="70" width="70" height="18" rx="3" class="fg-madeira"/>
      <rect x="250" y="40" width="38" height="70" rx="7" class="fg-celular"/><circle cx="269" cy="102" r="3" class="fg-buraco"/>
      <path d="M140 120 H240" class="fg-seta"/><path d="M232 114 L242 120 L232 126 M148 114 L138 120 L148 126" class="fg-seta"/>
      <text x="190" y="112" text-anchor="middle" class="fg-legenda">uns 50 cm</text></svg>`,
    pendulo: () => {
      const rot = ['1', 'e', '2', 'e', '3', 'e', '4', 'e'];
      let s = '<svg viewBox="0 0 320 130" class="figura" role="img" aria-label="Baixo nos tempos, cima no e">';
      rot.forEach((r, i) => {
        const x = 26 + i * 38, baixo = i % 2 === 0;
        s += baixo ? `<path d="M${x} 22 V70 M${x - 9} 58 L${x} 72 L${x + 9} 58" class="fg-seta-forte"/>` : `<path d="M${x} 72 V24 M${x - 9} 36 L${x} 22 L${x + 9} 36" class="fg-seta-leve"/>`;
        s += `<text x="${x}" y="100" text-anchor="middle" class="${baixo ? 'fg-num' : 'fg-nota'}">${r}</text>`;
      });
      s += '<text x="160" y="124" text-anchor="middle" class="fg-legenda">↓ no tempo, ↑ no "e"</text></svg>';
      return s;
    },
    fantasma: () => {
      const slots = ['B', '-', 'B', 'C', '-', 'C', 'B', 'C'];
      const rot = ['1', 'e', '2', 'e', '3', 'e', '4', 'e'];
      let s = '<svg viewBox="0 0 320 130" class="figura" role="img" aria-label="Ritmo universal com batida fantasma">';
      slots.forEach((sl, i) => {
        const x = 26 + i * 38, baixo = i % 2 === 0;
        const cls = sl === '-' ? 'fg-seta-fantasma' : baixo ? 'fg-seta-forte' : 'fg-seta-leve';
        s += baixo ? `<path d="M${x} 22 V70 M${x - 9} 58 L${x} 72 L${x + 9} 58" class="${cls}"/>` : `<path d="M${x} 72 V24 M${x - 9} 36 L${x} 22 L${x + 9} 36" class="${cls}"/>`;
        s += `<text x="${x}" y="100" text-anchor="middle" class="${baixo ? 'fg-num' : 'fg-nota'}">${rot[i]}</text>`;
      });
      s += '<text x="160" y="124" text-anchor="middle" class="fg-legenda">setas apagadas: a mão passa sem tocar</text></svg>';
      return s;
    },
    capo: () => `<svg viewBox="0 0 320 150" class="figura" role="img" aria-label="Capotraste na casa 2">
      <rect x="20" y="20" width="280" height="100" rx="6" class="fg-madeira"/>
      <rect x="16" y="20" width="6" height="100" class="fg-pestana"/>
      ${[1, 2, 3, 4].map((k) => `<line x1="${20 + k * 62}" y1="20" x2="${20 + k * 62}" y2="120" class="fg-traste"/><text x="${20 + k * 62 - 31}" y="140" text-anchor="middle" class="fg-legenda">casa ${k}</text>`).join('')}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="10" y1="${30 + i * 16}" x2="300" y2="${30 + i * 16}" class="fg-corda" style="stroke-width:${(0.9 + i * 0.3).toFixed(2)}"/>`).join('')}
      <rect x="128" y="10" width="14" height="120" rx="5" class="fg-capo"/></svg>`,
    ancora: () => {
      const d = diagrama('Em7', { largura: 140, capo: 2 }).outerHTML;
      return `<div class="figura-diagrama">${d}<ul class="figura-lista"><li><b>3 e 4</b> presos na casa 3</li><li>só os dedos <b>1 e 2</b> mudam</li><li>vale para Em7, G, Dsus4, A7sus4 e Cadd9</li></ul></div>`;
    }
  };
  function figura(nome) {
    const f = FIGURAS[nome];
    if (!f) return null;
    const d = el('div', { class: 'figura-caixa' });
    d.innerHTML = f();
    return d;
  }

  // ---------- Avisos ----------
  let caixaAvisos = null;
  function aviso(texto, tipo) {
    if (!caixaAvisos) { caixaAvisos = el('div', { class: 'avisos', 'aria-live': 'polite' }); document.body.appendChild(caixaAvisos); }
    const a = el('div', { class: 'aviso ' + (tipo || '') }, texto);
    caixaAvisos.appendChild(a);
    setTimeout(() => { a.classList.add('saindo'); setTimeout(() => a.remove(), 400); }, 3200);
  }

  // ---------- Palco (tela cheia das lições) ----------
  let palcoAtual = null;
  function abrirPalco(titulo, opcoes) {
    fecharPalco(true);
    const limpezas = [];
    const raiz = el('div', { class: 'palco', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
    const topo = el('header', { class: 'palco-topo' });
    const btFechar = el('button', { class: 'bt-icone', 'aria-label': 'Fechar', onclick: () => fecharPalco() }, icone('fechar'));
    const tituloEl = el('div', { class: 'palco-titulo' }, titulo);
    const extra = el('div', { class: 'palco-extra' });
    topo.append(btFechar, tituloEl, extra);
    const corpo = el('div', { class: 'palco-corpo' });
    raiz.append(topo, corpo);
    document.body.appendChild(raiz);
    document.body.classList.add('com-palco');
    const palco = {
      raiz, corpo, extra, tituloEl,
      aoFechar(f) { limpezas.push(f); },
      fechar: () => fecharPalco(),
      limpar() { while (limpezas.length) { try { limpezas.pop()(); } catch (e) { console.error(e); } } corpo.innerHTML = ''; extra.innerHTML = ''; },
      _limpezas: limpezas,
      opcoes: opcoes || {}
    };
    palcoAtual = palco;
    try { history.pushState({ palco: true }, ''); } catch (e) { /* ok */ }
    return palco;
  }
  function fecharPalco(semHistorico) {
    if (!palcoAtual) return;
    const p = palcoAtual;
    palcoAtual = null;
    while (p._limpezas.length) { try { p._limpezas.pop()(); } catch (e) { console.error(e); } }
    p.raiz.remove();
    document.body.classList.remove('com-palco');
    if (window.Motor) window.Motor.desligarMicrofone();
    if (window.TelaAcesa) window.TelaAcesa.desligar();
    if (p.opcoes.aoFechar) p.opcoes.aoFechar();
    if (!semHistorico && history.state && history.state.palco) { try { history.back(); } catch (e) { /* ok */ } }
  }
  window.addEventListener('popstate', () => { if (palcoAtual) fecharPalco(true); });

  function formatarTempo(seg) {
    const m = Math.floor(seg / 60), s = Math.floor(seg % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  window.UI = { el, svgEl, icone, estrelas, diagrama, figura, aviso, abrirPalco, fecharPalco, formatarTempo, get palco() { return palcoAtual; } };
})();
