# Editor de Fluxogramas

Editor visual de fluxogramas desenvolvido em **HTML, CSS e JavaScript**, utilizando **SVG** para representar os elementos.

O projeto permite criar, editar, organizar, salvar e **executar fluxogramas**, sendo especialmente voltado para exercícios de **Lógica de Programação**.

<img width="1908" height="943" alt="image" src="https://github.com/user-attachments/assets/1fe9185d-84d5-4255-a74f-9d088c5004ce" />

---

## 🚀 Acesso rápido

### 👀 Quer apenas visualizar os exercícios resolvidos?

Os exercícios estão na pasta [`Exercícios`](./Exercícios), separados por listas.

Os arquivos **PNG** servem para visualizar as resoluções. Dentro de cada lista, a pasta **`json`** contém os arquivos que podem ser abertos e editados no editor.

👉 **[Acessar os exercícios](./Exercícios)**

**OBS:** Qualquer erro encontrado nas minhas resoluções, peço que me avise.

### 🛠️ Quer utilizar o Editor de Fluxogramas?

Acesse diretamente pelo navegador:

👉 **[Editor de Fluxogramas](https://editor-fluxogramas.free.nf/)**

Ou execute o projeto localmente.

---

## ✨ Funcionalidades

* Criação e edição visual de fluxogramas
* Edição dos textos e movimentação dos blocos
* Salvamento automático
* Importação e exportação em **JSON**
* Exportação para **SVG e PNG**
* Suporte a **celulares e tablets**
* **Interpretador** para executar e testar o fluxograma
* **Depurador** para acompanhar a execução passo a passo
* Controle do **delay de execução** entre as instruções

### ▶️ Interpretador

O interpretador permite executar o fluxograma diretamente no editor, recebendo entradas, realizando cálculos, avaliando condições e mostrando os resultados no console.

Ele também identifica erros, como variáveis não declaradas e problemas na estrutura do fluxograma.

https://github.com/user-attachments/assets/9f08119d-3cd4-45ef-9eb1-de2c63798f20

O console fica na lateral e pode ser **redimensionado** para aumentar ou diminuir seu espaço.

### 🐞 Depurador

O **Depurar** permite acompanhar a execução do fluxograma de forma controlada, facilitando a visualização do que acontece em cada instrução.

Durante a depuração, o bloco que está sendo executado é destacado e o botão **Próximo** permite avançar para a próxima instrução.

O **delay de execução** define o intervalo entre as instruções executadas automaticamente. O valor padrão é de **500 ms** e pode ser ajustado nas propriedades do editor.

---

## 📚 Exercícios resolvidos

Os exercícios são organizados por listas:

```text
Exercícios/
├── Lista-01/
│   ├── Exercício-01.png
│   ├── Exercício-02.png
│   └── json/
│       ├── Exercício-01.json
│       └── Exercício-02.json
│
└── Lista-02/
    ├── Exercício-01.png
    ├── Exercício-02.png
    └── json/
        ├── Exercício-01.json
        └── Exercício-02.json
```

Os **PNG** são para visualização. Os **JSON** podem ser importados no editor para abrir, editar e executar os fluxogramas.

---

## 🤖 Auxílio de IA

Como os fluxogramas são salvos em **JSON**, é possível fornecer um exemplo de exercício resolvido para uma IA e pedir que ela gere outro JSON seguindo o mesmo padrão.

Exemplo:

> "Este é o JSON de um exercício já resolvido. Entenda o padrão utilizado e gere o JSON para o exercício a seguir."

O arquivo gerado pode ser importado diretamente no editor.

---

## 🛠️ Tecnologias

* **HTML5**
* **CSS3**
* **JavaScript**
* **SVG**
* **LocalStorage**

---

## 💻 Como executar localmente

O projeto não necessita de instalação de dependências.

```bash
git clone https://github.com/lnyzz/Editor-de-Fluxogramas.git
cd Editor-de-Fluxogramas
```

Depois, abra o arquivo `index.html` no navegador.

### 🌐 Versão online

👉 **https://editor-fluxogramas.free.nf/**

---

## 🎯 Objetivo

Facilitar a **criação, visualização, execução e depuração de fluxogramas** para os estudos de **Lógica de Programação**.
