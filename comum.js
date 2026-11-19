/* ============================================================
   O comportamento compartilhado por todas as páginas.
   ============================================================ */
(function () {
  var C = window.WHALEAD_CONFIG || {};
  /* Como o parcelamento aparece na tela. Quatro casos, nesta ordem:

     1. precoParcela + jurosDoCliente:false -> "12x de R$ 24,99 sem juros"
        Só vale se VOCÊ assume os juros no painel do Mercado Pago. Senão
        é parcela anunciada diferente da cobrada, e isso é processo.
     2. precoParcela + jurosDoCliente:true  -> "12x de R$ 30,52"
        O comprador paga os juros, e mesmo assim anunciamos a parcela.
        Então a palavra "sem juros" NÃO pode aparecer.
        O montante total NÃO vai na vitrine (decisão do dono, nov/2026).
        Quem concede o crédito aqui é o Mercado Pago, não o vendedor, e o
        checkout do MP mostra juros, parcelas e total antes de confirmar —
        é lá que o CDC art. 52 se cumpre. Se um dia o parcelamento passar
        a ser financiado por você, o total tem que voltar para cá.
        Responsabilidade de quem preenche: esse valor muda com a bandeira
        e com a taxa do dia. Confira no checkout antes de publicar.
     3. jurosDoCliente: true, sem valor     -> "em até 12x com juros"
     4. nenhum dos dois                     -> "em até 12x no cartão"     */
  var nParc = C.parcelas || 12;
  /* "R$ 29,34" -> 29.34. Devolve NaN se vier escrito de um jeito que não
     dá para somar, e também se vier zero ou negativo: "12x de R$ 0,00
     (total R$ 0,00)" é pior do que não dizer nada. Nesses casos o total
     some do texto em vez de sair errado. */
  function emNumero(txt) {
    var n = parseFloat(String(txt).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    return isFinite(n) && n > 0 ? n : NaN;
  }
  function emReais(n) {
    return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  var parcelado;
  if (C.precoParcela && C.jurosDoCliente) {
    // sem "sem juros" e sem total: só a parcela. O resto é no checkout.
    parcelado = nParc + 'x de ' + C.precoParcela;
  } else if (C.precoParcela) {
    parcelado = nParc + 'x de ' + C.precoParcela + ' sem juros';
  } else if (C.jurosDoCliente) {
    parcelado = 'em até ' + nParc + 'x com juros';
  } else {
    parcelado = 'em até ' + nParc + 'x no cartão';
  }

  /* "menos de R$ 1 por dia" é argumento de venda, e argumento de venda
     que deixa de ser verdade vira processo. Então a frase se calcula a
     partir do preço e do prazo da licença, e se corrige sozinha: passou
     de R$ 1, ela para de dizer "menos de R$ 1" e escreve o valor real.

     Ancorado no preço À VISTA de propósito. Pela soma das 12 parcelas
     a conta diária bate exatamente R$ 1,00 — e aí "menos de R$ 1" não
     valeria mais. Quem mexer no preço ou no prazo, confira os dois. */
    var porDia = (function () {
      var d = Number(C.validadeDias || 365);
      var p = emNumero(C.preco);
      if (!isFinite(p) || !(d > 0)) return '';
      var v = p / d;
      return v < 1 ? 'menos de R$ 1 por dia' : emReais(v) + ' por dia';
    })();

    /* O centavo exato do dia, para a letra miúda. "Menos de R$ 1" é o
       gancho; este é o número que sustenta o gancho se alguém conferir. */
    var porDiaExato = (function () {
      var d = Number(C.validadeDias || 365);
      var p = emNumero(C.preco);
      if (!isFinite(p) || !(d > 0)) return '';
      return emReais(p / d);
    })();

    /* ---- o total a prazo: DECISÃO DO DONO, não escrever ------------------
       Pedido explícito do dono: o único valor cheio que aparece no
       site é o à vista. A soma das parcelas não vai a lugar nenhum.

       Quem for mexer aqui precisa saber o que está sendo trocado: num
       parcelamento com juros do comprador, a soma total é informação
       devida (CDC art. 52, II e IV). O site cumpre isso mandando para o
       checkout do Mercado Pago, que mostra parcelas, juros e valor final
       ANTES da confirmação — por isso toda chamada de parcela no site é
       acompanhada da remissão ao checkout. Se um dia o checkout deixar
       de exibir o total, ou a venda sair por fora dele, esta conta volta
       a ser obrigatória na página. Está aqui pronta, desligada.          */
    var totalPrazo = '';   /* intencionalmente vazio — ver acima */

    /* a parcela sozinha, sem o "em até": é ela que vira o número grande */
    var parceladoCurto = C.precoParcela
      ? nParc + 'x de ' + C.precoParcela
      : 'em até ' + nParc + 'x';

    /* A letra miúda do bloco de preço, montada de uma vez só para não
       existirem duas versões dela espalhadas pelas páginas. */
    var precoDetalhe = (function () {
      var ps = [C.preco + ' à vista'];
      if (porDiaExato) ps[0] += ' (' + porDiaExato + ' por dia)';
      if (totalPrazo) ps.push('a prazo, total de ' + totalPrazo + ' com juros');
      else if (C.precoParcela && C.jurosDoCliente) ps.push('no cartão, parcelas com juros, conferidos no checkout');
      else if (C.precoParcela) ps.push(nParc + 'x sem juros');
      return ps.join(' · ') + '.';
    })();

    /* A versão curta, para o bloco do plano: ali o valor à vista já está
       escrito logo acima e o parágrafo do Mercado Pago, logo abaixo do
       botão, já manda conferir parcelas, juros e valor final. Repetir as
       duas coisas deixaria a oferta com cara de contrato. Sobra o que
       falta: o centavo que sustenta o "menos de R$ 1 por dia". */
    var precoDetalheCurto = porDiaExato
      ? 'À vista, dá ' + porDiaExato + ' por dia.'
      : '';

  /* ---- preenche os textos que vêm da configuração ---- */
  var textos = {
      preco: C.preco,
      porDia: porDia,
      porDiaExato: porDiaExato,
      totalPrazo: totalPrazo,
      parceladoCurto: parceladoCurto,
      precoDetalhe: precoDetalhe,
      precoDetalheCurto: precoDetalheCurto,
      parcelas: String(C.parcelas || 12),
      parcelado: parcelado,
    precoCompleto: C.preco + ' à vista, ou ' + parcelado,
    garantia: String(C.garantiaDias || 7),
    versao:   String(C.versao || ''),
    lojaUrl:  String(C.lojaUrl || ''),
    /* O prazo da licença escrito por extenso, para os termos. Sai daqui e
       não da mão de ninguém: mudou validadeDias no config, muda no texto.
       Lembre que DIAS_ACESSO, na Cloudflare, tem que contar o mesmo. */
    validade: (function () {
      if (C.vitalicio) return 'sem prazo de vencimento';
      var d = Number(C.validadeDias || 365);
      if (d === 365) return '1 (um) ano';
      if (d % 365 === 0) return (d / 365) + ' anos';
      if (d % 30 === 0) return (d / 30) + ' meses';
      return d + ' dias';
    })(),
    validadeDias: String(C.validadeDias || 365),
    suporte: C.suporte || 'whalead.crm@gmail.com',
    ano: String(new Date().getFullYear())
  };
  document.querySelectorAll('[data-t]').forEach(function (e) {
    var v = textos[e.getAttribute('data-t')];
    if (v !== undefined) e.textContent = v;
  });
  /* ---- um endereço de suporte só, usado por tudo ----------------------
     `mailto:` não serve: só funciona em quem tem programa de e-mail
     configurado, e em celular normalmente não faz nada. O Gmail na web
     abre em qualquer navegador, já com destinatário e assunto prontos.  */
  var recadoSuporte = 'Olá! Preciso de ajuda com o WhaLead.';
  var LINK_EMAIL = 'https://mail.google.com/mail/?view=cm&fs=1' +
    '&to=' + encodeURIComponent(textos.suporte) +
    '&su=' + encodeURIComponent('Suporte WhaLead') +
    '&body=' + encodeURIComponent(recadoSuporte);

  /* todo link de e-mail do site, em qualquer página, vai para o mesmo lugar */
/* Passo 3 do tutorial: enquanto a extensão não estiver na Chrome Web
     Store, o texto diz a verdade (o link chega por e-mail). Preenchendo
     lojaUrl no config, o mesmo passo vira um botão que leva à loja.
     Nenhum dos dois textos fica cravado no HTML. */
  (function () {
    var alvo = document.querySelector('[data-passo-instalar]');
    if (!alvo) return;
      if (textos.lojaUrl) {
        /* Dizer o nome dos botões que a pessoa vai encontrar NA LOJA.
           É o passo onde mais gente trava: a Chrome Web Store abre com
           um botão escrito "Usar no Chrome" e depois pede confirmação
           numa caixinha. Quem não sabe disso acha que não instalou. */
        alvo.textContent = 'O botão abre a página do WhaLead na Chrome Web Store, numa aba nova. '
          + 'Lá, clique em "Usar no Chrome" e confirme em "Adicionar extensão".';
        var a = document.createElement('a');
        a.className = 'lojabtn';
        a.href = textos.lojaUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.appendChild(document.createTextNode('Instalar no Chrome'));
        /* a setinha de "abre fora daqui", igual à dos outros links
           externos do site — desenhada, nunca caractere */
        a.insertAdjacentHTML('beforeend',
          '<svg class="ic icsm" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
          + ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          + '<path d="M7.6 16.4 16.4 7.6"/><path d="M8.6 7.6h7.8v7.8"/></svg>');
        alvo.parentNode.appendChild(a);
      }
  })();

  /* Atalho para quem já comprou: leva direto à loja, sem passar de novo
     pelo checkout. Fica escondido no HTML e só aparece quando existe
     lojaUrl — assim a página nunca mostra um link morto. */
  document.querySelectorAll('[data-loja]').forEach(function (e) {
    var a = e.matches('a') ? e : e.querySelector('a');
    if (!textos.lojaUrl || !a) return;
    a.href = textos.lojaUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    e.hidden = false;
  });

  document.querySelectorAll('[data-suporte]').forEach(function (e) {
    e.setAttribute('href', LINK_EMAIL);
    e.setAttribute('target', '_blank');
    e.setAttribute('rel', 'noopener');
    e.setAttribute('title', 'Escrever para ' + textos.suporte);
    e.style.cursor = 'pointer';
    // data-suporte="texto" mantém o rótulo escrito no HTML;
    // vazio, o link mostra o e-mail que estiver no config.js
    if (e.getAttribute('data-suporte') !== 'texto') e.textContent = textos.suporte;
  });

  /* ---- para onde vai cada botão de comprar ----------------------------
     Com servidor configurado, o caminho passa pela conta: é assim que a
     liberação acontece sozinha. Sem servidor, vai direto ao checkout e
     a liberação fica manual.                                            */
  var destino2 = C.api ? 'criar-conta.html' : (C.checkoutUrl || '#');
  var destino = destino2;
  var externo = !C.api;
  document.querySelectorAll('[data-comprar]').forEach(function (a) {
    a.setAttribute('href', destino);
    if (externo) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
  });

  /* quem já entrou não precisa ver "criar conta" */
  if (localStorage.getItem('wl_sessao')) {
    document.querySelectorAll('[data-sealogado]').forEach(function (e) {
      e.setAttribute('href', 'painel.html');
      if (e.hasAttribute('data-sealogado-txt'))
        e.textContent = e.getAttribute('data-sealogado-txt');
    });
  }

  /* ---- o botão de suporte, em todas as páginas -------------------------
     Um clique, e pronto: abre a conversa. Sem cartão no meio.

     Para onde vai, nesta ordem:
       1. WhatsApp, se você preencheu `whatsapp` no config.js
       2. Gmail na web, que funciona em qualquer navegador sem instalar nada

     É um link de verdade (<a>), não um botão com JavaScript: link o
     navegador sempre abre, enquanto janela aberta por script pode ser
     bloqueada. E o estilo vai ESCRITO NO ELEMENTO, porque o conta.css tem
     um `button{width:100%}` que esticava este botão de ponta a ponta da
     tela. Estilo no elemento ganha de qualquer folha da página — o botão
     fica igualzinho nas sete abas.                                        */
  (function botaoDeSuporte() {
    if (document.querySelector('.wl-suporte')) return;
    var email = textos.suporte;
    var zap = String(C.whatsapp || '').replace(/\D+/g, '');
    var destino = zap
      ? 'https://wa.me/' + zap + '?text=' + encodeURIComponent(recadoSuporte)
      : LINK_EMAIL;

    /* o que não dá para escrever no elemento: passar o mouse, foco,
       celular e impressão. Vai com !important para vencer o que está
       escrito no elemento.                                               */
    var css = document.createElement('style');
    css.textContent = [
      '.wl-suporte:hover{background:#17cb68 !important;transform:translateY(-2px) !important;',
      'box-shadow:0 12px 28px rgba(23,203,104,.34) !important}',
      '.wl-suporte:focus-visible{outline:3px solid #17cb68 !important;outline-offset:3px !important}',
      '@media(max-width:700px){.wl-suporte{bottom:84px !important;right:14px !important;',
      'padding:12px 15px !important;font-size:12.5px !important}}',
      '@media print{.wl-suporte{display:none !important}}'
    ].join('');
    document.head.appendChild(css);

    var a = document.createElement('a');
    a.className = 'wl-suporte';
    a.href = destino;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = zap ? 'Falar com o suporte no WhatsApp'
                  : 'Falar com o suporte: ' + email;
    a.setAttribute('aria-label', a.title);
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
      'style="width:17px;height:17px;flex:none;display:block">' +
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4.2-1L3 20l1.2-4.3A8.4 8.4 0 0 1 ' +
      '3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/></svg><span>Suporte</span>';

    /* cada medida escrita no próprio elemento: nenhuma folha da página alcança */
    var medidas = {
      position: 'fixed', right: '20px', bottom: '20px', left: 'auto', top: 'auto',
      zIndex: '60', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: '9px', width: 'auto', minWidth: '0', maxWidth: 'none',
      height: 'auto', minHeight: '0', boxSizing: 'border-box',
      margin: '0', padding: '13px 18px',
      background: '#112b24', color: '#fff', border: '1px solid rgba(255,255,255,.08)',
      borderRadius: '40px', font: '650 13.5px/1 "DM Sans",system-ui,sans-serif',
      letterSpacing: '0', textAlign: 'center', textTransform: 'none',
      textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer', opacity: '1',
      boxShadow: '0 8px 24px rgba(17,43,36,.22)',
      transition: 'background .18s,transform .18s,box-shadow .18s'
    };
    Object.keys(medidas).forEach(function (k) {
      /* !important no próprio elemento: ganha até de folha com !important */
      a.style.setProperty(k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }),
        medidas[k], 'important');
    });
    document.body.appendChild(a);

    /* ---- sai da frente -------------------------------------------------
       O botão é fixo no canto, então em certas rolagens ele para em cima
       de um "Comprar agora" e rouba o clique. Em vez de empurrar a página
       inteira para cima, ele some enquanto estiver sobrepondo qualquer
       botão, e volta sozinho depois. Quem manda é sempre o botão da
       página: o suporte é que cede.                                       */
    var CLICAVEIS = '[data-comprar],.btn,.button,button,input[type=submit]';
    var escondido = false;
    function encosta(r, b, folga) {
      return b.right > r.left - folga && b.left < r.right + folga &&
             b.bottom > r.top - folga && b.top < r.bottom + folga;
    }
    function reposicionar() {
      /* medimos sempre visível: opacidade 0 mantém o elemento no layout,
         então o retângulo continua valendo mesmo escondido.              */
      var r = a.getBoundingClientRect();
      var alvos = document.querySelectorAll(CLICAVEIS);
      var bate = false;
      for (var i = 0; i < alvos.length; i++) {
        var e = alvos[i];
        if (e === a || a.contains(e) || e.contains(a)) continue;
        var b = e.getBoundingClientRect();
        if (!b.width && !b.height) continue;              /* escondido */
        if (b.bottom < 0 || b.top > innerHeight) continue; /* fora da tela */
        /* folga maior para sumir do que para voltar: sem essa diferença, o
           empurrãozinho de 2px do :hover bastaria para ligar e desligar o
           botão em sequência.                                            */
        if (encosta(r, b, escondido ? 6 : 14)) { bate = true; break; }
      }
      if (bate === escondido) return;
      escondido = bate;
      /* só opacidade: mover ou encolher mudaria o próprio retângulo medido
         acima, e o botão entraria em pisca-pisca — some, o retângulo sai de
         baixo do outro, reaparece, colide de novo, e assim sem parar.     */
      a.style.setProperty('opacity', bate ? '0' : '1', 'important');
      a.style.setProperty('pointer-events', bate ? 'none' : 'auto', 'important');
    }
    var pedido = 0;
    function agendar() {
      if (pedido) return;
      pedido = requestAnimationFrame(function () { pedido = 0; reposicionar(); });
    }
    a.style.setProperty('transition',
      'opacity .16s,background .18s,box-shadow .18s', 'important');
    addEventListener('scroll', agendar, { passive: true });
    addEventListener('resize', agendar);
    /* o painel desenha o "Comprar agora" só depois de falar com o servidor */
    new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
    [0, 250, 800, 2000].forEach(function (ms) { setTimeout(agendar, ms); });

    /* se o navegador tiver guardado a versão antiga em cache e ela já tiver
       desenhado o cartão de opções, varre daqui                            */
    document.querySelectorAll('.wl-sup-cx').forEach(function (v) { v.remove(); });

    /* "Esqueci minha senha" e qualquer outro link marcado vão para o mesmo lugar.
       Alguns nascem depois, criados por script da própria página — por isso
       ligamos também tudo o que aparecer no documento daqui pra frente.    */
    function ligar(el) {
      el.setAttribute('href', destino);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
      el.style.cursor = 'pointer';
    }
    var marca = '[data-abrir-suporte],[data-suporte-botao]';
    document.querySelectorAll(marca).forEach(ligar);
    new MutationObserver(function (lista) {
      lista.forEach(function (m) {
        m.addedNodes.forEach(function (no) {
          if (no.nodeType !== 1) return;
          if (no.matches && no.matches(marca)) ligar(no);
          if (no.querySelectorAll) no.querySelectorAll(marca).forEach(ligar);
          /* botões de comprar criados depois também precisam de endereço */
          var cs = (no.matches && no.matches('[data-comprar]')) ? [no]
                 : (no.querySelectorAll ? [].slice.call(no.querySelectorAll('[data-comprar]')) : []);
          cs.forEach(function (a) {
            a.setAttribute('href', destino2);
            if (externo) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
          });
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  })();

  /* ---- a faixa que aparece quando a visita vem da extensão ---- */
  var p = new URLSearchParams(location.search);
  if (p.get('origem') === 'extensao' || p.get('source') === 'extension') {
    var ctx = document.getElementById('context');
    if (ctx) ctx.classList.add('visible');
  }
})();
