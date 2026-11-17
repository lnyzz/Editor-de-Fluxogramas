/* main.js — inicialização: recupera o rascunho ou cria o programa base "Hello, World!". */
(() => {
  const {state, getNode, fitBtn, addNode, autoSizeNode, render, showInspector, restoreAutosave} = Fluxo;

  // Programa base: exatamente 3 blocos
  state.nodes = [];
  state.links = [];
  state.selectedId = null;
  state.nextId = 1;

  const recovered = restoreAutosave();

  function addBaseNode(type, x, y, text){
    addNode(type, x, y);
    const n = getNode(state.selectedId);
    n.text = text;
    autoSizeNode(n);
    return n.id;
  }

  if(!recovered){
  const helloStart = addBaseNode('inicio', 625, 90, 'Início');
  const helloMessage = addBaseNode('entrada', 550, 250, '"Hello, World!"');   // centro em x=700, alinhado ao Início/Fim
  const helloEnd = addBaseNode('inicio', 625, 430, 'Fim');

  state.links.push(
    {from: helloStart, to: helloMessage},
    {from: helloMessage, to: helloEnd}
  );

  state.selectedId = null;
  }

  state.nodes.forEach(autoSizeNode);
  render();
  showInspector();

  // Centraliza automaticamente o Hello World da tela inicial.
  if(!recovered){
    fitBtn.click();
  }
})();
