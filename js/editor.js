/* editor.js — interação com o canvas (arrastar, conectar, pan/zoom), inspetor de propriedades e paleta. */
(() => {
  const {canvas, inspector, state, defaults, uid, announce, escapeXml, pointFromEvent, snap, getNode, isDiamond, AUTOSAVE_KEY} = Fluxo;
  const {autoSizeNode, renderTempConnection, defaultFromSide, defaultToSide, render} = Fluxo;

  function addNode(type, x=300, y=120){
    const d = defaults[type];
    const n = {
      id: uid(), type, x:snap(x), y:snap(y),
      w:d.w,h:d.h,text:d.text,font:d.font,
      manualPosition:false,
    };
    autoSizeNode(n);
    state.nodes.push(n);
    state.selectedId = n.id;
    render();
    showInspector();
    announce('Bloco adicionado');
  }

  // Exemplos e dicas por tipo de bloco, na linguagem que o interpretador entende.
  const TEXT_HINTS={
    inicio:{ph:'Início',tip:'Use "Início" no começo e "Fim" no final do fluxograma.'},
    entrada:{ph:'"Resultado: ", soma',tip:'Textos entre aspas e variáveis, separados por vírgula. Ex.: "Resultado: ", soma'},
    variavel:{ph:'A',tip:'Nome da variável que recebe o valor digitado. Ela é criada na hora se ainda não existir. Ex.: idade'},
    processo:{ph:'soma = 0',tip:'Crie a variável já com valor: "soma = 0". Várias de uma vez: "A = 1, B = 2". Só declarar, sem valor: "A, B". Use uma linha por instrução.'},
    condicional:{ph:'idade >= 18',tip:'Uma condição com resultado verdadeiro ou falso. Ex.: nota >= 7'}
  };

  // O Condicional muda de papel conforme as saídas ligadas (ver condMode em core.js).
  const COND_TIPS={
    N:'<b>Decisão (se/senão):</b> <b>V</b> sai pela direita e <b>F</b> pela esquerda. Una os dois caminhos com um Conector. Para virar um laço, ligue a saída de baixo.',
    A:'<b>Laço com teste no topo (enquanto):</b> <b>V</b> sai por baixo e repete o corpo; <b>F</b> sai pela direita. O fim do corpo volta à bolinha da esquerda deste bloco.',
    B:'<b>Laço com teste embaixo (repita até):</b> um Conector fica acima do corpo; <b>V</b> sai pela esquerda e volta ao Conector, <b>F</b> sai por baixo.'
  };

  // Operadores aceitos pelo interpretador, mostrados como botões que inserem no texto.
  const OP={
    soma:{s:'+',m:'soma',ins:' + '}, sub:{s:'-',m:'subtração',ins:' - '}, mul:{s:'*',m:'multiplicação',ins:' * '},
    div:{s:'/',m:'divisão',ins:' / '}, mod:{s:'%',m:'resto da divisão',ins:' % '}, pot:{s:'^',m:'potência',ins:' ^ '},
    par:{s:'( )',m:'agrupa contas',ins:'()',back:1},
    eq:{s:'==',m:'igual a',ins:' == '}, ne:{s:'!=',m:'diferente de',ins:' != '}, gt:{s:'>',m:'maior que',ins:' > '},
    lt:{s:'<',m:'menor que',ins:' < '}, ge:{s:'>=',m:'maior ou igual a',ins:' >= '}, le:{s:'<=',m:'menor ou igual a',ins:' <= '},
    e:{s:'&&',m:'E: as duas valem',ins:' && '}, ou:{s:'||',m:'OU: uma delas vale',ins:' || '}, nao:{s:'!',m:'NÃO: inverte',ins:'!'},
    atr:{s:'=',m:'recebe valor',ins:' = '}, vir:{s:',',m:'separa itens',ins:', '}, nl:{s:'↵',m:'nova instrução',ins:'\n'},
    txt:{s:'" "',m:'texto fixo',ins:'""',back:1}
  };
  const CALC=['soma','sub','mul','div','mod','pot','par'];
  const OP_GROUPS={
    processo:[['Criar e atribuir',['atr','vir','nl']],['Cálculos',CALC]],
    entrada:[['Montar a mensagem',['txt','vir']],['Cálculos',CALC]],
    condicional:[['Comparar',['eq','ne','gt','lt','ge','le']],['Combinar condições',['e','ou','nao']],['Texto e cálculos',['txt','mod','par']]]
  };
  function opsPanel(type){
    const groups=OP_GROUPS[type];
    if(!groups) return {html:'',flat:[]};
    const flat=[];
    const body=groups.map(([title,keys])=>`<div class="ops-title">${title}</div><div class="ops-grid">${keys.map(k=>{
      const o=OP[k]; flat.push(o);
      return `<button type="button" class="op" data-k="${flat.length-1}" title="Inserir ${escapeXml(o.s)}"><b>${escapeXml(o.s)}</b><span>${o.m}</span></button>`;
    }).join('')}</div>`).join('');
    const note=type==='condicional' ? '<div class="tiny">O sinal = sozinho também vale como "igual a". Use true e false como valores lógicos.</div>' : '';
    return {flat, html:`<details class="ops" open><summary>Operadores disponíveis</summary><div class="tiny">Clique para inserir no texto.</div>${body}${note}</details>`};
  }
  function insertAtCursor(ta,text,back){
    const s=ta.selectionStart, e=ta.selectionEnd;
    ta.value=ta.value.slice(0,s)+text+ta.value.slice(e);
    const pos=s+text.length-back;
    ta.focus(); ta.setSelectionRange(pos,pos);
    ta.dispatchEvent(new Event('input',{bubbles:true}));
  }

  // Dica contextual no topo do canvas: diz o próximo passo possível.
  function updateHint(){
    const el=document.getElementById('hint'); if(!el) return;
    const n=getNode(state.selectedId);
    el.textContent = state.links.some(l=>l.selected) ? 'Linha selecionada. Tecle Delete para remover.'
      : n ? (n.type==='conector' ? 'Arraste a bolinha de baixo para continuar o fluxo.' : 'Arraste a bolinha azul até outro bloco para conectar. Dois cliques editam o texto.')
      : (state.nodes.length ? 'Clique em um bloco para selecioná-lo. Arraste o fundo para navegar.' : '');
  }

  function showInspector(){
    const n=getNode(state.selectedId);
    updateHint();
    const H0=(n && TEXT_HINTS[n.type]) || {ph:'',tip:''};
    const H=(n && n.type==='condicional') ? {ph:H0.ph,tip:COND_TIPS[Fluxo.condMode(n)]} : H0;
    if(!n){
      inspector.innerHTML = '<div class="empty">Clique em um bloco para editar o texto e o tipo. Dois cliques no bloco também levam direto ao texto.</div>';
      return;
    }
    const ops=opsPanel(n.type);
    inspector.innerHTML = `
      <label>Tipo</label>
      <select id="pType">
        <option value="inicio"${n.type==='inicio'?' selected':''}>Início / Fim</option>
        <option value="entrada"${n.type==='entrada'?' selected':''}>Exibir na tela</option>
        <option value="variavel"${n.type==='variavel'?' selected':''}>Entrada de dados</option>
        <option value="processo"${n.type==='processo'?' selected':''}>Processo</option>
        <option value="condicional"${n.type==='condicional'?' selected':''}>Condicional</option>
        <option value="conector"${n.type==='conector'?' selected':''}>Conector</option>
              </select>

      ${n.type==='conector' ? '<div class="tiny">Bolinha de junção: receba os caminhos pelo topo e pelas laterais (inclusive o retorno de um laço Enquanto) e continue o fluxo pela parte inferior.</div>' : `<label>Texto da função</label><textarea id="pText" placeholder="${escapeXml(H.ph)}">${escapeXml(n.text)}</textarea><div class="tiny">${H.tip}</div>${ops.html}`}


      <div class="actions">
        <button id="duplicateBtn">Duplicar</button>
        <button id="removeBtn" class="danger">Excluir</button>
      </div>
      <div class="tiny">Dê dois cliques no bloco para editar o texto. O tamanho da forma é calculado automaticamente.</div>
    `;

    const typeField = document.getElementById('pType');
    const textField = document.getElementById('pText');
    inspector.querySelectorAll('.op').forEach(b=>b.onclick=()=>{
      const o=ops.flat[Number(b.dataset.k)];
      if(o && textField) insertAtCursor(textField,o.ins,o.back||0);
    });
    if(textField) textField.addEventListener('input', ()=>{
      const cur=getNode(state.selectedId);
      if(!cur)return;
      cur.text=textField.value;
      autoSizeNode(cur);
      render();
    });


    typeField.addEventListener('change', ()=>{
      const cur=getNode(state.selectedId);
      if(!cur)return;
      cur.type = typeField.value;
      if(isDiamond(cur)){
        if(!cur.text) cur.text='Condição';
      }
      if(cur.type==='conector') cur.text='';
      autoSizeNode(cur);
      render();
      showInspector();
      setTimeout(()=>{
        const field=document.getElementById('pText');
        if(field){ field.focus(); field.setSelectionRange(field.value.length, field.value.length); }
      },0);
    });

    document.getElementById('removeBtn').onclick=removeSelected;
    document.getElementById('duplicateBtn').onclick=()=>{
      const original=getNode(state.selectedId);
      if(!original)return;
      const copy={...original,id:uid(),x:original.x+40,y:original.y+40};
      autoSizeNode(copy);
      state.nodes.push(copy); state.selectedId=copy.id; render(); showInspector();
    };
  }

  function removeSelected(){
    if(state.links.some(l=>l.selected)){
      const count=state.links.filter(l=>l.selected).length;
      state.links=state.links.filter(l=>!l.selected);
      state.selectedId=null;
      render();
      showInspector();
      announce(count===1 ? 'Linha removida' : `${count} linhas removidas`);
      return;
    }

    if(!state.selectedId)return;
    const id=state.selectedId;
    state.nodes=state.nodes.filter(n=>n.id!==id);
    state.links=state.links.filter(l=>l.from!==id && l.to!==id);
    state.selectedId=null;
    render();
    showInspector();
    announce('Bloco removido');
  }


  function focusNodeText(id){
    state.selectedId = id;
    state.links.forEach(l=>l.selected=false);
    render();
    showInspector();

    requestAnimationFrame(()=>{
      const field = document.getElementById('pText');
      if(field){
        field.focus({preventScroll:true});
        field.select();
      }
    });
  }

  function selectNode(id){
    state.selectedId=id;
    state.links.forEach(l=>l.selected=false);
    render(); showInspector();
  }

  canvas.addEventListener('pointerdown', e=>{
    const nodeEl=e.target.closest('.node');
    const handle=e.target.closest('.handle');
    const linkEl=e.target.closest('.connector, .connector-hit');

    if(linkEl){
      const index=Number(linkEl.dataset.link);
      if(Number.isInteger(index) && state.links[index]){
        state.selectedId=null;
        state.links.forEach((l,i)=>l.selected=(i===index));
        state.mode=null;
        state.drag=null;
        render();
        showInspector();
        announce('Linha selecionada — pressione Delete para remover');
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if(nodeEl){
      const id=nodeEl.dataset.id;
      const n=getNode(id);
      if(handle){
        const side=handle.dataset.side || defaultFromSide(n);

        // O Conector só pode iniciar uma conexão pela saída inferior.
        // As laterais continuam sendo pontos de chegada para os dois ramos.
        // O destino pode ser qualquer bloco que aceite uma entrada, inclusive
        // Entrada de dados (variavel) e Exibir na tela (entrada).
        if(n.type==='conector' && side!=='bottom'){
          state.selectedId=id;
          state.mode=null;
          state.drag=null;
          state.links.forEach(l=>l.selected=false);
          render();
          showInspector();
          announce('As laterais do Conector são entradas. Use a bolinha inferior para continuar o fluxo.');
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if(n.type==='condicional' && side==='top'){
          state.selectedId=id; state.mode=null; state.drag=null;
          state.links.forEach(l=>l.selected=false);
          render(); showInspector();
          announce('No Condicional, o topo é a entrada. As saídas V/F ficam nos outros lados.');
          e.preventDefault(); e.stopPropagation();
          return;
        }

        // O handle inicia uma conexão e não precisa reconstruir o DOM antes do arrasto.
        state.selectedId=id;
        state.mode='connect';
        state.drag={startNode:id,fromSide:side};
        canvas.classList.add('connecting');
        render();
        showInspector();
      }else{
        selectNode(id);
        state.mode='move';
        const p=pointFromEvent(e);
        state.drag={id,dx:p.x-n.x,dy:p.y-n.y};
      }
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    if(e.target.closest('.connector')) return;

    state.selectedId=null;
    render(); showInspector();
  });

  canvas.addEventListener('pointermove', e=>{
    if(!state.drag)return;
    const p=pointFromEvent(e);

    if(state.mode==='move'){
      const n=getNode(state.drag.id);
      if(!n)return;
      n.x=snap(p.x-state.drag.dx);
      n.y=snap(p.y-state.drag.dy);
      render();
    }
    if(state.mode==='connect'){
      renderTempConnection(p);
    }
  });

  canvas.addEventListener('pointerup', e=>{
    if(!state.drag){return}

    const dragMode = state.mode;
    const dragId = state.drag.id || state.drag.startNode;

    if(dragMode==='connect'){
      // O elemento sob o ponteiro pode não ser e.target, porque o SVG
      // é redesenhado enquanto a conexão é arrastada. Fazemos hit-test
      // pela posição real do mouse.
      // Durante o arrasto o SVG pode ser redesenhado e o elemento sob o
      // ponteiro nem sempre aparece em elementsFromPoint(). Para tornar a
      // conexão robusta (especialmente Conector -> função), fazemos também
      // um hit-test geométrico usando a posição real do ponteiro no SVG.
      const pointer = pointFromEvent(e);
      const under = document.elementsFromPoint(e.clientX, e.clientY)
        .map(el => el.closest?.('.node'))
        .find(Boolean);

      const from = state.drag.startNode;
      const fromNode = getNode(from);
      let to = under?.dataset?.id || null;

      if(!to){
        const hitPadding = 14;
        const hit = state.nodes.find(n => {
          if(n.id===from) return false;
          return pointer.x >= n.x-hitPadding && pointer.x <= n.x+n.w+hitPadding &&
                 pointer.y >= n.y-hitPadding && pointer.y <= n.y+n.h+hitPadding;
        });
        to = hit?.id || null;
      }

      const toNode = to ? getNode(to) : null;
      let toSide = defaultToSide(toNode);

      // Conector recebe pelas laterais; os demais blocos recebem pelo topo.
      if(toNode?.type==='conector'){
        const tcx=toNode.x+toNode.w/2, tcy=toNode.y+toNode.h/2;
        const fcx=fromNode.x+fromNode.w/2, fcy=fromNode.y+fromNode.h/2;
        if(fcy>tcy+20) toSide='left';                      // retorno de um laço (vem de baixo)
        else if(Math.abs(fcx-tcx)<=24) toSide='top';       // vem direto de cima
        else toSide = pointer.x < tcx ? 'left' : 'right';  // junção dos dois ramos do Condicional
      }

      const fromSide=state.drag.fromSide || defaultFromSide(fromNode);

      // Condicional: quem vem de baixo (fim de um laço) entra pela esquerda; quem vem de cima, pelo topo.
      if(toNode?.type==='condicional' && fromNode){
        toSide = (fromNode.y+fromNode.h/2) > (toNode.y+toNode.h/2) ? 'left' : 'top';
      }

      if(to && from !== to && !state.links.some(l=>
        l.from===from && l.to===to &&
        (l.fromSide||'bottom')===fromSide && (l.toSide||'top')===toSide
      )){
        state.links.push({from,to,fromSide,toSide});
        announce('Conexão criada');
        showInspector();   // atualiza a explicação do Condicional (decisão ou laço)
      } else if(!to){
        announce('Solte sobre outro bloco para conectar');
      }
    }

    // Detecta duplo clique independentemente do DOM ter sido redesenhado.
    if(dragMode==='move' && dragId){
      const now = performance.now();
      const last = state.clickTrack;
      const elapsed = now-last.time;
      const dx = Math.abs(e.clientX-last.x);
      const dy = Math.abs(e.clientY-last.y);

      if(last.id===dragId && elapsed < 400 && dx < 8 && dy < 8){
        focusNodeText(dragId);
        state.clickTrack = {id:null,time:0,x:0,y:0};
      }else{
        state.clickTrack = {id:dragId,time:now,x:e.clientX,y:e.clientY};
      }
    }

    state.mode=null;
    state.drag=null;
    canvas.classList.remove('connecting');
    render();
    renderTempConnection(null);
  });



  // Navegação pelo quadro:
  // botão esquerdo arrasta o canvas quando o clique é feito em área vazia.
  // Em cima de um bloco, o botão esquerdo continua movendo o bloco.
  canvas.addEventListener('pointerdown', e=>{
    const onNode = !!e.target.closest('.node');
    const onLink = !!e.target.closest('.connector, .connector-hit');

    // Apenas área vazia inicia pan.
    if(e.button === 0 && !onNode && !onLink){
      state.pan = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startViewBox: canvas.getAttribute('viewBox').split(/\s+/).map(Number)
      };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    // Botão do meio continua disponível como alternativa para pan.
    if(e.button === 1){
      state.pan = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startViewBox: canvas.getAttribute('viewBox').split(/\s+/).map(Number)
      };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }, true);

  canvas.addEventListener('pointermove', e=>{
    if(!state.pan) return;

    const vb = state.pan.startViewBox;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - state.pan.startClientX) * vb[2] / rect.width;
    const dy = (e.clientY - state.pan.startClientY) * vb[3] / rect.height;

    canvas.setAttribute('viewBox', `${vb[0]-dx} ${vb[1]-dy} ${vb[2]} ${vb[3]}`);
  }, true);

  function stopPan(e){
    if(!state.pan) return;
    state.pan = null;
    canvas.releasePointerCapture?.(e.pointerId);
    canvas.style.cursor = '';
  }

  canvas.addEventListener('pointerup', stopPan, true);
  canvas.addEventListener('pointercancel', stopPan, true);

  // Zoom com a roda do mouse, centrado no ponto sob o cursor.
  canvas.addEventListener('wheel', e=>{
    e.preventDefault();

    const p = pointFromEvent(e);
    const vb = canvas.viewBox.baseVal;
    const factor = e.deltaY > 0 ? 1.10 : 0.90;

    const newW = Math.min(4000, Math.max(250, vb.width * factor));
    const newH = Math.min(3000, Math.max(170, vb.height * factor));

    const rx = (p.x - vb.x) / vb.width;
    const ry = (p.y - vb.y) / vb.height;

    const newX = p.x - rx * newW;
    const newY = p.y - ry * newH;

    canvas.setAttribute('viewBox', `${newX} ${newY} ${newW} ${newH}`);
  }, {passive:false});

  // Duplo clique robusto: identifica o bloco pela posição do mouse e
  // foca diretamente o campo de texto, mesmo que o SVG tenha sido redesenhado.
  canvas.addEventListener('dblclick', e=>{
    const under = document.elementsFromPoint(e.clientX, e.clientY)
      .map(el=>el.closest?.('.node'))
      .find(Boolean);

    if(!under) return;

    focusNodeText(under.dataset.id);
    e.preventDefault();
    e.stopPropagation();
  }, true);

  document.addEventListener('keydown', e=>{
    if(e.key==='Delete' || e.key==='Backspace'){
      const active=document.activeElement;
      if(active && ['INPUT','TEXTAREA','SELECT'].includes(active.tagName))return;
      removeSelected();
    }
    if(e.key==='Escape'){
      state.mode=null;state.drag=null;
    }
  });

  document.querySelectorAll('.palette button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const rect=canvas.getBoundingClientRect();
      const x=canvas.viewBox.baseVal.x + canvas.viewBox.baseVal.width/2 - defaults[btn.dataset.type].w/2;
      const y=canvas.viewBox.baseVal.y + canvas.viewBox.baseVal.height/2 - defaults[btn.dataset.type].h/2;
      addNode(btn.dataset.type,x,y);
    });
  });

  document.getElementById('newBtn').onclick=()=>{
    if(!confirm('Criar um novo fluxograma? O rascunho atual será substituído.')) return;
    state.nodes=[];state.links=[];state.selectedId=null;state.nextId=1;
    localStorage.removeItem(AUTOSAVE_KEY);
    render();showInspector();announce('Canvas limpo');
  };

  document.getElementById('fitBtn').onclick=()=>{
    if(!state.nodes.length){
      canvas.setAttribute('viewBox','0 0 1400 900');
      return;
    }
    const pad = 100;
    const minX = Math.min(...state.nodes.map(n=>n.x)) - pad;
    const minY = Math.min(...state.nodes.map(n=>n.y)) - pad;
    const maxX = Math.max(...state.nodes.map(n=>n.x+n.w)) + pad;
    const maxY = Math.max(...state.nodes.map(n=>n.y+n.h)) + pad;
    canvas.setAttribute('viewBox', `${minX} ${minY} ${Math.max(300,maxX-minX)} ${Math.max(200,maxY-minY)}`);
    render();
  };

  // Menu de contexto do botão direito desativado sobre o canvas.
  // (Antes ficava num <script> solto depois do </html>.)
  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
  });

  // Zoom pelos botões (a roda do mouse continua funcionando) e atalho do estado vazio.
  function zoomBy(f){
    const vb=canvas.viewBox.baseVal, cx=vb.x+vb.width/2, cy=vb.y+vb.height/2;
    const w=Math.min(4000,Math.max(250,vb.width*f)), h=Math.min(3000,Math.max(170,vb.height*f));
    canvas.setAttribute('viewBox',`${cx-w/2} ${cy-h/2} ${w} ${h}`);
  }
  document.getElementById('zoomInBtn').onclick=()=>zoomBy(0.8);
  document.getElementById('zoomOutBtn').onclick=()=>zoomBy(1.25);
  document.getElementById('emptyStartBtn').onclick=()=>document.querySelector('.palette [data-type="inicio"]').click();

  // Tema: começa escuro; o botão alterna para o claro e a escolha fica lembrada.
  const themeBtn=document.getElementById('themeBtn'), THEME_KEY='editor_fluxograma_theme';
  function applyTheme(t){
    document.body.dataset.theme=t;
    themeBtn.setAttribute('aria-pressed', String(t==='dark'));
    themeBtn.title = t==='dark' ? 'Voltar ao tema claro' : 'Ativar tema escuro';
  }
  let savedTheme='dark';
  try{ if(localStorage.getItem(THEME_KEY)==='light') savedTheme='light'; }catch(_){}
  applyTheme(savedTheme);
  themeBtn.onclick=()=>{
    const t=document.body.dataset.theme==='dark' ? 'light' : 'dark';
    applyTheme(t);
    try{ localStorage.setItem(THEME_KEY,t); }catch(_){}
  };

  Object.assign(Fluxo, {
    addNode,
    showInspector,
    removeSelected,
    focusNodeText,
    selectNode
  });
})();
