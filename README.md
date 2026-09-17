# Editor de Fluxogramas

Editor visual de fluxogramas desenvolvido em **HTML, CSS e JavaScript**, utilizando **SVG** para a representação dos elementos.

O projeto permite criar, editar, organizar, salvar e executar fluxogramas de forma simples e visual, sendo especialmente voltado para os exercícios de **Lógica de Programação**.

<img width="1900" height="934" alt="image" src="https://github.com/user-attachments/assets/9051b876-0735-42c8-8a83-1d1ca2aa56fb" />

---

## 🚀 Acesso rápido

### 👀 Quer apenas visualizar os exercícios resolvidos?

Os exercícios resolvidos estão organizados na pasta [`Exercícios`](./Exercícios), separados por lista.

Entre na lista desejada e abra o arquivo **PNG** do exercício que deseja visualizar.

👉 **[Acessar os exercícios resolvidos](./Exercícios)**

**OBS:** Qualquer erro encontrado nas minhas resoluções, peço que me avise.

### 🛠️ Quer utilizar o Editor de Fluxogramas?

Você pode utilizar a ferramenta diretamente pelo navegador, sem precisar instalar nada:

👉 **[Acessar o Editor de Fluxogramas](https://editor-fluxogramas.free.nf/)**

Ou, se preferir, pode executar o projeto localmente seguindo as instruções abaixo.

---

## 📚 Exercícios resolvidos

Os exercícios estão organizados por listas dentro da pasta [`Exercícios`](./Exercícios).

Cada lista possui os fluxogramas resolvidos em **PNG** e uma pasta **`json`** contendo os arquivos dos projetos correspondentes.

### 🖼️ PNG — Visualização

Os arquivos `.png` ficam diretamente dentro da pasta de cada lista e servem para **visualizar rapidamente** os fluxogramas resolvidos.

Exemplo:

```text
Exercícios/
└── Lista-01/
    ├── Exercício-01.png
    ├── Exercício-02.png
    ├── Exercício-03.png
    └── ...
```

### 📄 JSON — Abrir e editar

Dentro de cada lista existe uma pasta chamada **`json`**, contendo os arquivos dos projetos dos exercícios.

Os arquivos `.json` podem ser importados diretamente no Editor de Fluxogramas para visualizar, editar ou continuar trabalhando no exercício.

Exemplo:

```text
Exercícios/
└── Lista-01/
    ├── Exercício-01.png
    ├── Exercício-02.png
    ├── ...
    └── json/
        ├── Exercício-01.json
        ├── Exercício-02.json
        └── ...
```

### Como abrir um exercício no editor

1. Acesse a pasta [`Exercícios`](./Exercícios).
2. Entre na lista desejada, como `Lista-01` ou `Lista-02`.
3. Para apenas visualizar a resolução, abra o arquivo `.png`.
4. Para abrir e editar o fluxograma, entre na pasta `json`.
5. Baixe o arquivo `.json` correspondente.
6. Acesse o [Editor de Fluxogramas](https://editor-fluxogramas.free.nf/).
7. Utilize a opção **Abrir**.
8. Selecione o arquivo `.json` baixado.

O fluxograma será carregado diretamente no editor.

---
<img width="1896" height="976" alt="image" src="https://github.com/user-attachments/assets/16d61c42-e3b6-43b7-b95c-25ba87b6ae54" />

## ✨ Funcionalidades

* Criação e edição visual de fluxogramas
* Conexões entre os elementos
* Condicionais com ramificações
* Conectores para unir diferentes caminhos
* Edição dos textos dos elementos
* Movimentação dos elementos
* Salvamento automático do projeto
* Importação e exportação de projetos em **JSON**
* Exportação dos fluxogramas para **SVG e PNG**
* Execução dos fluxogramas através de um **interpretador**
* Validação de variáveis, expressões e estrutura do fluxograma
* Execução com acompanhamento visual dos blocos

---

## 🤖 Auxílio de IA

Os fluxogramas criados pelo editor podem ser salvos em formato **JSON**. Isso permite utilizar um fluxograma já resolvido como exemplo para ensinar uma IA a seguir o mesmo padrão de estrutura utilizado pelo projeto.

Por exemplo, você pode fornecer à IA um JSON de um exercício já resolvido e solicitar:

> "Este é o JSON de um exercício já resolvido. Entenda o padrão utilizado e gere o JSON para o exercício a seguir."

Em seguida, informe o novo exercício.

A IA poderá gerar um novo arquivo JSON seguindo a estrutura utilizada pelo editor. Esse arquivo pode ser importado diretamente na ferramenta para visualizar, editar e executar o fluxograma.

> **Dica:** fornecer mais de um exercício resolvido como exemplo pode ajudar a IA a identificar melhor o padrão utilizado.

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

Clone o repositório:

```bash
git clone https://github.com/lnyzz/Editor-de-Fluxogramas.git
```

Entre na pasta:

```bash
cd Editor-de-Fluxogramas
```

Depois, basta abrir o arquivo `index.html` no navegador.

### 🌐 Alternativa

Se não quiser baixar o projeto, utilize diretamente a versão online:

👉 **https://editor-fluxogramas.free.nf/**

---

## 🎯 Objetivo

O objetivo do projeto é facilitar a **criação, organização, visualização e execução de fluxogramas**, tornando mais prática a resolução dos exercícios de lógica de programação.

---

## 📂 Estrutura do projeto

```text
Editor-de-Fluxogramas/
│
├── index.html
│
├── Exercícios/
│   │
│   ├── Lista-01/
│   │   ├── Exercício-01.png
│   │   ├── Exercício-02.png
│   │   ├── Exercício-03.png
│   │   ├── ...
│   │   └── json/
│   │       ├── Exercício-01.json
│   │       ├── Exercício-02.json
│   │       ├── Exercício-03.json
│   │       └── ...
│   │
│   └── Lista-02/
│       ├── Exercício-01.png
│       ├── Exercício-02.png
│       ├── Exercício-03.png
│       ├── ...
│       └── json/
│           ├── Exercício-01.json
│           ├── Exercício-02.json
│           ├── Exercício-03.json
│           └── ...
│
└── ...
```

---

Desenvolvido para auxiliar nos estudos de **Lógica de Programação**.
