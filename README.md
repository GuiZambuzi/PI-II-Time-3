# 📋 Sistema de Acompanhamento de Demandas de Desenvolvimento (Projeto Integrador II)

## 📌 Descrição do Projeto

Este projeto tem como objetivo o desenvolvimento de um **Sistema de Acompanhamento de Demandas de Desenvolvimento**, criado no contexto do **Projeto Integrador 2** do curso de **Engenharia de Software** da **Pontifícia Universidade Católica de Campinas (PUC-Campinas)**.

A proposta do sistema é acompanhar demandas relacionadas ao desenvolvimento de software, sendo inspirado em ferramentas utilizadas por equipes de tecnologia para organizar diferentes necessidades durante o desenvolvimento de um software.

O sistema contempla demandas como **tarefas**, **defeitos ("bugs")** e **melhorias**, buscando proporcionar uma forma organizada de acompanhar essas diferentes demandas de desenvolvimento.

---

## 👥 Integrantes

* Diego Prandi Dilva — RA 25002584
* Guilherme Henrique Lopes Zambuzi — RA 26003006
* João Pedro Barbosa da Silva — RA 25016974
* João Victor Grisolia Luis — RA 26005781
* Rafael França Cardoso — RA 26001772

---

## 🏫 Informações Acadêmicas

* **Instituição:** Pontifícia Universidade Católica de Campinas
* **Curso:** Engenharia de Software
* **Componente:** Projeto Integrador 2
* **Ano:** 2026

---

## ⚙️ Instalação e Execução

### Pré-requisitos

Antes de executar o projeto, é necessário ter instalado:

- [Node.js](https://nodejs.org/), preferencialmente uma versão LTS.
- npm, instalado junto com o Node.js.
- [Git](https://git-scm.com/).
- Banco de dados **Oracle** (por exemplo, o Oracle Database XE instalado localmente) e um usuário com acesso a ele.

### 1. Clonar o repositório

Clone o repositório do projeto:

```bash
git clone https://github.com/GuiZambuzi/PI-II-Time-3.git
```

Entre na pasta do projeto:

```bash
cd PI-II-Time-3
```

### 2. Instalar as dependências

Na pasta raiz do projeto, execute:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

Esses comandos instalam as dependências necessárias para executar o projeto, incluindo as do frontend e do backend.

### 3. Configurar a conexão com o banco de dados (Oracle)

A API se conecta ao Oracle pelo pacote `oracledb` (modo *thin*: **não** é preciso instalar o Oracle Instant Client). Os dados de acesso ficam no arquivo `backend/.env`, que **não vai para o GitHub** (está no `.gitignore`).

**3.1.** Copie o modelo `.env-example` (na raiz do projeto) para **`backend/.env`**.

No Git Bash, Linux ou macOS (na pasta raiz):

```bash
cp .env-example backend/.env
```

No PowerShell (na pasta raiz):

```powershell
Copy-Item .env-example backend/.env
```

**3.2.** Abra o `backend/.env` e preencha com os dados do **seu** banco:

```env
ORACLE_HOST=localhost
ORACLE_PORT=1521
ORACLE_SERVICE=XEPDB1
ORACLE_USER=seu_user
ORACLE_PASSWORD=sua_senha
```

| Variável | O que é |
|---|---|
| `ORACLE_HOST` | Endereço do servidor do banco (`localhost` se o Oracle estiver no seu computador) |
| `ORACLE_PORT` | Porta do Oracle (padrão `1521`) |
| `ORACLE_SERVICE` | Nome do serviço do banco (no Oracle XE, normalmente `XEPDB1`) |
| `ORACLE_USER` | Usuário do banco |
| `ORACLE_PASSWORD` | Senha desse usuário |

> ⚠️ O arquivo precisa ficar **dentro da pasta `backend/`** (e não na raiz), pois é lá que o backend é executado e procura o `.env`. Nunca faça commit do `.env` nem coloque senhas no código.

**3.3.** Ao iniciar o backend (passos 4 e 5), confira a mensagem no terminal:

- `Conexão com o Oracle estabelecida.` → banco configurado corretamente.
- `Não foi possível conectar ao Oracle: ...` → o servidor sobe mesmo assim, mas sem o banco. Confira se o Oracle está ligado e se os dados do `backend/.env` estão corretos, e reinicie o backend.

Erros mais comuns:

| Mensagem | O que conferir |
|---|---|
| `NJS-101: no credentials specified` | O arquivo `backend/.env` não existe ou está fora da pasta `backend/` |
| `ORA-01017: invalid username/password` | Usuário ou senha incorretos |
| `NJS-503 ... ECONNREFUSED` | O Oracle não está rodando, ou o host/porta estão errados |
| `NJS-518` / `ORA-12514` | Nome do serviço (`ORACLE_SERVICE`) incorreto |

### 4. Executar somente o backend para testes

Para iniciar apenas o servidor backend, execute na pasta raiz:

```bash
npm run dev --prefix backend
```

### 5. Executar o frontend e o backend

Para iniciar os dois servidores simultaneamente, execute na pasta raiz:

```bash
npm run dev
```

Esse comando utiliza o `concurrently` para iniciar o frontend e o backend ao mesmo tempo.

**Observação:** mantenha o terminal aberto enquanto estiver utilizando o sistema. Para encerrar os servidores, pressione `Ctrl + C`.

---

## 📋 Sistema

O **Sistema de Acompanhamento de Demandas de Desenvolvimento** é inspirado em ferramentas utilizadas por equipes de tecnologia para a organização de demandas relacionadas a um software.

Entre os tipos de demandas considerados no projeto estão:

* 📝 Tarefas
* 🐛 Defeitos ("Bugs")
* ✨ Melhorias

A proposta é trabalhar com essas diferentes categorias de demandas dentro de um sistema voltado ao acompanhamento do desenvolvimento de software.

---

## 📄 Documento de Visão

**Sistema:** Sistema de Acompanhamento de Demandas de Desenvolvimento
**Componente:** Projeto Integrador 2
**Curso:** Engenharia de Software
**Instituição:** Pontifícia Universidade Católica de Campinas
**Ano:** 2026

---

## ⚠️ Observação

Este projeto foi desenvolvido no contexto acadêmico do **Projeto Integrador 2** do curso de **Engenharia de Software** da **Pontifícia Universidade Católica de Campinas**.

Seu desenvolvimento tem como foco o **Sistema de Acompanhamento de Demandas de Desenvolvimento**, inspirado em ferramentas utilizadas por equipes de tecnologia para organizar tarefas, defeitos ("bugs") e melhorias de um software.
