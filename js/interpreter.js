/* interpreter.js — console de execução, avaliação de expressões, modo normal e modo depuração. */
(() => {
  const {state, getNode, render} = Fluxo;
  const {runFindStart, runOutgoing, runCondOutputs, runBranchLink, runSplitTopLevel, runIsIdentifier, RUN_RESERVED_LITERALS, runValidateProgram} = Fluxo;

  /* =========================
     Interpretador do fluxograma
     ========================= */
  const runOverlay=document.getElementById('runOverlay');
  const runOutput=document.getElementById('runOutput');
  const runInputArea=document.getElementById('runInputArea');
  const runPromptLabel=document.getElementById('runPromptLabel');
  const runInput=document.getElementById('runInput');
  const runSendBtn=document.getElementById('runSendBtn');
  const runRestartBtn=document.getElementById('runRestartBtn');
  const runCloseBtn=document.getElementById('runCloseBtn');
  const runState=document.getElementById('runState');
  const runBtn=document.getElementById('runBtn');
  const debugBtn=document.getElementById('debugBtn');
  const runStepBtn=document.getElementById('runStepBtn');
  const executionSpeedInput=document.getElementById('executionSpeed');
  const DEFAULT_EXECUTION_SPEED=500;
  const runResizeHandle=document.getElementById('runResizeHandle');
  let runResize=null;

  function getExecutionDelay(){
    const value=Number(executionSpeedInput?.value);
    if(!Number.isFinite(value)) return DEFAULT_EXECUTION_SPEED;
    return Math.max(0, Math.min(3000, Math.round(value / 50) * 50));
  }

  function setRunPanelWidth(width){
    const min=360;
    const max=Math.min(520, Math.max(320, window.innerWidth * 0.55));
    const w=Math.max(min, Math.min(max, width));
    const px=`${Math.round(w)}px`;
    runOverlay.style.setProperty('--run-panel-width', px);
    document.documentElement.style.setProperty('--side-panel-width', px);
  }

  runResizeHandle.addEventListener('pointerdown', e=>{
    if(window.matchMedia('(max-width: 800px)').matches) return;
    runResize={startX:e.clientX,startWidth:runOverlay.getBoundingClientRect().width,pointerId:e.pointerId};
    runResizeHandle.classList.add('dragging');
    runResizeHandle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });

  runResizeHandle.addEventListener('pointermove', e=>{
    if(!runResize) return;
    const width=runResize.startWidth + (runResize.startX-e.clientX);
    setRunPanelWidth(width);
  });

  function stopRunResize(e){
    if(!runResize) return;
    runResizeHandle.releasePointerCapture?.(runResize.pointerId);
    runResize=null;
    runResizeHandle.classList.remove('dragging');
  }
  runResizeHandle.addEventListener('pointerup', stopRunResize);
  runResizeHandle.addEventListener('pointercancel', stopRunResize);
  window.addEventListener('resize', ()=>{
    if(window.matchMedia('(max-width: 800px)').matches) return;
    const current=runOverlay.getBoundingClientRect().width;
    setRunPanelWidth(current);
  });

  const execution={
    running:false,
    stopped:false,
    debugging:false,
    currentNode:null,
    waitInput:null,
    vars:Object.create(null),
    lastPrompt:'',
    startId:null,
    debugNextId:null,
    debugWaitingInput:false
  };

  function runEscapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function runPrint(text, cls=''){
    const div=document.createElement('div');
    div.className='run-line'+(cls?' '+cls:'');
    div.innerHTML=runEscapeHtml(String(text));
    runOutput.appendChild(div);
    const hidden=runOutput.classList.contains('log-off') && cls.includes('interpreter') && !cls.includes('success');
    if(!hidden) runOutput.scrollTop=runOutput.scrollHeight;
  }

  // Chave "Mostrar log": esconde/mostra todas as linhas cinzas do interpretador (início, aguardando valor,
  // condições, debug, execução concluída) sem perder as linhas. Saída do programa, valores digitados,
  // erros e o "Fluxograma finalizado" ficam sempre visíveis.
  const runLogToggle=document.getElementById('runLogToggle');
  const LOG_KEY='editor_fluxograma_log';
  let logOn=true;
  try{ logOn=localStorage.getItem(LOG_KEY)!=='off'; }catch(_){}
  runLogToggle.checked=logOn;
  runOutput.classList.toggle('log-off',!logOn);
  runLogToggle.onchange=()=>{
    runOutput.classList.toggle('log-off',!runLogToggle.checked);
    try{ localStorage.setItem(LOG_KEY,runLogToggle.checked?'on':'off'); }catch(_){}
    runOutput.scrollTop=runOutput.scrollHeight;
  };

  function runSetState(text){
    // O estado detalhado deve aparecer no console, não no cabeçalho.
    if(text && text !== 'Executando...' && text !== 'Erro' && text !== 'Preparando...') {
      // Evita duplicar mensagens de conclusão/erro que já são impressas diretamente.
      if(!runOutput.lastElementChild || runOutput.lastElementChild.textContent !== String(text)) {
        runPrint(text, 'interpreter');
      }
    }
  }

  function runOpen(){
    const sidePanelWidth=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--side-panel-width')) || 440;
    setRunPanelWidth(sidePanelWidth);
    runOverlay.hidden=false;
    document.body.classList.add('running-console');
    runOutput.innerHTML='';
    runInputArea.hidden=true;
    runInput.value='';
    execution.running=false;
    execution.stopped=false;
    execution.debugging=false;
    execution.currentNode=null;
    execution.debugNextId=null;
    execution.debugWaitingInput=false;
    state.executionId=null;
    runStepBtn.hidden=true;
    runStepBtn.disabled=true;
    runStopBtn.hidden=true;
    render();
    runPrint('Clique em Executar para iniciar o fluxograma.');
  }

  function runClearHighlight(){
    state.executionId=null;
    execution.currentNode=null;
    render();
  }

  function runClose(){
    execution.stopped=true;
    execution.running=false;
    execution.debugging=false;
    execution.waitInput=null;
    execution.debugNextId=null;
    execution.debugWaitingInput=false;
    runInputArea.hidden=true;
    runStepBtn.hidden=true;
    runStepBtn.disabled=true;
    runStopBtn.hidden=true;
    runClearHighlight();
    runOverlay.hidden=true;
    document.body.classList.remove('running-console');
    runBtn.classList.remove('running');
    runBtn.textContent='▶ Executar';
  }

  function runStop(){
    execution.stopped=true;
    execution.running=false;
    execution.debugging=false;
    execution.debugNextId=null;
    execution.debugWaitingInput=false;
    if(execution.waitInput){
      execution.waitInput.reject(new Error('Execução interrompida pelo usuário.'));
      execution.waitInput=null;
    }
    runInputArea.hidden=true;
    runSetState('Execução interrompida.');
    runPrint('Execução interrompida.', 'error');
    runStepBtn.hidden=true;
    runStepBtn.disabled=true;
    runStopBtn.hidden=true;
    runClearHighlight();
    runBtn.classList.remove('running');
    runBtn.textContent='▶ Executar';
  }

  function runSleep(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
  }
  // Declarado explicitamente: antes o código dependia do id="runStopBtn" virar variável global do window.
  const runStopBtn=document.getElementById('runStopBtn');

  function runNormalizeDecimal(value){
    const s=String(value).trim();
    if(/^[-+]?\d{1,3}(?:\.\d{3})*,\d+$/.test(s)) return s.replace(/\./g,'').replace(',','.');
    if(/^[-+]?\d+,\d+$/.test(s)) return s.replace(',','.');
    return s;
  }

  function runParseInput(value){
    const normalized=runNormalizeDecimal(value);
    if(normalized==='') return '';
    const num=Number(normalized);
    return Number.isFinite(num) ? num : value;
  }

  function runIdentifierList(){
    return Object.keys(execution.vars).filter(k=>runIsIdentifier(k));
  }

  function runUndeclaredVariables(expr){
    const source=String(expr||'');
    const ids=new Set();
    let cleaned='';
    let quote=null;

    for(let i=0;i<source.length;i++){
      const ch=source[i];
      if(quote){
        if(ch===quote && source[i-1]!=='\\') quote=null;
        cleaned+=' ';
        continue;
      }
      if(ch==='"' || ch==="'"){
        quote=ch;
        cleaned+=' ';
        continue;
      }
      cleaned+=ch;
    }

    for(const name of cleaned.match(/[A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*/g) || []){
      if(RUN_RESERVED_LITERALS.has(name)) continue;
      if(runIsIdentifier(name) && !(name in execution.vars)) ids.add(name);
    }
    return [...ids];
  }

  function runAssertKnownVariables(expr, context='expressão'){
    const missing=runUndeclaredVariables(expr);
    if(missing.length){
      const plural=missing.length>1;
      const list=missing.map(v=>`"${v}"`).join(', ');
      throw new Error(`${plural?'Variáveis não declaradas':'Variável não declarada'} em ${context}: ${list}. Declare ${plural?'essas variáveis':'essa variável'} em um bloco Processo antes de utilizá-la (ex.: soma = 0).`);
    }
  }

  function runAssertAssignedVariables(expr, context='expressão'){
    runAssertKnownVariables(expr,context);
    const used=[...new Set((String(expr||'').match(/[A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*/g)||[]))]
      .filter(name=>!RUN_RESERVED_LITERALS.has(name));
    const unassigned=used.filter(name=>name in execution.vars && execution.vars[name]===undefined);
    if(unassigned.length){
      const list=unassigned.map(v=>`"${v}"`).join(', ');
      throw new Error(`${unassigned.length>1?'Variáveis':'Variável'} ainda sem valor em ${context}: ${list}. Verifique se receberam uma entrada antes de serem utilizadas.`);
    }
  }

  function runEval(expr, condition=false){
    let source=String(expr||'').trim();
    if(!source) throw new Error('Expressão vazia.');
    source=source.replace(/,/g,'.');
    source=source.replace(/\^/g,'**');
    if(condition) source=source.replace(/(^|[^<>=!])=([^=])/g,'$1==$2');

    if(!/^[\s\dA-Za-z_$\u00C0-\uFFFF+\-*/%().,<>=!&|?:'"\[\]]+$/.test(source)){
      throw new Error('Expressão contém caracteres não suportados: '+expr);
    }

    runAssertAssignedVariables(source, condition ? 'condição' : 'expressão');

    const names=runIdentifierList();
    const values=names.map(name=>execution.vars[name]);
    let result;
    try{
      const fn=new Function(...names, `"use strict"; return (${source});`);
      result=fn(...values);
    }catch(err){
      if(err instanceof ReferenceError) throw new Error(`Não foi possível avaliar "${expr}". Verifique as variáveis declaradas.`);
      if(err instanceof SyntaxError) throw new Error(`Expressão inválida: "${expr}".`);
      throw new Error(`Erro ao avaliar "${expr}": ${err.message}`);
    }
    if(typeof result==='number' && !Number.isFinite(result)){
      throw new Error(`A expressão "${expr}" produziu um resultado inválido. Verifique, por exemplo, se houve divisão por zero.`);
    }
    return result;
  }

  function runEvalOutput(text){
    const raw=String(text||'').trim();
    if(!raw) throw new Error('Bloco "Exibir na tela" está vazio.');
    const parts=runSplitTopLevel(raw);
    const evalPiece=part=>{
      const p=part.trim();
      if((p.startsWith('"')&&p.endsWith('"')) || (p.startsWith("'")&&p.endsWith("'"))) return p.slice(1,-1);
      return runEval(p);
    };
    if(parts.length===1){
      const only=parts[0];
      if((only.startsWith('"')&&only.endsWith('"')) || (only.startsWith("'")&&only.endsWith("'"))) return only.slice(1,-1);
      const adjacent=only.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s+(.+)$/);
      if(adjacent) return adjacent[1].slice(1,-1) + String(runEval(adjacent[2]));
    }
    return parts.map(evalPiece).map(v=>v==null?'':String(v)).join('');
  }

  function runAssignments(text){
    const statements=String(text||'').replace(/\r/g,'').split(/[;\n]+/).map(s=>s.trim()).filter(Boolean);
    if(!statements.length) throw new Error('Bloco Processo está vazio.');

    for(const statement of statements){
      const parts=runSplitTopLevel(statement, ',').filter(Boolean);
      for(const part of parts){
        const item=part.trim();
        const m=item.match(/^([A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*)\s*=\s*(.+)$/);
        if(m){
          const target=m[1], expression=m[2].trim();
          if(!expression) throw new Error(`Atribuição inválida para "${target}": a expressão está vazia.`);
          execution.vars[target]=runEval(expression);
        }else if(runIsIdentifier(item)){
          if(item in execution.vars) throw new Error(`A variável "${item}" já foi declarada.`);
          execution.vars[item]=undefined;
        }else{
          throw new Error(`Processo não reconhecido: ${item}. Use, por exemplo, "A, B" para só declarar ou "soma = 0" para criar a variável já com valor.`);
        }
      }
    }
  }

  function runReadInput(variable,prompt){
    runPromptLabel.textContent=prompt || `Digite ${variable}:`;
    runInput.value='';
    runInputArea.hidden=false;
    if(execution.debugging) execution.debugWaitingInput=true;
    runInput.focus();
    runSetState(`Aguardando valor para ${variable}`);
    return new Promise((resolve,reject)=>{
      execution.waitInput={resolve,reject,variable};
    });
  }

  async function runStepNode(node){
    execution.currentNode=node.id;
    state.executionId=node.id;
    render();
    await runSleep(getExecutionDelay());
    if(execution.stopped) throw new Error('Execução interrompida.');

    if(node.type==='inicio'){
      if(String(node.text).trim().toLowerCase()==='fim') return {kind:'end'};
      return {next:runOutgoing(node.id)[0]?.l?.to};
    }

    if(node.type==='entrada'){
      const output=runEvalOutput(node.text);
      runPrint(output, 'program');
      execution.lastPrompt=output;
      return {next:runOutgoing(node.id)[0]?.l?.to};
    }

    if(node.type==='variavel'){
      const variable=String(node.text||'').trim();
      if(!runIsIdentifier(variable)) throw new Error(`Nome de variável inválido: ${variable}`);
      if(!(variable in execution.vars)) execution.vars[variable]=undefined;   // a entrada cria a variável se ainda não existir
      // Reler uma variável que já tem valor é permitido (ex.: repetir a leitura até o valor ser válido).
      const prompt=execution.lastPrompt || `Digite ${variable}:`;
      execution.lastPrompt='';
      const value=await runReadInput(variable,prompt);
      execution.vars[variable]=value;
      runPrint(`${variable} = ${value}`, 'input');
      runInputArea.hidden=true;
      return {next:runOutgoing(node.id)[0]?.l?.to};
    }

    if(node.type==='processo'){
      runAssignments(node.text);
      return {next:runOutgoing(node.id)[0]?.l?.to};
    }

    if(node.type==='condicional'){
      if(!String(node.text||'').trim()) throw new Error('O Condicional está sem uma condição.');
      const value=runEval(node.text,true);
      if(typeof value!=='boolean' && typeof value!=='number') throw new Error(`A condição "${node.text}" não produziu um valor lógico.`);
      const result=Boolean(value);
      const loopMode=runCondOutputs(runOutgoing(node.id)).mode!=='N';
      runPrint(`Condição: ${node.text} → ${result ? (loopMode ? 'verdadeiro (repete)' : 'verdadeiro') : (loopMode ? 'falso (sai do laço)' : 'falso')}`, 'interpreter log');
      const branch=runBranchLink(node);
      const chosen=result ? branch.right : branch.left;
      if(!chosen) throw new Error(`O condicional "${node.text}" não possui a saída ${result ? 'V (verdadeiro)' : 'F (falso)'}.`);
      return {next:chosen.to};
    }

    if(node.type==='conector'){
      const outs=runOutgoing(node.id);
      if(outs.length===0) throw new Error('O Conector não possui uma saída.');
      if(outs.length>1) throw new Error('O Conector possui mais de uma saída. Deixe apenas uma conexão saindo dele.');
      return {next:outs[0].l.to};
    }

    throw new Error(`Tipo de bloco não suportado: ${node.type}`);
  }

  function debugPrepare(){
    if(execution.running) return;
    const start=runFindStart();
    if(!start){
      runSetState('Erro');
      runPrint('Não encontrei um bloco Início.', 'error');
      return;
    }
    try{
      runValidateProgram(start);
    }catch(err){
      runSetState('Erro de validação.');
      runPrint('Erro de validação: '+err.message, 'error');
      return;
    }

    execution.running=true;
    execution.stopped=false;
    execution.debugging=true;
    execution.vars=Object.create(null);
    execution.lastPrompt='';
    execution.startId=start.id;
    execution.debugNextId=start.id;
    execution.debugWaitingInput=false;
    runOutput.innerHTML='';
    runInputArea.hidden=true;
    runStepBtn.hidden=false;
    runStepBtn.disabled=false;
    runStopBtn.hidden=false;
    runBtn.classList.add('running');
    runBtn.textContent='⏸ Executando';
    runSetState('Modo debug — clique em "Próximo".');
    runPrint('Modo debug iniciado. Cada clique executa uma instrução.', 'interpreter');
    state.executionId=start.id;
    render();
  }

  function runDebugResolveNode(startId){
    let id=startId;
    const visited=new Set();

    while(id){
      if(visited.has(id)) throw new Error('Foi encontrada uma sequência de Conectores em ciclo.');
      visited.add(id);

      const node=getNode(id);
      if(!node) throw new Error(`Bloco ${id} não encontrado.`);

      // No modo de depuração, o Conector é apenas um ponto de passagem:
      // ele não consome um clique em "Próximo" e não fica destacado.
      if(node.type!=='conector') return node.id;

      const outs=runOutgoing(node.id);
      if(outs.length===0) throw new Error('O Conector não possui uma saída.');
      if(outs.length>1) throw new Error('O Conector possui mais de uma saída. Deixe apenas uma conexão saindo dele.');
      id=outs[0].l.to;
    }

    return null;
  }

  async function runDebugStep(){
    if(!execution.debugging || !execution.running || execution.debugWaitingInput) return;

    try{
      const currentId=runDebugResolveNode(execution.debugNextId);
      if(!currentId){
        runFinishDebug();
        return;
      }

      const node=getNode(currentId);
      if(!node) throw new Error(`Bloco ${currentId} não encontrado.`);

      execution.debugNextId=node.id;
      state.executionId=node.id;
      execution.currentNode=node.id;
      runPrint(`Debug: executando → ${node.text || node.type}`, 'interpreter log');
      render();

      if(execution.stopped || !execution.debugging) return;

      const result=await runStepNode(node);
      if(result.kind==='end'){
        runSetState('Execução concluída.');
        runPrint('✓ Fluxograma finalizado.', 'success interpreter');
        runFinishDebug();
        return;
      }
      if(!result.next) throw new Error(`O bloco "${node.text || node.type}" não possui uma próxima conexão.`);

      const nextId=runDebugResolveNode(result.next);
      execution.debugNextId=nextId;
      execution.debugWaitingInput=false;
      runPrint(`Debug: próximo → ${getNode(nextId)?.text || getNode(nextId)?.type || 'desconhecida'}`, 'interpreter log');
      state.executionId=nextId;
      render();
      runStepBtn.disabled=false;
    }catch(err){
      if(!execution.stopped){
        runSetState('Erro na execução.');
        runPrint('Erro: '+err.message, 'error');
      }
      runFinishDebug();
    }
  }

  function runFinishDebug(){
    execution.running=false;
    execution.debugging=false;
    execution.waitInput=null;
    execution.debugNextId=null;
    execution.debugWaitingInput=false;
    runInputArea.hidden=true;
    runStepBtn.hidden=true;
    runStepBtn.disabled=true;
    runStopBtn.hidden=true;
    runClearHighlight();
    runBtn.classList.remove('running');
    runBtn.textContent='▶ Executar';
  }

  async function runProgram(){
    if(execution.running) return;
    const start=runFindStart();
    if(!start){
      runSetState('Erro');
      runPrint('Não encontrei um bloco Início.', 'error');
      return;
    }
    try{
      runValidateProgram(start);
    }catch(err){
      runSetState('Erro de validação.');
      runPrint('Erro de validação: '+err.message, 'error');
      return;
    }
    execution.running=true;
    execution.stopped=false;
    execution.debugging=false;
    execution.debugNextId=null;
    execution.debugWaitingInput=false;
    execution.vars=Object.create(null);
    execution.lastPrompt='';
    execution.startId=start.id;
    runOutput.innerHTML='';
    runInputArea.hidden=true;
    runStepBtn.hidden=true;
    runStepBtn.disabled=true;
    runStopBtn.hidden=false;
    runBtn.classList.add('running');
    runBtn.textContent='⏸ Executando';
    runSetState('Executando...');
    runPrint('Início da execução.', 'interpreter');

    const visited=new Map();
    let currentId=start.id;
    let steps=0;
    const MAX_STEPS=5000;

    try{
      while(currentId){
        if(execution.stopped) throw new Error('Execução interrompida.');
        if(++steps>MAX_STEPS) throw new Error('O programa excedeu 5000 passos. Verifique se existe um loop infinito.');
        visited.set(currentId,(visited.get(currentId)||0)+1);
        const node=getNode(currentId);
        if(!node) throw new Error(`Bloco ${currentId} não encontrado.`);
        const result=await runStepNode(node);
        if(result.kind==='end'){
          runSetState('Execução concluída.');
          runPrint('✓ Fluxograma finalizado.', 'success interpreter');
          break;
        }
        if(!result.next) throw new Error(`O bloco "${node.text || node.type}" não possui uma próxima conexão.`);
        currentId=result.next;
      }
    }catch(err){
      if(!execution.stopped){
        runSetState('Erro na execução.');
        runPrint('Erro: '+err.message, 'error');
      }
    }finally{
      execution.running=false;
      execution.waitInput=null;
      runInputArea.hidden=true;
      runClearHighlight();
      runStopBtn.hidden=true;
      document.body.classList.remove('running-console');
      runBtn.classList.remove('running');
      runBtn.textContent='▶ Executar';
    }
  }

  runSendBtn.onclick=()=>{
    if(!execution.waitInput) return;
    const raw=runInput.value;
    const waiter=execution.waitInput;
    execution.waitInput=null;
    runInputArea.hidden=true;
    if(execution.debugging){
      execution.debugWaitingInput=false;
      waiter.resolve(runParseInput(raw));
      runSetState('Entrada recebida. Clique em "Próximo" para continuar.');
      return;
    }
    waiter.resolve(runParseInput(raw));
  };

  runInput.addEventListener('keydown',e=>{
    if(e.key==='Enter') runSendBtn.click();
  });

  executionSpeedInput?.addEventListener('change',()=>{
    const value=getExecutionDelay();
    executionSpeedInput.value=String(value);
    try{
      localStorage.setItem('editorFluxogramas.executionSpeed', String(value));
      localStorage.setItem('editorFluxogramas.executionSpeedInitialized', '1');
    }catch{}
  });

  try{
    const speedInitialized=localStorage.getItem('editorFluxogramas.executionSpeedInitialized')==='1';
    const savedSpeed=Number(localStorage.getItem('editorFluxogramas.executionSpeed'));
    if(!speedInitialized){
      executionSpeedInput.value=String(DEFAULT_EXECUTION_SPEED);
      localStorage.setItem('editorFluxogramas.executionSpeed', String(DEFAULT_EXECUTION_SPEED));
      localStorage.setItem('editorFluxogramas.executionSpeedInitialized', '1');
    }else if(savedSpeed===250){
      executionSpeedInput.value=String(DEFAULT_EXECUTION_SPEED);
      localStorage.setItem('editorFluxogramas.executionSpeed', String(DEFAULT_EXECUTION_SPEED));
    }else if(Number.isFinite(savedSpeed)){
      executionSpeedInput.value=String(Math.max(0, Math.min(3000, Math.round(savedSpeed / 50) * 50)));
    }else{
      executionSpeedInput.value=String(DEFAULT_EXECUTION_SPEED);
    }
  }catch{
    executionSpeedInput.value=String(DEFAULT_EXECUTION_SPEED);
  }

  runCloseBtn.onclick=runClose;
  runStopBtn.onclick=runStop;
  runStepBtn.onclick=runDebugStep;
  runRestartBtn.onclick=()=>{
    const wasDebug=execution.debugging;
    execution.stopped=true;
    if(execution.waitInput){ execution.waitInput.reject(new Error('Execução reiniciada.')); execution.waitInput=null; }
    execution.running=false;
    execution.debugging=false;
    execution.debugNextId=null;
    execution.debugWaitingInput=false;
    runInputArea.hidden=true;
    state.executionId=null;
    runOutput.innerHTML='';
    render();
    setTimeout(()=>{
      if(wasDebug){
        execution.running=false;
        debugPrepare();
      }else{
        runProgram();
      }
    },0);
  };
  runBtn.onclick=()=>{
    runOpen();
    runProgram();
  };
  debugBtn.onclick=()=>{
    runOpen();
    runOutput.innerHTML='';
    debugPrepare();
  };
  runOverlay.addEventListener('click',e=>{ if(e.target===runOverlay) runClose(); });

  Object.assign(Fluxo, {
    runEval,
    runEvalOutput,
    runAssignments,
    runStepNode,
    runProgram,
    debugPrepare,
    runDebugStep,
    execution
  });
})();
