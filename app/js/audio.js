/* Motor de áudio do navegador: microfone, análise contínua, detector de
 * batidas (AudioWorklet), metrônomo, som de acorde de exemplo e um
 * "robô violonista" para o modo demonstração (sem microfone).
 */
(function () {
  'use strict';
  const T = window.Teoria, DSP = window.DSP;
  const N_FFT = 16384;

  const Motor = {
    ctx: null, stream: null, fonte: null, entrada: null, analisador: null, buf: null, espectral: null,
    nodeAtaques: null, intervalo: null, ativo: false, simulado: false,
    ouvQuadro: new Set(), ouvAtaque: new Set(),
    latencia: 0.1, silenciarAte: 0, ultimoQuadro: null, ruidoDb: -70,
    volumeClique: 0.5, sensibilidade: 1,

    async garantirContexto() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw Object.assign(new Error('Este navegador não tem Web Audio.'), { codigo: 'sem-audio' });
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.entrada = this.ctx.createGain();
      }
      if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch (e) { /* segue */ } }
      return this.ctx;
    },

    latenciaPadrao() {
      const c = this.ctx;
      const saida = c ? (c.outputLatency || 0) + (c.baseLatency || 0) : 0.03;
      return Math.min(0.3, saida + 0.04);
    },

    async ligarMicrofone() {
      await this.garantirContexto();
      if (this.ativo) return;
      const ctx = this.ctx;
      if (!this.simulado) {
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw Object.assign(new Error('O microfone só funciona em página segura (https ou localhost).'), { codigo: 'inseguro' });
        }
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
          });
        } catch (e) {
          const negado = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
          throw Object.assign(new Error(negado ? 'Permissão do microfone negada.' : 'Não consegui abrir o microfone.'), { codigo: negado ? 'negado' : 'falhou', original: e });
        }
        this.fonte = ctx.createMediaStreamSource(this.stream);
        this.fonte.connect(this.entrada);
      }
      if (!this.analisador) {
        this.analisador = ctx.createAnalyser();
        this.analisador.fftSize = N_FFT;
        this.analisador.smoothingTimeConstant = 0;
        this.entrada.connect(this.analisador);
        this.buf = new Float32Array(N_FFT);
        this.espectral = new DSP.AnalisadorEspectral(N_FFT, ctx.sampleRate);
      }
      if (!this.nodeAtaques) await this.criarDetectorAtaques();
      this.ativo = true;
      clearInterval(this.intervalo);
      this.intervalo = setInterval(() => this.analisar(), 70);
    },

    desligarMicrofone() {
      clearInterval(this.intervalo);
      this.intervalo = null;
      this.ativo = false;
      if (this.fonte) { try { this.fonte.disconnect(); } catch (e) { /* ok */ } this.fonte = null; }
      if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
      this.pararRobo();
    },

    analisar() {
      if (!this.ativo || !this.analisador) return;
      this.analisador.getFloatTimeDomainData(this.buf);
      const r = this.espectral.analisar(this.buf);
      r.t = this.ctx.currentTime;
      r.db = 20 * Math.log10(r.rms + 1e-9);
      if (r.db < this.ruidoDb) this.ruidoDb += (r.db - this.ruidoDb) * 0.3;
      else this.ruidoDb += (r.db - this.ruidoDb) * 0.008;
      this.ruidoDb = Math.min(this.ruidoDb, -38);
      r.temSinal = r.db > Math.max(-62, this.ruidoDb + 9);
      r.silenciado = r.t < this.silenciarAte;
      this.ultimoQuadro = r;
      this.ouvQuadro.forEach((f) => { try { f(r); } catch (e) { console.error(e); } });
    },

    async criarDetectorAtaques() {
      const ctx = this.ctx;
      const codigo = DSP.DetectorAtaques.toString() + `
class ProcAtaques extends AudioWorkletProcessor {
  constructor() {
    super();
    this.det = new DetectorAtaques(sampleRate);
    this.cont = 0;
    this.port.onmessage = (e) => { if (e.data && e.data.sensibilidade) this.det.sensibilidade = e.data.sensibilidade; };
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      const ev = this.det.processar(ch, currentFrame);
      if (ev.length) this.port.postMessage({ tipo: 'ataques', ev });
    }
    return true;
  }
}
registerProcessor('ataques-violao', ProcAtaques);`;
      let node = null;
      try {
        if (!ctx.audioWorklet) throw new Error('sem worklet');
        const url = URL.createObjectURL(new Blob([codigo], { type: 'application/javascript' }));
        await ctx.audioWorklet.addModule(url);
        node = new AudioWorkletNode(ctx, 'ataques-violao', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
        node.port.onmessage = (e) => this.receberAtaques(e.data);
        node.port.postMessage({ sensibilidade: this.sensibilidade });
      } catch (err) {
        // plano B: ScriptProcessor na thread principal
        const det = new DSP.DetectorAtaques(ctx.sampleRate);
        this.detPlanoB = det;
        node = ctx.createScriptProcessor(1024, 1, 1);
        node.onaudioprocess = (e) => {
          const d = e.inputBuffer.getChannelData(0);
          const frame = Math.round(ctx.currentTime * ctx.sampleRate) - d.length;
          const ev = det.processar(d, frame);
          if (ev.length) this.receberAtaques({ tipo: 'ataques', ev });
        };
      }
      this.nodeAtaques = node;
      this.entrada.connect(node);
      const mudo = ctx.createGain();
      mudo.gain.value = 0;
      node.connect(mudo);
      mudo.connect(ctx.destination);
    },

    definirSensibilidade(s) {
      this.sensibilidade = s;
      if (this.nodeAtaques && this.nodeAtaques.port) this.nodeAtaques.port.postMessage({ sensibilidade: s });
      if (this.detPlanoB) this.detPlanoB.sensibilidade = s;
    },

    receberAtaques(msg) {
      if (!msg || msg.tipo !== 'ataques') return;
      for (const e of msg.ev) {
        if (e.t < this.silenciarAte) continue;
        const ev = { t: e.t, tAjustado: e.t - this.latencia, forca: e.forca };
        this.ouvAtaque.forEach((f) => { try { f(ev); } catch (er) { console.error(er); } });
      }
    },

    agora() { return this.ctx ? this.ctx.currentTime : 0; },

    // ---------- Metrônomo ----------
    clique(t, forte) {
      if (!this.ctx || this.volumeClique <= 0) return;
      const ctx = this.ctx;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o2.type = 'sine';
      o.frequency.value = forte ? 7000 : 6000;
      o2.frequency.value = forte ? 9100 : 7900;
      const v = this.volumeClique * (forte ? 1 : 0.7);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.045);
      o.connect(g); o2.connect(g); g.connect(ctx.destination);
      o.start(t); o2.start(t); o.stop(t + 0.06); o2.stop(t + 0.06);
    },

    // agenda cliques de [inicio, fim) com intervalo "batida"; retorna função para cancelar
    metronomo(inicio, batida, quantos, acentoCada) {
      let k = 0, cancelado = false;
      const passo = () => {
        if (cancelado) return;
        const limite = this.agora() + 0.25;
        while (k < quantos && inicio + k * batida < limite) {
          this.clique(inicio + k * batida, acentoCada && k % acentoCada === 0);
          k++;
        }
        if (k < quantos) setTimeout(passo, 60);
      };
      passo();
      return () => { cancelado = true; };
    },

    // ---------- Som de exemplo ----------
    cacheBuffers: new Map(),
    bufferDeBatida(notas, direcao, volume, variante) {
      const chave = notas.join(',') + '|' + direcao + '|' + volume + '|' + (variante || 0);
      if (this.cacheBuffers.has(chave)) return this.cacheBuffers.get(chave);
      const sr = this.ctx.sampleRate;
      const dados = DSP.sintetizarBatida(notas, sr, { duracao: 2.2, direcao, volume, desafinar: 4, brilho: 0.6, espalhar: 0.008 });
      const b = this.ctx.createBuffer(1, dados.length, sr);
      b.getChannelData(0).set(dados);
      if (this.cacheBuffers.size > 60) this.cacheBuffers.clear();
      this.cacheBuffers.set(chave, b);
      return b;
    },

    async tocarAcorde(id, capo, opcoes) {
      await this.garantirContexto();
      const o = Object.assign({ direcao: 'baixo', volume: 0.7, t: null, paraEntrada: false, saida: true }, opcoes || {});
      const notas = T.ACORDES[id].casas.map((c, s) => (c >= 0 ? T.CORDAS_SOLTAS[s] + c + (capo || 0) : null));
      const buf = this.bufferDeBatida(notas, o.direcao, o.volume, o.variante);
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      const t = o.t !== null ? o.t : this.ctx.currentTime + 0.03;
      if (o.saida) {
        const g = this.ctx.createGain();
        g.gain.value = o.paraEntrada ? 0.5 : 1;
        s.connect(g); g.connect(this.ctx.destination);
      }
      if (o.paraEntrada) s.connect(this.entrada);
      else this.silenciarAte = Math.max(this.silenciarAte, t + buf.duration + 0.3);
      s.start(t);
      return s;
    },

    async tocarNota(midi, duracao) {
      await this.garantirContexto();
      const cordas = [midi, null, null, null, null, null];
      const buf = this.bufferDeBatida(cordas, 'baixo', 0.6, 0);
      const s = this.ctx.createBufferSource();
      s.buffer = buf; s.connect(this.ctx.destination);
      const t = this.ctx.currentTime + 0.02;
      s.start(t); s.stop(t + (duracao || 2));
      this.silenciarAte = Math.max(this.silenciarAte, t + (duracao || 2) + 0.2);
    },

    somSucesso() {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime + 0.01;
      [0, 4, 7, 12].forEach((st, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = 659.25 * Math.pow(2, st / 12);
        g.gain.setValueAtTime(0.0001, t + i * 0.07);
        g.gain.linearRampToValueAtTime(0.18, t + i * 0.07 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0005, t + i * 0.07 + 0.35);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.4);
      });
      this.silenciarAte = Math.max(this.silenciarAte, t + 0.7);
    },

    // ---------- Robô violonista (modo demonstração) ----------
    robo: { timers: [] },
    pararRobo() {
      this.robo.timers.forEach((id) => clearTimeout(id));
      this.robo.timers = [];
    },
    // toca uma batida no tempo t (segundos do AudioContext) direto na entrada
    roboBatida(id, capo, t, direcao, volume) {
      if (!this.simulado || !this.ctx) return;
      const atraso = Math.max(0, (t - this.ctx.currentTime - 0.3) * 1000);
      const h = setTimeout(() => {
        this.tocarAcorde(id, capo, { t: Math.max(t, this.ctx.currentTime + 0.01), direcao, volume, paraEntrada: true, variante: Math.floor(Math.random() * 3) });
      }, atraso);
      this.robo.timers.push(h);
    },
    roboNota(midi, t) {
      if (!this.simulado || !this.ctx) return;
      const atraso = Math.max(0, (t - this.ctx.currentTime - 0.3) * 1000);
      const h = setTimeout(() => {
        const buf = this.bufferDeBatida([midi, null, null, null, null, null], 'baixo', 0.7, 0);
        const s = this.ctx.createBufferSource();
        s.buffer = buf; s.connect(this.entrada);
        const g = this.ctx.createGain(); g.gain.value = 0.4; s.connect(g); g.connect(this.ctx.destination);
        s.start(Math.max(t, this.ctx.currentTime + 0.01));
      }, atraso);
      this.robo.timers.push(h);
    }
  };

  // ---------- Tela sempre acesa ----------
  const TelaAcesa = {
    trava: null,
    async ligar() {
      try { if ('wakeLock' in navigator && !this.trava) { this.trava = await navigator.wakeLock.request('screen'); this.trava.addEventListener('release', () => { this.trava = null; }); } } catch (e) { /* opcional */ }
    },
    desligar() { if (this.trava) { this.trava.release().catch(() => {}); this.trava = null; } }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Motor.ativo) TelaAcesa.ligar();
  });

  window.Motor = Motor;
  window.TelaAcesa = TelaAcesa;
})();
