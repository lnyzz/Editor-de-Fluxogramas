/* validation.js — validação estrutural e semântica do fluxograma antes de executar/depurar. */
(() => {
  const {state, getNode, isDiamond} = Fluxo;
  const {runOutgoing, runCondOutputs, runSplitTopLevel, runIsIdentifier, RUN_RESERVED_LITERALS} = Fluxo;

  function runFindReachableConnectors(nodeId, visited=new Set()){
    if(!nodeId || visited.has(nodeId)) return new Set();
    visited.add(nodeId);
    const node=getNode(nodeId);
    if(!node) return new Set();

    const result=new Set();

    // Um conector é um ponto de junção, mas o fluxo pode continuar
    // depois dele até outro conector. Isso é importante quando há
    // condicionais aninhados ou quando dois caminhos usam mais de um
    // conector antes de se unirem definitivamente.
    if(node.type==='conector') result.add(nodeId);

    for(const {l} of runOutgoing(nodeId)){
      for(const id of runFindReachableConnectors(l.to, new Set(visited))) result.add(id);
    }
    return result;
  }

  function runConnectorDistances(startId){
    const distances=new Map();
    if(!startId) return distances;

    const queue=[[startId,0]];
    const seen=new Set([startId]);

    while(queue.length){
      const [nodeId,distance]=queue.shift();
      const node=getNode(nodeId);
      if(!node) continue;

      if(node.type==='conector' && !distances.has(nodeId)){
        distances.set(nodeId,distance);
      }

      for(const {l} of runOutgoing(nodeId)){
        if(!l?.to || seen.has(l.to)) continue;
        seen.add(l.to);
        queue.push([l.to,distance+1]);
      }
    }

    return distances;
  }

  function runValidateConditionalConnectors(errors){
    for(const conditional of state.nodes.filter(n=>n.type==='condicional')){
      const outs=runOutgoing(conditional.id);
      const left=outs.find(({l})=>(l.fromSide||'bottom')==='left')?.l;
      const right=outs.find(({l})=>(l.fromSide||'bottom')==='right')?.l;

      if(!left || !right) continue;
      if(outs.some(({l})=>(l.fromSide||'bottom')==='bottom')) continue;   // laço: validado em outro ponto

      const leftDistances=runConnectorDistances(left.to);
      const rightDistances=runConnectorDistances(right.to);
      const common=[...leftDistances.keys()]
        .filter(id=>rightDistances.has(id))
        .sort((a,b)=>{
          const da=Math.max(leftDistances.get(a),rightDistances.get(a));
          const db=Math.max(leftDistances.get(b),rightDistances.get(b));
          if(da!==db) return da-db;
          return (leftDistances.get(a)+rightDistances.get(a)) -
                 (leftDistances.get(b)+rightDistances.get(b));
        });

      if(common.length===0){
        errors.push(`O Condicional "${conditional.text}" precisa de um Conector para unir os caminhos da esquerda e da direita antes de continuar o fluxo.`);
        continue;
      }

      // O primeiro Conector comum é o ponto de união do Condicional.
      // Conectores que aparecem depois dele fazem parte da continuação
      // do fluxo e não devem causar um falso erro em condicionais aninhados.
      const connectorId=common[0];
      const sameDistance=common.filter(id=>{
        const d=Math.max(leftDistances.get(id),rightDistances.get(id));
        const firstD=Math.max(leftDistances.get(connectorId),rightDistances.get(connectorId));
        return d===firstD;
      });

      if(sameDistance.length>1){
        errors.push(`O Condicional "${conditional.text}" possui mais de um ponto de união possível no mesmo nível. Verifique os caminhos antes do Conector.`);
        continue;
      }

      const incoming=state.links.filter(l=>l.to===connectorId);
      if(incoming.length!==2){
        errors.push(`O Conector após o Condicional "${conditional.text}" deve receber exatamente duas conexões, uma de cada caminho.`);
      }
    }
  }

  // Verifica se, partindo de fromId, o fluxo consegue chegar em targetId (usado para exigir o retorno do laço).
  function runReaches(fromId, targetId){
    const seen=new Set([fromId]);
    const stack=[fromId];
    while(stack.length){
      const id=stack.pop();
      if(id===targetId) return true;
      for(const {l} of runOutgoing(id)){
        if(l?.to && !seen.has(l.to)){ seen.add(l.to); stack.push(l.to); }
      }
    }
    return false;
  }

  function runValidateProgram(start){
    const errors=[];
    const starts=state.nodes.filter(n=>n.type==='inicio' && String(n.text||'').trim().toLowerCase()!=='fim');
    const ends=state.nodes.filter(n=>n.type==='inicio' && String(n.text||'').trim().toLowerCase()==='fim');
    if(starts.length===0) errors.push('Não existe um bloco Início válido.');
    if(starts.length>1) errors.push(`Existem ${starts.length} blocos Início. Use apenas um ponto de entrada.`);
    if(ends.length===0) errors.push('Não existe um bloco Fim.');

    // 1) Primeiro coleta TODAS as variáveis declaradas em todos os Processos.
    // A ordem dos nós no array JSON não importa; a ordem de execução vem das conexões.
    const declared=new Set();
    const bare=new Set();   // declarações "só nome" (para detectar duplicadas)
    const assignments=[];
    const processNodes=state.nodes.filter(n=>n.type==='processo');

    for(const n of processNodes){
      const statements=String(n.text||'').replace(/\r/g,'').split(/[;\n]+/).map(x=>x.trim()).filter(Boolean);
      for(const statement of statements){
        const parts=runSplitTopLevel(statement, ',').filter(Boolean);
        for(const part of parts){
          const item=part.trim();
          const m=item.match(/^([A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*)\s*=\s*(.+)$/);
          if(m){
            assignments.push({node:n,target:m[1],expression:m[2].trim()});
            declared.add(m[1]);   // atribuir cria a variável quando ela ainda não existe
          }else if(runIsIdentifier(item)){
            if(bare.has(item)) errors.push(`A variável "${item}" foi declarada mais de uma vez.`);
            else{ bare.add(item); declared.add(item); }
          }else{
            errors.push(`Processo "${n.text}" contém uma instrução não reconhecida: ${item}.`);
          }
        }
      }
    }

    // A Entrada de dados também cria a variável que recebe o valor.
    for(const n of state.nodes.filter(n=>n.type==='variavel')){
      const name=String(n.text||'').trim();
      if(runIsIdentifier(name)) declared.add(name);
    }

    function findIdentifiers(expr){
      const source=String(expr||'');
      let cleaned='', quote=null;
      for(let i=0;i<source.length;i++){
        const ch=source[i];
        if(quote){
          if(ch===quote && source[i-1]!=='\\') quote=null;
          cleaned+=' ';
          continue;
        }
        if(ch==='"' || ch==="'"){ quote=ch; cleaned+=' '; continue; }
        cleaned+=ch;
      }
      return [...new Set(cleaned.match(/[A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*/g)||[])]
        .filter(name=>!RUN_RESERVED_LITERALS.has(name));
    }

    // 2) Agora valida as atribuições contra o conjunto COMPLETO de declarações.
    // Não exige que a declaração apareça antes no array JSON.
    for(const {node,target,expression} of assignments){
      const missing=findIdentifiers(expression).filter(name=>!declared.has(name));
      if(missing.length){
        errors.push(`${missing.length>1?'Variáveis não declaradas':'Variável não declarada'} em processo "${node.text}": ${missing.map(v=>`"${v}"`).join(', ')}. Declare ${missing.length>1?'essas variáveis':'essa variável'} em um bloco Processo antes de utilizá-la (ex.: soma = 0).`);
      }
    }

    // 3) Entradas de dados também precisam apontar para uma variável declarada.
    for(const n of state.nodes.filter(n=>n.type==='variavel')){
      const name=String(n.text||'').trim();
      if(!runIsIdentifier(name)) errors.push(`Entrada de dados "${n.text}" possui nome inválido.`);
    }

    // 4) Exibições: valida variáveis usadas nelas sem depender do estado da execução.
    for(const n of state.nodes.filter(n=>n.type==='entrada')){
      const raw=String(n.text||'').trim();
      if(!raw){ errors.push('Existe um bloco "Exibir na tela" vazio.'); continue; }
      for(const name of findIdentifiers(raw)){
        // Palavras que aparecem dentro de strings já foram removidas em findIdentifiers.
        if(!declared.has(name)) errors.push(`A variável "${name}" foi usada em "Exibir na tela", mas não foi declarada em Processo.`);
      }
    }

    // 5) Condicionais: suas variáveis também precisam existir.
    for(const n of state.nodes.filter(isDiamond)){
      const raw=String(n.text||'').trim();
      if(!raw) errors.push('O Condicional está sem uma condição.');
      else{
        for(const name of findIdentifiers(raw)){
          if(!declared.has(name)) errors.push(`A variável "${name}" foi usada na condição "${n.text}", mas não foi declarada em Processo.`);
        }
      }
    }

    runValidateConditionalConnectors(errors);

    // 6) Verifica a estrutura básica das conexões.
    for(const n of state.nodes){
      const outs=runOutgoing(n.id);
      const isEnd=n.type==='inicio' && String(n.text||'').trim().toLowerCase()==='fim';
      if(isEnd) continue;
      if(isDiamond(n)){
        const lo=runCondOutputs(outs);
        if(lo.mode==='N'){
          const left=outs.filter(({l})=>(l.fromSide||'bottom')==='left');
          const right=outs.filter(({l})=>(l.fromSide||'bottom')==='right');
          if(lo.invalid || outs.length!==left.length+right.length) errors.push(`Condicional "${n.text}": use apenas as saídas da esquerda e da direita (condicional normal) ou uma das montagens de laço.`);
          if(left.length!==1) errors.push(`Condicional "${n.text}" precisa ter exatamente uma saída pela esquerda.`);
          if(right.length!==1) errors.push(`Condicional "${n.text}" precisa ter exatamente uma saída pela direita.`);
        }else{
          const montagem='V embaixo + F à direita, ou V à esquerda + F embaixo';
          if(lo.invalid) errors.push(`Condicional "${n.text}": use apenas uma destas combinações de saídas de laço: ${montagem}.`);
          else if(lo.v.length!==1 || lo.f.length!==1 || outs.length!==2) errors.push(`Condicional "${n.text}" (laço) precisa de exatamente duas saídas (${montagem}).`);
          else if(!runReaches(lo.v[0].l.to, n.id)) errors.push(`O corpo do laço do Condicional "${n.text}" (saída V) precisa voltar para o próprio Condicional.`);
        }
      }else if(outs.length===0){
        errors.push(`O bloco "${n.text || n.type}" não possui uma próxima conexão.`);
      }else if(outs.length>1 && n.type!=='conector'){
        errors.push(`O bloco "${n.text || n.type}" possui mais de uma saída.`);
      }
    }

    if(errors.length) throw new Error([...new Set(errors)].slice(0,10).join(' | ')+(errors.length>10?` | E mais ${errors.length-10} erro(s).`:''));
  }

  Object.assign(Fluxo, {
    runFindReachableConnectors,
    runConnectorDistances,
    runValidateConditionalConnectors,
    runReaches,
    runValidateProgram
  });
})();
