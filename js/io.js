/* io.js — entrada/saída: projeto JSON, autosave (localStorage) e exportação SVG/PNG. */
(() => {
  const {state, getNode, fitBtn, AUTOSAVE_KEY, announce, escapeXml, isDiamond} = Fluxo;
  const {autoSizeNode, render, linkPathD, allLinkPathsD, defaultFromSide, defaultToSide, wrapLines, shapeMarkup, setAfterRender} = Fluxo;
  const {showInspector} = Fluxo;

  function getProjectData(){
    return {
      version: 1,
      app: 'Editor de Fluxogramas',
      savedAt: new Date().toISOString(),
      nodes: state.nodes.map(n => ({...n})),
      links: state.links.map(l => ({from:l.from, to:l.to, fromSide:l.fromSide||'bottom', toSide:l.toSide||'top'})),
      nextId: state.nextId
    };
  }

  function applyProjectData(data){
    if(!data || !Array.isArray(data.nodes) || !Array.isArray(data.links)){
      throw new Error('Arquivo de projeto inválido.');
    }

    // Normaliza os IDs para string. Isso é importante porque o DOM entrega
    // data-id/data-link como texto; projetos JSON antigos podem ter IDs numéricos.
    const nodes = data.nodes.map(n => ({
      ...n,
      type: n.type==='enquanto' ? 'condicional' : n.type,
      id:String(n.id),
      x:Number(n.x)||0, y:Number(n.y)||0,
      w:Number(n.w)||100, h:Number(n.h)||60,
      font:Number(n.font)||25, text:String(n.text ?? ''),
      manualPosition:!!n.manualPosition,
    }));

    const hasNode = id => nodes.some(n => n.id === String(id));
    state.nodes = nodes;
    state.links = data.links
      .filter(l => l && hasNode(l.from) && hasNode(l.to))
      .map(l => ({from:String(l.from), to:String(l.to), fromSide:l.fromSide||'bottom', toSide:l.toSide||'top', selected:false}));

    const maxId = state.nodes.reduce((max,n) => {
      const m = String(n.id).match(/^n(\d+)$/);
      return Math.max(max, m ? Number(m[1]) : 0);
    }, 0);

    state.nextId = Math.max(Number(data.nextId)||1, maxId+1);
    state.selectedId = null;
    state.mode = null;
    state.drag = null;
    state.nodes.forEach(autoSizeNode);
    render();
    showInspector();
  }

  function saveProjectToBrowser(){
    try{
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(getProjectData()));
      return true;
    }catch(err){
      console.warn('Falha no salvamento automático:', err);
      return false;
    }
  }

  function saveProjectFile(){
    saveProjectToBrowser();
    const blob = new Blob([JSON.stringify(getProjectData(), null, 2)],
      {type:'application/json;charset=utf-8'});
    downloadBlob(blob, 'fluxograma.json');
    announce('Projeto salvo');
  }

  function openProjectFile(file){
    if(!file)return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        applyProjectData(JSON.parse(reader.result));
        // Centraliza automaticamente o fluxograma recém-aberto no canvas.
        fitBtn.click();
        saveProjectToBrowser();
        announce('Projeto aberto');
      }catch(err){
        console.error(err);
        announce('Não foi possível abrir o projeto');
        alert('O arquivo selecionado não é um projeto válido do editor.');
      }finally{
        document.getElementById('openFile').value = '';
      }
    };
    reader.onerror = () => {
      announce('Erro ao ler o arquivo');
      document.getElementById('openFile').value = '';
    };
    reader.readAsText(file);
  }

  function getExportBounds(){
    if(!state.nodes.length) return {x:0,y:0,w:1400,h:900};
    const pad=50;   // margem entre qualquer elemento (blocos E linhas) e a borda da imagem
    const xs=[], ys=[];
    state.nodes.forEach(n=>{ xs.push(n.x,n.x+n.w); ys.push(n.y,n.y+n.h); });
    allLinkPathsD().forEach(d=>{
      const v=(d.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
      for(let i=0;i+1<v.length;i+=2){ xs.push(v[i]); ys.push(v[i+1]); }
    });
    const minX=Math.min(...xs), minY=Math.min(...ys), maxX=Math.max(...xs), maxY=Math.max(...ys);
    return {
      x:minX-pad, y:minY-pad,
      w:Math.max(100,maxX-minX+pad*2),
      h:Math.max(100,maxY-minY+pad*2)
    };
  }

  function downloadBlob(blob, filename){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function exportSvgFile(){
    const svg=buildSvgExport();
    downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'fluxograma.svg');
    announce('SVG exportado');
  }

  function exportPngFile(){
    const svg=buildSvgExport();
    const b=getExportBounds();
    const scale=2, W=Math.ceil(b.w*scale), H=Math.ceil(b.h*scale);
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    const img=new Image();

    img.onload=()=>{
      const c=document.createElement('canvas');
      c.width=W; c.height=H;
      const ctx=c.getContext('2d');
      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,W,H);
      ctx.drawImage(img,0,0,W,H);
      URL.revokeObjectURL(url);
      c.toBlob(blob=>{
        if(!blob){announce('Não foi possível exportar PNG');return;}
        downloadBlob(blob,'fluxograma.png');
        announce('PNG exportado');
      },'image/png');
    };
    img.onerror=()=>{
      URL.revokeObjectURL(url);
      announce('Não foi possível exportar PNG');
    };
    img.src=url;
  }

  function restoreAutosave(){
    try{
      const raw=localStorage.getItem(AUTOSAVE_KEY);
      if(!raw)return false;
      const data=JSON.parse(raw);
      if(!data || !Array.isArray(data.nodes) || !Array.isArray(data.links)) return false;
      applyProjectData(data);
      announce('Rascunho recuperado automaticamente');
      return true;
    }catch(err){
      console.warn('Falha ao recuperar rascunho:',err);
      return false;
    }
  }

  function buildSvgExport(){
    const b=getExportBounds(), W=Math.ceil(b.w), H=Math.ceil(b.h);
    let out=`<?xml version="1.0" encoding="UTF-8"?>\n`;
    out+=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${b.x} ${b.y} ${W} ${H}">\n`;
    out+=`  <defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#111111"/></marker><style>\n`;
    out+=`    .forma{fill:#eef1f5;stroke:#111111;stroke-width:2.5;}\n`;
    out+=`    .connector-junction{fill:#eef1f5;stroke:#111111;stroke-width:2.5;}\n`;
    out+=`    .texto{font-family:"Times New Roman",Times,serif;fill:#111111;text-anchor:middle;dominant-baseline:middle;}\n`;
    out+=`    .linha{stroke:#111111;stroke-width:2.5;fill:none;marker-end:url(#arrow);}\n`;
    out+=`  </style></defs>\n`;

    const linkPaths=allLinkPathsD();
    state.links.forEach((l,i)=>{
      if(!getNode(l.from)||!getNode(l.to)) return;
      out+=`  <path d="${linkPaths[i]}" class="linha"/>\n`;
    });

    state.nodes.forEach(n=>{
      const lines=wrapLines(n.text,n.type==='entrada'?24:(n.type==='variavel'?14:(isDiamond(n)?12:34)));
      const lineH=n.font*1.12;
      const total=(lines.length-1)*lineH;
      const firstY=n.y+n.h/2-total/2;
      out+=`  <g id="${escapeXml(n.id)}">\n`;
      out+=`    ${shapeMarkup(n)}\n`;
      if(n.type!=='conector'){
        out+=`    <text class="texto" style="font-size:${n.font}px">`;
        out+=lines.map((line,i)=>`<tspan x="${n.x+n.w/2}" y="${firstY+i*lineH}">${escapeXml(line)}</tspan>`).join('');
        out+=`</text>\n`;
        if(n.type==='condicional'){
        }
      }
      out+=`  </g>\n`;
    });

    out+=`</svg>`;
    return out;
  }

  // Botões de Abrir / Salvar / Exportar
  const openFileEl=document.getElementById('openFile');
  const exportMenu=document.getElementById('exportMenu');

  document.getElementById('saveBtn').onclick=saveProjectFile;
  document.getElementById('openBtn').onclick=()=>openFileEl.click();
  openFileEl.addEventListener('change',e=>openProjectFile(e.target.files?.[0]));

  document.getElementById('exportBtn').onclick=e=>{
    e.stopPropagation();
    exportMenu.hidden=!exportMenu.hidden;
  };
  document.getElementById('exportSvgBtn').onclick=()=>{
    exportMenu.hidden=true; exportSvgFile();
  };
  document.getElementById('exportPngBtn').onclick=()=>{
    exportMenu.hidden=true; exportPngFile();
  };
  document.addEventListener('click',e=>{
    if(!e.target.closest('.export-menu')) exportMenu.hidden=true;
  });

  // Autosave: agenda um salvamento no navegador após cada render().
  const saveStateEl=document.getElementById('saveState');
  const undoBtn=document.getElementById('undoBtn'), redoBtn=document.getElementById('redoBtn');
  let autosaveTimer=null, historyTimer=null;

  // Histórico: guarda um instantâneo do desenho a cada pausa de edição.
  const hist={undo:[],redo:[],last:null,busy:false};
  const snapshot=()=>JSON.stringify({nodes:state.nodes,links:state.links.map(l=>({from:l.from,to:l.to,fromSide:l.fromSide||'bottom',toSide:l.toSide||'top'}))});
  function updateHistoryButtons(){ undoBtn.disabled=!hist.undo.length; redoBtn.disabled=!hist.redo.length; }
  function recordHistory(){
    if(hist.busy) return;
    const cur=snapshot();
    if(hist.last===null){ hist.last=cur; return; }
    if(cur===hist.last) return;
    hist.undo.push(hist.last); if(hist.undo.length>100) hist.undo.shift();
    hist.redo=[]; hist.last=cur; updateHistoryButtons();
  }
  function restoreSnapshot(json){
    hist.busy=true;
    try{ const d=JSON.parse(json); applyProjectData({nodes:d.nodes,links:d.links,nextId:state.nextId}); }
    finally{ hist.busy=false; }
    hist.last=json; updateHistoryButtons();
  }
  function undo(){
    clearTimeout(historyTimer); recordHistory();
    if(!hist.undo.length) return;
    hist.redo.push(hist.last); restoreSnapshot(hist.undo.pop()); announce('Desfeito');
  }
  function redo(){
    clearTimeout(historyTimer); recordHistory();
    if(!hist.redo.length) return;
    hist.undo.push(hist.last); restoreSnapshot(hist.redo.pop()); announce('Refeito');
  }
  undoBtn.onclick=undo; redoBtn.onclick=redo;
  document.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey)) return;
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
    const k=e.key.toLowerCase();
    if(k==='z' && !e.shiftKey){ e.preventDefault(); undo(); }
    else if(k==='y' || (k==='z' && e.shiftKey)){ e.preventDefault(); redo(); }
  });

  function scheduleAutosave(){
    clearTimeout(autosaveTimer); clearTimeout(historyTimer);
    if(saveStateEl) saveStateEl.textContent='Salvando…';
    autosaveTimer=setTimeout(()=>{
      const ok=saveProjectToBrowser();
      if(saveStateEl) saveStateEl.textContent= ok ? 'Rascunho salvo' : 'Não foi possível salvar o rascunho';
    },350);
    historyTimer=setTimeout(recordHistory,400);
  }
  setAfterRender(scheduleAutosave);

  Object.assign(Fluxo, {
    getProjectData,
    applyProjectData,
    saveProjectToBrowser,
    saveProjectFile,
    openProjectFile,
    getExportBounds,
    downloadBlob,
    exportSvgFile,
    exportPngFile,
    restoreAutosave,
    buildSvgExport
  });
})();
