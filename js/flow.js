/* flow.js — leitura do grafo (conexões/saídas) e utilitários de parsing compartilhados por validação e interpretador. */
(() => {
  const {state, isDiamond} = Fluxo;

  // Grafo do fluxograma: saídas de cada bloco, papel das saídas do Condicional etc.
  function runFindStart(){
    return state.nodes.find(n=>n.type==='inicio' && String(n.text).trim().toLowerCase()!=='fim')
      || state.nodes.find(n=>n.type==='inicio');
  }

  function runOutgoing(nodeId){
    return state.links
      .map((l,i)=>({l,i}))
      .filter(({l})=>l.from===nodeId)
      .sort(({l:a},{l:b})=>{
        const order={top:0,left:1,right:2,bottom:3};
        return (order[a.fromSide||'bottom']??9)-(order[b.fromSide||'bottom']??9);
      });
  }

  // Saídas do Condicional conforme a montagem (ver condMode):
  //  N) V à direita, F à esquerda;  A) V embaixo, F à direita;  B) V à esquerda, F embaixo.
  function runCondOutputs(outs){
    const side=o=>o.l.fromSide||'bottom';
    const hasL=outs.some(o=>side(o)==='left');
    const hasR=outs.some(o=>side(o)==='right');
    const hasB=outs.some(o=>side(o)==='bottom');
    const mode = !hasB ? 'N' : (hasL ? 'B' : 'A');
    const vSide = mode==='A' ? 'bottom' : (mode==='B' ? 'left' : 'right');
    const fSide = mode==='A' ? 'right'  : (mode==='B' ? 'bottom' : 'left');
    return {
      mode,
      v:outs.filter(o=>side(o)===vSide),
      f:outs.filter(o=>side(o)===fSide),
      invalid: outs.some(o=>side(o)==='top') || (hasB && hasL && hasR)
    };
  }

  function runBranchLink(node){
    const outs=runOutgoing(node.id);
    if(!isDiamond(node)) return outs[0]?.l || null;
    const lo=runCondOutputs(outs);
    return {right:lo.v[0]?.l, left:lo.f[0]?.l};   // right = V (verdadeiro), left = F (falso)
  }

  function runSplitTopLevel(text, delimiter=','){
    const parts=[]; let current=''; let quote=null; let depth=0;
    for(let i=0;i<String(text).length;i++){
      const ch=String(text)[i];
      if(quote){
        current+=ch;
        if(ch===quote && String(text)[i-1]!=='\\') quote=null;
        continue;
      }
      if(ch==='"' || ch==="'"){quote=ch; current+=ch; continue;}
      if(ch==='(' || ch==='[') depth++;
      else if(ch===')' || ch===']') depth--;
      if(ch===delimiter && depth===0){parts.push(current.trim()); current='';}
      else current+=ch;
    }
    if(current.trim() || parts.length) parts.push(current.trim());
    return parts;
  }

  // Utilitários de linguagem usados pela validação e pelo interpretador.
  const RUN_RESERVED_LITERALS = new Set(['true','false']);

  function runIsIdentifier(name){
    return /^[A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*$/.test(String(name));
  }

  Object.assign(Fluxo, {
    runFindStart,
    runOutgoing,
    runCondOutputs,
    runBranchLink,
    runSplitTopLevel,
    RUN_RESERVED_LITERALS,
    runIsIdentifier
  });
})();
