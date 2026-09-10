# Editor de Fluxogramas

Editor visual de fluxogramas desenvolvido em **HTML, CSS e JavaScript**, utilizando **SVG** para a representação dos elementos.

O projeto permite criar, editar, organizar, salvar e exportar fluxogramas de forma simples e visual, sendo especialmente voltado para os exercícios de **Lógica de Programação**.

<img width="1900" height="936" alt="image" src="https://github.com/user-attachments/assets/a21ba72a-67a4-4040-9a17-9fa01879087a" />

---

## 🚀 Acesso rápido

### 👀 Quer apenas visualizar os exercícios resolvidos?

Os fluxogramas resolvidos estão disponíveis em **PNG** na pasta:

📁 [`Exercícios`](./Exercícios)

Basta acessar a pasta e abrir a imagem do exercício que deseja visualizar.

OBS: Qualquer erro encontrado na minha resolução peço que me avise.

### 🛠️ Quer utilizar o Editor de Fluxogramas?

Você pode utilizar a ferramenta diretamente pelo navegador (Apenas PC), sem precisar instalar nada:

👉 **[Acessar o Editor de Fluxogramas](https://editor-fluxogramas.free.nf/)**

Ou, se preferir, pode executar o projeto localmente seguindo as instruções abaixo.

---

## 📚 Exercícios resolvidos

Os exercícios estão disponíveis em dois formatos:

### 🖼️ PNG — Visualização

Os fluxogramas prontos para **visualização** estão na pasta:

📁 [`Exercícios`](./Exercícios)

Os arquivos PNG permitem consultar rapidamente a resolução de cada exercício sem precisar abrir o editor.

### 📄 JSON — Abrir e editar

Os projetos dos fluxogramas estão disponíveis em:

📁 [`Exercícios/json`](./Exercícios/json)

Os arquivos `.json` podem ser importados diretamente no Editor de Fluxogramas para visualizar, editar ou continuar trabalhando no exercício.

### Como abrir um exercício no editor

1. Acesse a pasta [`Exercícios/json`](./Exercícios/json).
2. Escolha o exercício que deseja.
3. Baixe o arquivo `.json`.
4. Acesse o [Editor de Fluxogramas](https://editor-fluxogramas.free.nf/).
5. Utilize a opção **Abrir**.
6. Selecione o arquivo `.json` baixado.

O fluxograma será carregado diretamente no editor.

---

## ✨ Funcionalidades

* Criação e edição visual de fluxogramas
* Conexões entre os elementos
* Edição dos textos dos elementos
* Movimentação dos elementos
* Salvamento automático do projeto
* Importação e exportação de projetos em **JSON**
* Exportação dos fluxogramas para **SVG e PNG**

---

## 🤖 Auxílio de IA

Os fluxogramas criados pelo editor podem ser salvos em formato **JSON**. Isso permite utilizar um fluxograma já resolvido como exemplo para ensinar uma IA a seguir o mesmo padrão de estrutura utilizado no projeto.

Por exemplo, você pode fornecer à IA um JSON de um exercício já resolvido e solicitar:

> "Este é o JSON de um exercício já resolvido. Entenda o padrão utilizado e gere o JSON para o exercício a seguir."

Em seguida, informe o novo exercício.

A IA poderá gerar um novo arquivo JSON seguindo a estrutura utilizada pelo editor. Esse arquivo pode ser importado diretamente na ferramenta para visualizar e editar o fluxograma.

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

O objetivo do projeto é facilitar a **criação, organização e visualização de fluxogramas**, tornando mais prática a resolução dos exercícios de lógica de programação.

---

## 📂 Estrutura do projeto

```text
Editor-de-Fluxogramas/
│
├── index.html
│
├── Exercícios/
│   ├── exercício-01.png
│   ├── exercício-02.png
│   ├── exercício-03.png
│   └── ...
│
└── Exercícios/
    └── json/
        ├── exercício-01.json
        ├── exercício-02.json
        ├── exercício-03.json
        └── ...
```

---

Desenvolvido para auxiliar nos estudos de **Lógica de Programação**.
