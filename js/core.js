/* core.js — estado global do editor, constantes e utilitários sem dependências.
   Cria o namespace window.Fluxo, que os demais módulos usam para se encontrar. */
window.Fluxo = window.Fluxo || {};
(() => {
  const canvas = document.getElementById('canvas');
  const nodesLayer = document.getElementById('nodes');
  const linksLayer = document.getElementById('links');
  const inspector = document.getElementById('inspectorContent');
  const statusEl = document.getElementById('status');
  const statsEl = document.getElementById('stats');
  const marquee = document.getElementById('marquee');
  const fitBtn = document.getElementById('fitBtn');

  const state = {
    nodes: [],
    links: [],
    selectedId: null,
    nextId: 1,
    mode: null,
    drag: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    viewport: {w:1400,h:900},
    pan: null,
    clickTrack: {id:null,time:0,x:0,y:0},
    executionId: null
  };

  const defaults = {
    inicio:   {w:150,h:58,text:'Inicio',font:25},
    entrada:  {w:299,h:78,text:'"Digite a informação:"',font:25},
    variavel: {w:91,h:60,text:'P1',font:27},
    processo: {w:370,h:65,text:'Processo',font:25},
    condicional: {w:190,h:120,text:'Condição',font:25},
    conector: {w:40,h:40,text:'',font:20}
  };

  // Blocos em losango: Condicional (se/senão) e Enquanto (laço).
  const isDiamond = n => !!n && n.type==='condicional';

  // O Condicional (losango) assume o papel conforme as saídas ligadas:
  //  N) condicional normal: V à direita, F à esquerda (com Conector de junção)
  //  A) laço com teste no topo: V embaixo, F à direita, retorno pela esquerda
  //  B) laço com teste embaixo (Conector em cima): V à esquerda (volta ao Conector), F embaixo
  function condMode(n){
    if(!n || n.type!=='condicional') return 'N';
    const sides=state.links.filter(l=>l.from===n.id).map(l=>l.fromSide||'bottom');
    if(!sides.includes('bottom')) return 'N';
    return sides.includes('left') ? 'B' : 'A';
  }

  function uid(){ return 'n' + (state.nextId++); }

  function announce(text){
    statusEl.textContent = text;
    statusEl.classList.add('show');
    clearTimeout(announce._t);
    announce._t = setTimeout(() => statusEl.classList.remove('show'), 2200);
  }

  function escapeXml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }

  function pointFromEvent(ev){
    const pt = canvas.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    return pt.matrixTransform(canvas.getScreenCTM().inverse());
  }

  function snap(v){ return Math.round(v/5)*5; }

  function getNode(id){ return state.nodes.find(n => n.id === id); }

  // Chave do rascunho no localStorage (usada pelo módulo de I/O e pelo botão "Novo").
  const AUTOSAVE_KEY = 'editor_fluxograma_svg_autosave_v1';

  Object.assign(Fluxo, {
    canvas, nodesLayer, linksLayer, inspector, statusEl, statsEl, marquee, fitBtn,
    state, defaults, isDiamond, condMode, uid, announce, escapeXml,
    pointFromEvent, snap, getNode, AUTOSAVE_KEY
  });
})();
