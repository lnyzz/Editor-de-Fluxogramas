/* render.js — geometria e desenho dos blocos/conexões no SVG (autoSizeNode, shapeMarkup, linkPathD, render). */
(() => {
  const {nodesLayer, linksLayer, statsEl, state, isDiamond, condMode, getNode, escapeXml} = Fluxo;

  // Gancho chamado ao final de cada render() (o módulo de I/O o usa para agendar o autosave).
  let afterRender = null;
  function setAfterRender(fn){ afterRender = fn; }

  function wrapLines(text, maxChars){
    const clean = String(text || '').replace(/\r/g,'').trim();
    if(!clean) return [''];

    // Quebra por palavras, preservando linhas manuais.
    const paragraphs = clean.split('\n');
    const lines = [];
    paragraphs.forEach(paragraph=>{
      const words = paragraph.split(/\s+/).filter(Boolean);
      if(!words.length){ lines.push(''); return; }
      let line = '';
      words.forEach(word=>{
        const candidate = line ? line + ' ' + word : word;
        if(candidate.length > maxChars && line){
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if(line) lines.push(line);
    });
    return lines.length ? lines : [''];
  }

  function measureTextWidth(text, font){
    // Aproximação tipográfica para Times New Roman, mantendo a geometria do SVG.
    // O desenho da forma é o da referência; somente a escala cresce com o conteúdo.
    const chars = String(text || '').length;
    const avg = font * 0.50;
    return chars * avg;
  }

  function autoSizeNode(n){
    const font = n.font || (n.type==='variavel' ? 27 : 25);

    if(n.type==='inicio'){
      // Exatamente a proporção da referência: 150 × 58, rx=29.
      n.w = Math.max(150, measureTextWidth(n.text, font) + 36);
      n.h = 58;
      n.rx = n.h/2;
      return;
    }

    if(n.type==='variavel'){
      // A referência usa 91 × 60 e a mesma inclinação de 20px.
      const lines = wrapLines(n.text, 12);
      const maxW = Math.max(...lines.map(l=>measureTextWidth(l,font)), font);
      // Mais espaço interno para a Entrada de dados, especialmente na exportação.
      // A forma mantém a mesma aparência, mas o texto fica mais afastado das bordas.
      n.w = Math.max(125, maxW + 58);
      n.h = Math.max(72, lines.length * font * 1.18 + 30);
      return;
    }

    if(n.type==='entrada'){
      const lines = wrapLines(n.text, 25);
      const maxW = Math.max(...lines.map(l=>measureTextWidth(l,font)), font);
      // A referência usa 299 × 78; mantém as pontas e a curva, escalando uniformemente.
      n.w = Math.max(299, maxW + 86);
      n.h = Math.max(78, lines.length * font * 1.18 + 26);
      return;
    }

    if(isDiamond(n)){
      const lines = wrapLines(n.text, 12);
      const maxW = Math.max(...lines.map(l=>measureTextWidth(l,font)), font);
      n.w = Math.max(190, maxW + 70);
      n.h = Math.max(120, lines.length * font * 1.18 + 50);
      return;
    }

    if(n.type==='conector'){
      n.w = 40; n.h = 40; n.text = '';
      return;
    }

    // Processo / declaração / cálculo: retângulo da mesma linguagem visual.
    const lines = wrapLines(n.text, 34);
    const maxW = Math.max(...lines.map(l=>measureTextWidth(l,font)), font);
    n.w = Math.max(220, maxW + 46);
    n.h = Math.max(58, lines.length * font * 1.18 + 22);
  }

  function shapeMarkup(n){
    const cx = n.x + n.w/2;
    const cy = n.y + n.h/2;
    const common = `class="forma"`;

    if(n.type==='inicio'){
      return `<rect x="${n.x}" y="${n.y}"
        width="${n.w}" height="58" rx="29" ${common}/>`;
    }

    if(n.type==='entrada'){
      // Forma fiel ao path da referência:
      // ponta inclinada à esquerda + lado direito com duas curvas simétricas.
      const x = n.x, y = n.y, w = n.w, h = n.h;
      const baseW = 299, baseH = 78;
      const sx = w / baseW;
      const sy = h / baseH;

      // Coordenadas locais reproduzidas a partir de:
      // M300 274 C300 269 303 265 308 261 L340 238 ...
      const X = v => x + (v - 300) * sx;
      const Y = v => y + (v - 235) * sy;

      return `<path d="
        M ${X(300)} ${Y(274)}
        L ${X(340)} ${Y(238)}
        C ${X(344)} ${Y(235)} ${X(349)} ${Y(235)} ${X(354)} ${Y(235)}
        L ${X(542)} ${Y(235)}
        C ${X(567)} ${Y(235)} ${X(584)} ${Y(251)} ${X(584)} ${Y(274)}
        C ${X(584)} ${Y(297)} ${X(567)} ${Y(313)} ${X(542)} ${Y(313)}
        L ${X(354)} ${Y(313)}
        C ${X(349)} ${Y(313)} ${X(344)} ${Y(313)} ${X(340)} ${Y(310)}
        Z" ${common}/>`;
    }

    if(n.type==='variavel'){
      // Forma fiel ao quadrilátero da referência:
      // M397 353 L487 333 L488 393 L397 393 Z
      // Adaptada proporcionalmente ao conteúdo.
      const slant = Math.min(20, n.w * 0.22);
      return `<path d="
        M ${n.x+slant} ${n.y+20}
        L ${n.x+n.w} ${n.y}
        L ${n.x+n.w+1} ${n.y+n.h}
        L ${n.x+slant} ${n.y+n.h}
        Z" ${common}/>`;
    }

    if(isDiamond(n)){
      const cx=n.x+n.w/2, cy=n.y+n.h/2;
      return `<path d="M ${cx} ${n.y} L ${n.x+n.w} ${cy} L ${cx} ${n.y+n.h} L ${n.x} ${cy} Z" ${common}/>`;
    }

    if(n.type==='conector'){
      const cx=n.x+n.w/2, cy=n.y+n.h/2;
      return `<circle cx="${cx}" cy="${cy}" r="18" class="connector-junction"/>`;
    }

    return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" ${common}/>`;
  }

  function textMarkup(n){
    if(n.type==='conector') return '';
    const lines = wrapLines(n.text, n.type==='entrada' ? 24 : (n.type==='variavel' ? 14 : (isDiamond(n) ? 12 : 34)));
    const lineH = n.font * 1.12;
    const total = (lines.length - 1) * lineH;
    const firstY = n.y + n.h/2 - total/2;
    const klass = n.type==='variavel' ? 'texto variavel' : 'texto principal';
    let out=`<text x="${n.x+n.w/2}" class="${klass}">${lines.map((line,i)=>`<tspan x="${n.x+n.w/2}" y="${firstY + i*lineH}">${escapeXml(line)}</tspan>`).join('')}</text>`;
    if(n.type==='condicional'){
    }
    return out;
  }

  function anchorPoint(n, side){
    const cx=n.x+n.w/2, cy=n.y+n.h/2;

    // A forma de Entrada de dados (variavel) possui as bordas inclinadas.
    // Por isso, x/y da caixa não coincidem sempre com a borda visual.
    // Calculamos os pontos de conexão exatamente sobre o contorno da forma.
    if(n.type==='variavel'){
      const slant = Math.min(20, n.w * 0.22);
      // A linha é deixada ligeiramente por dentro do contorno.
      // Como a forma é desenhada acima das conexões, esse pequeno avanço
      // elimina o aspecto de "linha quase encostando" e faz a conexão
      // aparecer visualmente tocando a borda.
      const overlap = 2;

      if(side==='top'){
        // Borda superior: (x+slant, y+20) -> (x+w, y)
        const t = (cx - (n.x + slant)) / (n.w - slant);
        return {x:cx, y:n.y + 20 * (1 - t) + overlap};
      }
      if(side==='bottom') return {x:cx, y:n.y+n.h-overlap};
      if(side==='left') return {x:n.x+slant+overlap, y:cy};
      return {x:n.x+n.w+1-overlap, y:cy};
    }

    if(side==='top') return {x:cx,y:n.y};
    if(side==='bottom') return {x:cx,y:n.y+n.h};
    if(side==='left') return {x:n.x,y:cy};
    return {x:n.x+n.w,y:cy};
  }

  function defaultFromSide(n){ return 'bottom'; }
  function defaultToSide(n){ return 'top'; }

  // ===== Roteamento ortogonal =====
  // Toda conexão é desenhada apenas com segmentos horizontais e verticais (ângulos de 90°).
  // A rota é calculada por uma busca (A*) sobre uma grade formada pelas bordas dos blocos:
  // ela minimiza o comprimento e o número de dobras e contorna os blocos que estiverem no caminho.
  const ROUTE = {
    stub: 28,        // trecho mínimo que a linha percorre ao sair/entrar perpendicular ao bloco
    grid: 18,        // afastamento (px) das "vias" de contorno em volta de cada bloco
    inflate: 6,      // folga extra considerada como obstáculo em volta de cada bloco
    bend: 30,        // custo de cada dobra (prefere rotas com menos curvas)
    window: 160,     // só blocos dentro dessa janela em volta da rota geram vias de contorno
    cross: 4000,     // custo de cruzar outra conexão (praticamente proibido: só cruza se não houver nenhuma rota)
    overlap: 600,    // custo de correr por cima de outra conexão
    maxSteps: 30000  // limite de segurança da busca
  };
  const routeCache = new Map();
  function cacheRoute(key, pts){
    if(routeCache.size>4000) routeCache.clear();
    routeCache.set(key, pts);
  }
  const SIDE_DIR = {top:0, right:1, bottom:2, left:3};            // 0=cima 1=direita 2=baixo 3=esquerda
  const DIR_VEC = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];

  // Remove pontos repetidos e pontos no meio de trechos retos.
  function simplifyPoints(pts){
    const eq=(a,b)=>Math.abs(a-b)<1e-6;
    const out=[];
    for(const p of pts){
      const last=out[out.length-1];
      if(last && eq(last.x,p.x) && eq(last.y,p.y)) continue;
      out.push(p);
    }
    for(let i=1;i<out.length-1;){
      const a=out[i-1], b=out[i], c=out[i+1];
      if((eq(a.x,b.x)&&eq(b.x,c.x)) || (eq(a.y,b.y)&&eq(b.y,c.y))) out.splice(i,1);
      else i++;
    }
    return out;
  }

  function pointsToPath(pts){
    return 'M '+pts.map(q=>`${q.x} ${q.y}`).join(' L ');
  }

  // Busca a melhor rota ortogonal entre p1 (já fora do bloco de origem, andando na direção d1)
  // e p2 (ponto de onde a linha entra no bloco de destino, cuja face aponta para d2).
  // Devolve os pontos de p1 até p2 ou null se não houver caminho livre.
  function searchRoute(p1, d1, p2, d2, nodes, others){
    const win=ROUTE.window, G=ROUTE.grid, I=ROUTE.inflate;
    const wx0=Math.min(p1.x,p2.x)-win, wx1=Math.max(p1.x,p2.x)+win;
    const wy0=Math.min(p1.y,p2.y)-win, wy1=Math.max(p1.y,p2.y)+win;
    const near=nodes.filter(n=>n.x+n.w>wx0 && n.x<wx1 && n.y+n.h>wy0 && n.y<wy1);

    // Linhas da grade: pontos de partida/chegada, ponto médio e vias em volta dos blocos.
    const xs=new Set([p1.x,p2.x,(p1.x+p2.x)/2,p1.x-G,p1.x+G,p2.x-G,p2.x+G]);
    const ys=new Set([p1.y,p2.y,(p1.y+p2.y)/2,p1.y-G,p1.y+G,p2.y-G,p2.y+G]);
    near.forEach(n=>{ xs.add(n.x-G); xs.add(n.x+n.w+G); ys.add(n.y-G); ys.add(n.y+n.h+G); });
    const X=[...xs].sort((a,b)=>a-b), Y=[...ys].sort((a,b)=>a-b);
    const xi=new Map(X.map((v,i)=>[v,i])), yi=new Map(Y.map((v,i)=>[v,i]));

    // A rota nunca sai da região coberta pela grade; só os blocos que tocam essa região
    // (inclusive os fora da janela: as vias de um bloco grande vão além dela) são obstáculos.
    const rx0=X[0], rx1=X[X.length-1], ry0=Y[0], ry1=Y[Y.length-1];
    const relevant=nodes.filter(n=>n.x+n.w+I>rx0 && n.x-I<rx1 && n.y+n.h+I>ry0 && n.y-I<ry1);

    // Cache: a rota só muda se os pontos ou algum bloco relevante mudaram
    // (assim, ao arrastar um bloco, só as conexões próximas a ele são recalculadas).
    // Trechos de outras conexões na região (cruzar ou sobrepor um deles tem custo).
    const oth=(others||[]).filter(t=>t.h ? (t.pos>ry0-1 && t.pos<ry1+1 && t.hi>rx0 && t.lo<rx1)
                                         : (t.pos>rx0-1 && t.pos<rx1+1 && t.hi>ry0 && t.lo<ry1));
    const ckey=`${d1}|${d2}|${p1.x},${p1.y}|${p2.x},${p2.y}|`+relevant.map(n=>`${n.x},${n.y},${n.w},${n.h}`).join(';')
      +'|'+oth.map(t=>`${t.h?'h':'v'}${t.pos},${t.lo},${t.hi}`).join(';');
    const linePenalty=(ax,ay,bx,by)=>{
      let c=0;
      if(ay===by){                                   // trecho horizontal
        const lo=Math.min(ax,bx), hi=Math.max(ax,bx);
        for(const t of oth){
          if(t.h){ if(Math.abs(t.pos-ay)<1 && Math.min(hi,t.hi)-Math.max(lo,t.lo)>1) c+=ROUTE.overlap; }
          else if(t.pos>lo+0.5 && t.pos<hi-0.5 && ay>t.lo+0.5 && ay<t.hi-0.5) c+=ROUTE.cross;
        }
      }else{                                         // trecho vertical
        const lo=Math.min(ay,by), hi=Math.max(ay,by);
        for(const t of oth){
          if(!t.h){ if(Math.abs(t.pos-ax)<1 && Math.min(hi,t.hi)-Math.max(lo,t.lo)>1) c+=ROUTE.overlap; }
          else if(t.pos>lo+0.5 && t.pos<hi-0.5 && ax>t.lo+0.5 && ax<t.hi-0.5) c+=ROUTE.cross;
        }
      }
      return c;
    };
    const hit=routeCache.get(ckey);
    if(hit!==undefined) return hit && hit.map(q=>({x:q.x,y:q.y}));

    // Obstáculos: blocos (com folga). Os que já contêm o ponto de partida/chegada
    // (blocos muito próximos entre si) são ignorados para não bloquear a própria saída.
    const inside=(b,p)=>p.x>b.x1 && p.x<b.x2 && p.y>b.y1 && p.y<b.y2;
    const boxes=relevant
      .map(n=>({x1:n.x-I, y1:n.y-I, x2:n.x+n.w+I, y2:n.y+n.h+I}))
      .filter(b=>!inside(b,p1) && !inside(b,p2));
    const blocked=(ax,ay,bx,by)=>{
      if(ay===by){
        const lo=Math.min(ax,bx), hi=Math.max(ax,bx);
        return boxes.some(b=>ay>b.y1 && ay<b.y2 && hi>b.x1 && lo<b.x2);
      }
      const lo=Math.min(ay,by), hi=Math.max(ay,by);
      return boxes.some(b=>ax>b.x1 && ax<b.x2 && hi>b.y1 && lo<b.y2);
    };

    // Fila de prioridade (heap binário).
    const heap=[];
    const push=it=>{
      heap.push(it);
      let i=heap.length-1;
      while(i>0){
        const p=(i-1)>>1;
        if(heap[p].f<=heap[i].f) break;
        [heap[p],heap[i]]=[heap[i],heap[p]]; i=p;
      }
    };
    const pop=()=>{
      const top=heap[0], last=heap.pop();
      if(heap.length){
        heap[0]=last;
        let i=0;
        for(;;){
          const l=2*i+1, r=l+1; let m=i;
          if(l<heap.length && heap[l].f<heap[m].f) m=l;
          if(r<heap.length && heap[r].f<heap[m].f) m=r;
          if(m===i) break;
          [heap[m],heap[i]]=[heap[i],heap[m]]; i=m;
        }
      }
      return top;
    };

    const sx=xi.get(p1.x), sy=yi.get(p1.y), gx=xi.get(p2.x), gy=yi.get(p2.y);
    const h=(ix,iy)=>Math.abs(X[ix]-p2.x)+Math.abs(Y[iy]-p2.y);
    const xm=(p1.x+p2.x)/2, ym=(p1.y+p2.y)/2;      // desempate: prefere dobrar no meio do caminho
    const key=(ix,iy,d)=>(iy*X.length+ix)*4+d;
    const best=new Map([[key(sx,sy,d1),0]]);
    const enter=(d2+2)%4;                           // direção em que a linha percorre o último trecho
    push({f:h(sx,sy), g:0, ix:sx, iy:sy, dir:d1, prev:null});

    let steps=0;
    while(heap.length && steps++<ROUTE.maxSteps){
      const cur=pop();
      if(cur.term){
        const pts=[];
        for(let n=cur.prev;n;n=n.prev) pts.push({x:X[n.ix],y:Y[n.iy]});
        pts.reverse();
        cacheRoute(ckey,pts);
        return pts.map(q=>({x:q.x,y:q.y}));
      }
      if(cur.g>(best.get(key(cur.ix,cur.iy,cur.dir)) ?? Infinity)) continue;

      // Chegou em p2: só vale se não for "de ré" em relação à entrada do bloco.
      if(cur.ix===gx && cur.iy===gy && cur.dir!==d2){
        const fin=cur.g+(cur.dir!==enter ? ROUTE.bend : 0);
        push({f:fin, g:fin, term:true, prev:cur});
      }

      for(const nd of [cur.dir,(cur.dir+1)%4,(cur.dir+3)%4]){   // nunca inverte o sentido
        const v=DIR_VEC[nd], nx=cur.ix+v.x, ny=cur.iy+v.y;
        if(nx<0 || ny<0 || nx>=X.length || ny>=Y.length) continue;
        const ax=X[cur.ix], ay=Y[cur.iy], bx=X[nx], by=Y[ny];
        if(blocked(ax,ay,bx,by)) continue;
        const len=Math.abs(bx-ax)+Math.abs(by-ay);
        let cost=len+(nd!==cur.dir ? ROUTE.bend : 0);
        if(oth.length) cost+=linePenalty(ax,ay,bx,by);
        cost+=0.001*len*(ay===by ? Math.abs(ay-ym) : Math.abs(ax-xm));
        const g=cur.g+cost, k=key(nx,ny,nd);
        if(g<(best.get(k) ?? Infinity)){
          best.set(k,g);
          push({f:g+h(nx,ny), g, ix:nx, iy:ny, dir:nd, prev:cur});
        }
      }
    }
    cacheRoute(ckey,null);
    return null;
  }

  // Pontos da conexão ortogonal de `pa` (saindo pelo lado fromSide) até `pb` (entrando pelo lado toSide).
  function orthoPoints(pa, pb, fromSide, toSide, nodes, align, others){
    const d1=SIDE_DIR[fromSide] ?? 2, d2=SIDE_DIR[toSide] ?? 0;
    const v1=DIR_VEC[d1], v2=DIR_VEC[d2];

    // Blocos praticamente alinhados (diferença de poucos px) ganham uma linha reta, sem "degrau".
    // O ponto de encaixe de um dos lados desliza alguns px ao longo da borda (align = {tol, end}).
    pa={x:pa.x, y:pa.y}; pb={x:pb.x, y:pb.y};
    const al=align || {tol:3, end:'b'};
    if(d1%2===0 && d2%2===0 && Math.abs(pa.x-pb.x)<=al.tol){ if(al.end==='a') pa.x=pb.x; else pb.x=pa.x; }
    if(d1%2===1 && d2%2===1 && Math.abs(pa.y-pb.y)<=al.tol){ if(al.end==='a') pa.y=pb.y; else pb.y=pa.y; }

    // Saída e entrada "de frente" (ex.: embaixo -> topo): encurta os trechos se o espaço for pequeno.
    let s1=ROUTE.stub, s2=ROUTE.stub;
    if(d2===(d1+2)%4){
      const gap=(pb.x-pa.x)*v1.x+(pb.y-pa.y)*v1.y;
      if(gap>0) s1=s2=Math.min(ROUTE.stub,gap/2);
    }
    const p1={x:pa.x+v1.x*s1, y:pa.y+v1.y*s1};
    const p2={x:pb.x+v2.x*s2, y:pb.y+v2.y*s2};

    const mid=searchRoute(p1,d1,p2,d2,nodes,others)
      || searchRoute(p1,d1,p2,d2,[],others)                       // sem obstáculos, se o caminho estiver fechado
      || [p1,{x:p2.x,y:p1.y},p2];
    return simplifyPoints([pa,...mid,pb]);
  }

  // Mantido por compatibilidade: agora também gera caminho ortogonal (sem considerar outros blocos).
  function makePath(a,b,fromSide='bottom',toSide='top'){
    return pointsToPath(orthoPoints(a,b,fromSide,toSide,[]));
  }


  // Quanto o encaixe pode deslizar para alinhar dois blocos, e em qual ponta: só onde a borda é reta
  // naquele ponto (topo/base de Início/Fim, Exibir e Processo; laterais do Processo). Nas demais
  // formas (losango, conector, entrada de dados) o encaixe é um vértice/curva e quase não desliza.
  function alignFor(a, b, fromSide, toSide){
    const vertical = (fromSide==='top'||fromSide==='bottom') && (toSide==='top'||toSide==='bottom');
    const flat = n => vertical ? (n.type==='inicio'||n.type==='entrada'||n.type==='processo') : n.type==='processo';
    if(flat(b)) return {tol:6, end:'b'};
    if(flat(a)) return {tol:6, end:'a'};
    return {tol:3, end:'b'};
  }

  // Rotas ortogonais: laços (retorno pela esquerda, saída F à direita) têm rotas próprias;
  // todas as demais conexões usam o roteador ortogonal acima.
  // Laços de retorno (voltam pela esquerda até o Enquanto). Laços aninhados não podem se cruzar:
  // o laço de fora passa mais à esquerda que todos os laços contidos nele.
  const LOOP_GAP = 24;
  function loopBase(l){
    const a=getNode(l.from), b=getNode(l.to);
    if(!a||!b) return null;
    const fromSide=l.fromSide || defaultFromSide(a);
    const toSide=l.toSide || defaultToSide(b);
    const pa=anchorPoint(a,fromSide), pb=anchorPoint(b,toSide);
    if(!(toSide==='left' && ((b.type==='condicional' && pa.y>pb.y) || (b.type==='conector' && pa.y>pb.y+20)))) return null;
    const lo=Math.min(pa.y,pb.y), hi=Math.max(pa.y,pb.y);
    let xl=Math.min(pa.x,pb.x);
    for(const n of state.nodes){
      if(n.id===a.id || n.id===b.id) continue;
      if(n.y<hi+10 && n.y+n.h>lo-10) xl=Math.min(xl,n.x);
    }
    return {xl:xl-50, top:lo, bot:hi};
  }
  function loopX(l, depth=0){
    const base=loopBase(l);
    if(!base) return 0;
    let xl=base.xl;
    if(depth>12) return xl;
    for(const m of state.links){
      if(m===l) continue;
      const bm=loopBase(m);
      if(!bm) continue;
      const inside=bm.top>=base.top-1 && bm.bot<=base.bot+1 && (bm.bot-bm.top)<(base.bot-base.top)-1;
      if(inside) xl=Math.min(xl, loopX(m,depth+1)-LOOP_GAP);
    }
    return xl;
  }

  function rawLinkPathD0(l, lineSegs, noSpecial){
    const a=getNode(l.from), b=getNode(l.to);
    const fromSide=l.fromSide || defaultFromSide(a);
    const toSide=l.toSide || defaultToSide(b);
    const pa=anchorPoint(a,fromSide), pb=anchorPoint(b,toSide);
    const others=state.nodes.filter(n=>n.id!==a.id && n.id!==b.id);
    const lo=Math.min(pa.y,pb.y), hi=Math.max(pa.y,pb.y);
    const between=others.filter(n=>n.y<hi+10 && n.y+n.h>lo-10);

    // Retorno do laço: entra pela esquerda do Enquanto.
    if(!noSpecial && toSide==='left' && ((b.type==='condicional' && pa.y>pb.y) || (b.type==='conector' && pa.y>pb.y+20))){
      const xl=loopX(l);
      const pts=[pa];
      if(fromSide==='bottom') pts.push({x:pa.x,y:pa.y+25});
      const y0=pts[pts.length-1].y;
      pts.push({x:xl,y:y0},{x:xl,y:pb.y},pb);
      return 'M '+pts.map(q=>`${q.x} ${q.y}`).join(' L ');
    }
    // Saída V pela esquerda voltando para um bloco acima (montagem com Enquanto embaixo).
    if(!noSpecial && condMode(a)==='B' && fromSide==='left' && toSide==='top' && pb.y<pa.y){
      let xl=Math.min(pa.x,pb.x);
      for(const n of between) xl=Math.min(xl,n.x);
      xl-=50;
      const yj=pb.y-30;
      return `M ${pa.x} ${pa.y} L ${xl} ${pa.y} L ${xl} ${yj} L ${pb.x} ${yj} L ${pb.x} ${pb.y}`;
    }
    // Saída F (direita) do Enquanto.
    if(!noSpecial && condMode(a)==='A' && fromSide==='right' && toSide==='top'){
      if(pb.x>pa.x+20) return `M ${pa.x} ${pa.y} L ${pb.x} ${pa.y} L ${pb.x} ${pb.y}`;
      let xm=pa.x+60;
      for(const n of between) xm=Math.max(xm,n.x+n.w+40);
      const yj=pb.y-30;
      return `M ${pa.x} ${pa.y} L ${xm} ${pa.y} L ${xm} ${yj} L ${pb.x} ${yj} L ${pb.x} ${pb.y}`;
    }
    return pointsToPath(orthoPoints(pa,pb,fromSide,toSide,state.nodes,alignFor(a,b,fromSide,toSide),lineSegs));
  }

  // Número de cruzamentos (perpendiculares) entre os pontos `pts` e os trechos `segs` de outras conexões.
  function countCross(pts, segs){
    if(!pts || !segs || !segs.length) return 0;
    let c=0;
    for(const m of segsOf(pts)){
      for(const t of segs){
        if(m.h===t.h) continue;
        if(t.pos>m.lo+0.5 && t.pos<m.hi-0.5 && m.pos>t.lo+0.5 && m.pos<t.hi-0.5) c++;
      }
    }
    return c;
  }

  // Uma linha nunca passa por dentro/através de outra: se a rota especial (laço, saída F/V)
  // cruzar outra conexão, usa-se o roteador geral (que contorna as linhas por fora) quando cruzar menos.
  function rawLinkPathD(l, lineSegs){
    const d=rawLinkPathD0(l,lineSegs);
    if(!lineSegs || !lineSegs.length) return d;
    const c=countCross(pathToPoints(d),lineSegs);
    if(c===0) return d;
    const d2=rawLinkPathD0(l,lineSegs,true);
    return countCross(pathToPoints(d2),lineSegs)<c ? d2 : d;
  }

  // ===== Separação entre linhas =====
  // Duas conexões nunca podem correr coladas (ou sobrepostas) uma na outra: trechos paralelos
  // de conexões diferentes ficam, no mínimo, LINE_GAP px afastados. Só se desloca um trecho
  // interno (que não toca o encaixe do bloco), mantendo tudo em ângulos de 90°.
  const LINE_GAP = 14;

  function pathToPoints(d){
    const n=(d.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number), pts=[];
    for(let i=0;i+1<n.length;i+=2) pts.push({x:n[i],y:n[i+1]});
    return pts;
  }

  function segHitsNode(p,q){
    const x1=Math.min(p.x,q.x), x2=Math.max(p.x,q.x), y1=Math.min(p.y,q.y), y2=Math.max(p.y,q.y);
    return state.nodes.some(n=>x2>n.x+1 && x1<n.x+n.w-1 && y2>n.y+1 && y1<n.y+n.h-1);
  }

  // Tenta mover o trecho k de `pts` para a posição `pos` (eixo perpendicular ao trecho).
  function tryShift(pts, k, horizontal, pos){
    const ax=horizontal?'y':'x';
    const prev=pts[k-1], next=pts[k+2];
    const sameDir=(from,oldV,newV)=>{ const a=oldV-from, b=newV-from; return b!==0 && (a===0 || Math.sign(a)===Math.sign(b)); };
    if(!sameDir(prev[ax], pts[k][ax], pos) || !sameDir(next[ax], pts[k+1][ax], pos)) return false;
    const a={...pts[k]}, b={...pts[k+1]}; a[ax]=pos; b[ax]=pos;
    if(segHitsNode(prev,a) || segHitsNode(a,b) || segHitsNode(b,next)) return false;
    pts[k]=a; pts[k+1]=b;
    return true;
  }

  function segsOf(pts){
    const out=[];
    for(let k=0;k<pts.length-1;k++){
      const p=pts[k], q=pts[k+1];
      if(Math.abs(p.y-q.y)<1e-6 && Math.abs(p.x-q.x)>1e-6) out.push({h:true,pos:p.y,lo:Math.min(p.x,q.x),hi:Math.max(p.x,q.x)});
      else if(Math.abs(p.x-q.x)<1e-6 && Math.abs(p.y-q.y)>1e-6) out.push({h:false,pos:p.x,lo:Math.min(p.y,q.y),hi:Math.max(p.y,q.y)});
    }
    return out;
  }

  function separateLines(all){
    const segs=pts=>{
      const out=[];
      for(let k=0;k<pts.length-1;k++){
        const p=pts[k], q=pts[k+1];
        if(Math.abs(p.y-q.y)<1e-6 && Math.abs(p.x-q.x)>1e-6) out.push({k,h:true,pos:p.y,lo:Math.min(p.x,q.x),hi:Math.max(p.x,q.x)});
        else if(Math.abs(p.x-q.x)<1e-6 && Math.abs(p.y-q.y)>1e-6) out.push({k,h:false,pos:p.x,lo:Math.min(p.y,q.y),hi:Math.max(p.y,q.y)});
      }
      return out;
    };
    for(let pass=0;pass<8;pass++){
      let changed=false;
      for(let i=0;i<all.length;i++) for(let j=i+1;j<all.length;j++){
        if(!all[i] || !all[j]) continue;
        for(const sa of segs(all[i])) for(const sb of segs(all[j])){
          if(sa.h!==sb.h) continue;
          if(Math.min(sa.hi,sb.hi)-Math.max(sa.lo,sb.lo)<=1) continue;     // não se sobrepõem
          if(Math.abs(sa.pos-sb.pos)>=LINE_GAP-0.01) continue;             // já há espaço
          const okA=sa.k>=1 && sa.k+1<=all[i].length-2, okB=sb.k>=1 && sb.k+1<=all[j].length-2;
          const order=[];
          if(okB) order.push([all[j],sb,sa]);
          if(okA) order.push([all[i],sa,sb]);
          for(const [pts,mv,fix] of order){
            const first=mv.pos>=fix.pos?1:-1;
            const outros=[]; all.forEach(q=>{ if(q && q!==pts) outros.push(...segsOf(q)); });
            const antes=countCross(pts,outros);
            for(const sg of [first,-first]){
              const bak=pts.map(q=>({...q}));
              if(tryShift(pts,mv.k,mv.h,fix.pos+sg*LINE_GAP)){
                if(countCross(pts,outros)<=antes){ changed=true; break; }
                pts.splice(0,pts.length,...bak);          // o deslocamento criaria cruzamento: desfaz
              }
            }
            if(changed) break;
          }
          if(changed) break;
        }
        if(changed) break;
      }
      if(!changed) break;
    }
    return all;
  }

  const pointsD=pts=>pointsToPath(simplifyPoints(pts));

  // Caminhos (atributo d) de todas as conexões, já com as linhas separadas entre si.
  function allLinkPathsD(){
    const ok=l=>getNode(l.from)&&getNode(l.to);
    const all=state.links.map(l=>ok(l) ? pathToPoints(rawLinkPathD(l)) : null);
    // Reroteia cada conexão desviando das demais (cruzar/sobrepor outra linha tem custo alto).
    for(let round=0;round<4;round++){
      state.links.forEach((l,i)=>{
        if(!all[i]) return;
        const others=[];
        all.forEach((pts,j)=>{ if(j!==i && pts) others.push(...segsOf(pts)); });
        all[i]=pathToPoints(rawLinkPathD(l,others));
      });
    }
    separateLines(all);
    return all.map(pts=>pts?pointsD(pts):'');
  }

  function linkPathD(l){
    const i=state.links.indexOf(l);
    return i>=0 ? allLinkPathsD()[i] : rawLinkPathD(l);
  }

  function renderTempConnection(point){
    const layer = document.getElementById('tempLink');
    if(!layer) return;
    if(state.mode!=='connect' || !state.drag){
      layer.innerHTML='';
      return;
    }
    const from = getNode(state.drag.startNode);
    if(!from) { layer.innerHTML=''; return; }
    const fromSide=state.drag.fromSide || defaultFromSide(from);
    const p1=anchorPoint(from,fromSide);
    layer.innerHTML = `<path class="connector temp" d="${makePath(p1,point,fromSide,'top')}"/>`;
  }

  function render(){
    const linkPaths=allLinkPathsD();
    linksLayer.innerHTML = state.links.map((l,i)=>{
      const a=getNode(l.from), b=getNode(l.to);
      if(!a||!b)return '';
      const d=linkPaths[i];
      return `<path data-link="${i}" class="connector-hit" d="${d}"/>
              <path data-link="${i}" class="connector ${l.selected?'selected':''}" d="${d}"/>`;
    }).join('');

    nodesLayer.innerHTML = state.nodes.map(n => {
      let handles='';
      if(n.type==='condicional'){
        const mode=condMode(n);
        const lbl=(side,t)=>{
          const cx=n.x+n.w/2, cy=n.y+n.h/2;
          if(side==='left')   return `<text class="loop-label" text-anchor="end" x="${n.x-8}" y="${cy-10}">${t}</text>`;
          if(side==='right')  return `<text class="loop-label" x="${n.x+n.w+8}" y="${cy-10}">${t}</text>`;
          return `<text class="loop-label" x="${cx+12}" y="${n.y+n.h+18}">${t}</text>`;
        };
        const sideV = mode==='A' ? 'bottom' : (mode==='B' ? 'left' : 'right');
        const sideF = mode==='A' ? 'right'  : (mode==='B' ? 'bottom' : 'left');
        handles=`<circle class="handle" data-side="top" cx="${n.x+n.w/2}" cy="${n.y}" r="9"/><title>Entrada</title>
        <circle class="handle" data-side="left" cx="${n.x}" cy="${n.y+n.h/2}" r="9"/><title>Saída esquerda (também recebe o retorno de um laço)</title>
        <circle class="handle" data-side="right" cx="${n.x+n.w}" cy="${n.y+n.h/2}" r="9"/><title>Saída direita</title>
        <circle class="handle" data-side="bottom" cx="${n.x+n.w/2}" cy="${n.y+n.h}" r="9"/><title>Saída de baixo (laço)</title>
        ${lbl(sideV,'V')}${lbl(sideF,'F')}`;
      }else if(n.type==='conector'){
        // No Conector, as laterais são pontos de chegada das conexões.
        // Eles permanecem invisíveis para não poluir a interface.
        // A saída inferior aparece somente quando o Conector é selecionado.
        handles=`<circle class="handle connector-input-handle" data-side="top" cx="${n.x+n.w/2}" cy="${n.y}" r="8"/><title>Entrada</title>
        <circle class="handle connector-input-handle" data-side="left" cx="${n.x}" cy="${n.y+n.h/2}" r="8"/><title>Entrada</title>
        <circle class="handle connector-input-handle" data-side="right" cx="${n.x+n.w}" cy="${n.y+n.h/2}" r="8"/><title>Entrada</title>
        <circle class="handle connector-output-handle" data-side="bottom" cx="${n.x+n.w/2}" cy="${n.y+n.h}" r="8"/><title>Saída</title>`;
      }else{
        handles=`<circle class="handle" data-side="bottom" cx="${n.x+n.w/2}" cy="${n.y+n.h}" r="9"/><title>Arraste este ponto até outro bloco para conectar</title>`
          + (n.type==='inicio' ? '' : `<circle class="handle" data-side="left" cx="${n.x}" cy="${n.y+n.h/2}" r="9"/><title>Saída lateral (use para voltar ao Enquanto)</title>`);
      }
      return `<g class="node ${n.id===state.selectedId?'selected ':''}${n.id===state.executionId?'executing':''}" data-id="${n.id}">${shapeMarkup(n)}${textMarkup(n)}${handles}</g>`;
    }).join('');

    statsEl.textContent = `${state.nodes.length} blocos · ${state.links.length} conexões`;
    const es=document.getElementById('emptyState');
    if(es) es.hidden=state.nodes.length>0;
    if(afterRender) afterRender();
  }

  Object.assign(Fluxo, {
    wrapLines,
    measureTextWidth,
    autoSizeNode,
    shapeMarkup,
    textMarkup,
    anchorPoint,
    defaultFromSide,
    defaultToSide,
    makePath,
    linkPathD,
    allLinkPathsD,
    renderTempConnection,
    render,
    setAfterRender
  });
})();
