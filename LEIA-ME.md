# Violão de Bolso

App para aprender violão com o microfone conferindo seus acordes e o seu ritmo.
Funciona no navegador do celular ou do computador. Não precisa de loja de aplicativos.

**Abra no celular:** https://hsnetow.github.io/violao-de-bolso/
(depois, no menu do navegador, use **Adicionar à tela inicial**)

## Como abrir

### No computador

1. Dê dois cliques em `iniciar.bat`.
2. O navegador abre em `http://localhost:8080`. Se não abrir, digite esse endereço.
3. Na primeira lição com microfone, o navegador pede permissão: clique em **Permitir**.

Precisa do [Node.js](https://nodejs.org) instalado (já está nesta máquina).

### No celular (recomendado: dá para deixar o celular apoiado na frente do violão)

1. Deixe o `iniciar.bat` rodando no computador.
2. Celular e computador precisam estar **no mesmo Wi-Fi**.
3. No celular, abra o endereço `https://...:8443` que aparece na janela preta do servidor.
   No computador, a aba **Perfil → Abrir no celular** mostra um QR code com esse endereço.
4. O celular vai avisar que a conexão "não é particular" ou que o certificado não é confiável.
   Isso acontece porque o certificado foi criado no seu próprio computador.
   - **Android (Chrome):** toque em **Avançado** e depois em **Continuar para 192.168...**
   - **iPhone (Safari):** toque em **Mostrar Detalhes** e depois em **visitar este site**.
5. Permita o microfone quando o app pedir.
6. Opcional: no menu do navegador, **Adicionar à tela inicial** cria um ícone de app.

Se o Windows perguntar sobre o Firewall ao abrir o servidor, permita em **Redes privadas**.
Sem isso o celular não consegue chegar no computador.

Por que https? Os navegadores só liberam o microfone em páginas seguras (`https://`) ou em
`localhost`. Por isso o computador usa `http://localhost` e o celular usa `https://`.

## Publicar na internet (celular sem depender do PC)

A pasta `app/` é um site estático completo. Hospedado num serviço com https de verdade, o
celular abre sem aviso de certificado. Depois da primeira visita, o app funciona **até sem
internet** (os arquivos ficam guardados no celular), e dá para usar **Adicionar à tela inicial**
para ter um ícone de app. O progresso salvo no celular é separado do progresso do PC.

O site é público: qualquer pessoa com o endereço consegue abrir. Ele não tem letras de música
nem dados seus, só o app.

### Opção A: Netlify Drop (mais simples, sem instalar nada)

1. Entre em https://app.netlify.com/drop e crie uma conta grátis (pode ser com o Google).
2. Arraste a pasta `app` para a página.
3. Pronto: o Netlify mostra um endereço `https://...netlify.app`. Abra no celular.
4. Para atualizar depois: no site do Netlify, aba **Deploys**, arraste a pasta `app` de novo.

### Opção B: GitHub Pages (atualiza sozinho a cada mudança)

O projeto já tem a automação em `.github/workflows/publicar.yml`: cada envio para a branch
`main` publica a pasta `app/`.

1. Crie uma conta em https://github.com e um repositório público (por exemplo `violao-de-bolso`).
2. Envie o projeto para ele (a pasta `certificado/` fica de fora pelo `.gitignore`).
3. No repositório: **Settings → Pages → Source: GitHub Actions**.
4. O endereço fica `https://SEU-USUARIO.github.io/violao-de-bolso/`.

Com o GitHub CLI (`winget install GitHub.cli` e depois `gh auth login`), o Claude consegue
criar o repositório e publicar as atualizações por você.

Para refazer os ícones depois de mudar o `app/icone.svg`, ajuste e rode
`node ferramentas/gerar-icones.js`.

## Dicas para o microfone ouvir bem

- Celular a uns 50 cm do violão, em lugar silencioso.
- Fone de ouvido ajuda: o clique do metrônomo não vaza para o microfone.
- Faça a lição **Sincronize o app** (unidade 1) para o tempo das batidas ser medido com precisão.
- Se o app não ouvir as palhetadas para cima, aumente **Perfil → Sensibilidade das batidas**.
- **Treino → Detector de acordes** mostra em tempo real o que o app está ouvindo.
- Sem violão por perto? **Perfil → Modo demonstração** liga um violão virtual que toca nas lições.

## O que tem no app

- **Trilha** com 8 unidades e 41 lições: conhecer o violão, afinar, sincronizar, palhetada para
  baixo, 17 acordes (incluindo F e Bm sem pestana e os formatos de Wonderwall), troca de 1 minuto,
  palhetada para cima, ritmo universal (↓ ↓↑ ↑↓↑) e um desafio no fim de cada unidade.
- **Teste de nivelamento** para quem já sabe alguns acordes, e **Pular até aqui** em cada unidade.
- **8 músicas**, só com os acordes (sem letra), em versão simplificada para estudo:
  A Horse With No Name, Knockin' on Heaven's Door, Stand By Me, Let It Be, Tempo Perdido,
  Pais e Filhos, Hurt (Johnny Cash) e Wonderwall. Cada uma tem treino por partes e o
  **projeto final**: tocar a música inteira, com 3 níveis de ritmo e velocidade de 50% a 100%.
- **Gamificação:** estrelas, XP e níveis, dias seguidos, meta diária de minutos tocados e 19 conquistas.
- **Treino livre:** afinador, detector de acordes, troca de 1 minuto com qualquer par, metrônomo
  e dicionário de acordes com som de exemplo.
- O progresso fica salvo no navegador. Em **Perfil** dá para exportar e importar o progresso.
  Celular e computador guardam progressos separados.

## Como o app escuta o violão

Tudo roda no próprio aparelho, sem enviar áudio para lugar nenhum.

1. **Acorde certo?** O som do microfone passa por uma FFT de 16.384 pontos (cerca de 0,34 s).
   Os picos do espectro viram um *cromagrama*: quanto de cada uma das 12 notas está soando.
   Para cada acorde, o app monta um "molde" a partir da posição dos dedos (as notas de cada corda
   e seus harmônicos, já contando o capotraste) e compara por semelhança de cosseno. O acorde
   passa quando é o mais parecido entre os candidatos e a semelhança é alta.
2. **Corda abafada?** Para as cordas cuja nota não se confunde com outra, o app procura a nota
   no espectro e pinta a bolinha embaixo do diagrama de verde ou vermelho.
3. **Batida no tempo?** Um detector de ataques (fluxo espectral em quadros de 5 ms, entre 150 Hz
   e 4 kHz) marca o instante de cada palhetada. O clique do metrônomo fica em 6 a 9 kHz, fora
   dessa faixa, para não ser confundido com batida. O atraso do celular é descontado.
4. **Afinador:** algoritmo YIN.

A direção da palhetada (para baixo ou para cima) não dá para ouvir com segurança pelo microfone.
O app confere o momento de cada batida e mostra as setas para você seguir.

### Testes

```bash
node testes/teste-deteccao.js
```

O teste gera violão sintetizado (Karplus-Strong) com desafinação, ruído e o corte de graves de
um microfone de celular. Resultado atual:

| Teste | Resultado |
|---|---|
| Acorde certo aceito | 99,3% (405 de 408) |
| Acorde errado rejeitado | 100% (432 de 432) |
| Ruído aceito como acorde | 0 |
| Erro do afinador | 0,04 cent |
| Batidas detectadas com metrônomo vazando | 39 de 42, 2 extras |

Violão sintetizado não é violão de verdade: os limites (semelhança mínima de 0,80 e a
sensibilidade das batidas) podem precisar de ajuste depois de testar com o seu violão.

## Arquivos

```
iniciar.bat            abre o servidor e o navegador
servidor.js            servidor local (http 8080 e https 8443), sem dependências
certificado/           certificado do https, gerado na primeira vez (não compartilhe)
app/index.html         o app
app/js/teoria.js       notas, banco de acordes e moldes
app/js/dsp.js          FFT, cromagrama, afinador, detector de batidas, sintetizador
app/js/audio.js        microfone, metrônomo, violão virtual
app/js/conteudo.js     trilha, ritmos, músicas, conquistas
app/js/estado.js       progresso, XP, sequência de dias
app/js/pista.js        pista rolante dos exercícios e músicas
app/js/licoes.js       cada tipo de lição e as ferramentas
app/js/app.js          telas Trilha, Músicas, Treino e Perfil
testes/                teste do motor de áudio
ferramentas/           gerador dos ícones PNG
.github/workflows/     publicação automática no GitHub Pages
PESQUISA.md            pesquisa sobre os apps pagos
```

Para adicionar uma música, copie um bloco em `MUSICAS` no `app/js/conteudo.js`.
Os compassos são separados por `|`, e dois acordes no mesmo compasso dividem o tempo.
