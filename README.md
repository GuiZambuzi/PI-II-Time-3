# 📋 Sistema de Acompanhamento de Demandas de Desenvolvimento (Projeto Integrador II)

## 📌 Descrição do Projeto

Este projeto tem como objetivo o desenvolvimento de um **Sistema de Acompanhamento de Demandas de Desenvolvimento**, criado no contexto do **Projeto Integrador 2** do curso de **Engenharia de Software** da **Pontifícia Universidade Católica de Campinas (PUC-Campinas)**.

A proposta do sistema é acompanhar demandas relacionadas ao desenvolvimento de software, sendo inspirado em ferramentas utilizadas por equipes de tecnologia para organizar diferentes necessidades durante o desenvolvimento de um software.

O sistema contempla demandas como **tarefas**, **defeitos ("bugs")**, **melhorias** e **documentação**, buscando proporcionar uma forma organizada de acompanhar essas diferentes demandas de desenvolvimento.

---

## 👥 Integrantes

* Diego Prandi Silva — RA 25002584
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

## 🛠️ Tecnologias

* **Frontend:** HTML5, CSS3 e JavaScript, servidos pelo [Vite](https://vite.dev/) (porta `5173`).
* **Backend:** Node.js com TypeScript e Express (porta `3000`).
* **Banco de dados:** Oracle, acessado pelo pacote `oracledb`.
* **Autenticação:** sessão com cookie (`express-session`) e senhas armazenadas com hash `bcrypt` (`bcryptjs`).

### Estrutura de pastas

```
PI-II-Time-3/
├── backend/
│   └── src/
│       ├── database/db.ts    → conexão (pool) com o Oracle
│       ├── middleware/       → exigirLogin (autenticação) e permissoes (perfis)
│       ├── routes/           → rotas da API
│       └── server.ts         → servidor Express
├── frontend/
│   ├── pages/                → telas (login, dashboard, listagem, cadastro, detalhes)
│   ├── scripts/              → JavaScript de cada tela (sessao.js é comum às telas internas)
│   └── styles/               → CSS de cada tela
├── docs/script.sql           → criação das tabelas e carga inicial do banco
└── .env-example              → modelo do arquivo de configuração do banco
```

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

As dependências são instaladas em três lugares: na raiz, no `frontend` e no `backend`. A partir da pasta raiz do projeto, execute:

```bash
npm install
```

```bash
cd frontend
npm install
cd ..
```

```bash
cd backend
npm install
cd ..
```

> ⚠️ Instale entrando em cada pasta, como acima. **Não** use `npm install --prefix frontend` / `npm install --prefix backend` a partir da raiz: nas versões recentes do npm isso adiciona por engano a dependência `"pi-ii-time-3": "file:.."` nos `package.json`.

### 3. Criar o banco de dados (Oracle)

O script `docs/script.sql` cria todas as tabelas (usuários, projetos, vínculos usuário–projeto, demandas, comentários e histórico de alterações) e insere os dados iniciais (usuários dos três perfis, projetos, demandas e comentários). As senhas dos usuários são gravadas como hash `bcrypt`.

1. Abra o **Oracle SQL Developer** e conecte-se com o usuário que a API vai usar (o mesmo do `backend/.env`, passo 4).
2. Abra o arquivo `docs/script.sql`.
3. Execute o script inteiro com **F5** (*Executar Script*). Não use Ctrl+Enter, que executa só o comando onde está o cursor.

> O script termina com `COMMIT`. Se precisar recriar o banco, apague antes as tabelas existentes (`DROP TABLE ... CASCADE CONSTRAINTS`), senão o Oracle acusa que as tabelas já existem.

### 4. Configurar a conexão com o banco de dados (Oracle)

A API se conecta ao Oracle pelo pacote `oracledb` (modo *thin*: **não** é preciso instalar o Oracle Instant Client). Os dados de acesso ficam no arquivo `backend/.env`, que **não vai para o GitHub** (está no `.gitignore`).

**4.1.** Copie o modelo `.env-example` (na raiz do projeto) para **`backend/.env`**.

No Git Bash, Linux ou macOS (na pasta raiz):

```bash
cp .env-example backend/.env
```

No PowerShell (na pasta raiz):

```powershell
Copy-Item .env-example backend/.env
```

**4.2.** Abra o `backend/.env` e preencha com os dados do **seu** banco:

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

**4.3.** Ao iniciar o backend (passos 5 e 6), confira a mensagem no terminal:

- `Conexão com o Oracle estabelecida.` → banco configurado corretamente.
- `Não foi possível conectar ao Oracle: ...` → o servidor sobe mesmo assim, mas sem o banco. Confira se o Oracle está ligado e se os dados do `backend/.env` estão corretos, e reinicie o backend.

Erros mais comuns:

| Mensagem | O que conferir |
|---|---|
| `NJS-101: no credentials specified` | O arquivo `backend/.env` não existe ou está fora da pasta `backend/` |
| `ORA-01017: invalid username/password` | Usuário ou senha incorretos |
| `NJS-503 ... ECONNREFUSED` | O Oracle não está rodando, ou o host/porta estão errados |
| `NJS-518` / `ORA-12514` | Nome do serviço (`ORACLE_SERVICE`) incorreto |
| `ORA-00942: a tabela ou view não existe` | As tabelas não foram criadas (passo 3) ou foram criadas com outro usuário/serviço diferente do `backend/.env` |
| Login sempre responde "E-mail ou senha inválidos." | A tabela `usuarios` está vazia ou as senhas não estão com hash — execute o `docs/script.sql` atual |

### 5. Executar somente o backend para testes

Para iniciar apenas o servidor backend, execute na pasta raiz:

```bash
npm run dev --prefix backend
```

A API fica disponível em `http://localhost:3000`.

### 6. Executar o frontend e o backend

Para iniciar os dois servidores simultaneamente, execute na pasta raiz:

```bash
npm run dev
```

Esse comando utiliza o `concurrently` para iniciar o frontend e o backend ao mesmo tempo. Depois, acesse o sistema em:

**http://localhost:5173/pages/login.html**

**Observação:** mantenha o terminal aberto enquanto estiver utilizando o sistema. Para encerrar os servidores, pressione `Ctrl + C`.

### 7. Usuários de teste

Todos os usuários abaixo são inseridos pelo `docs/script.sql`. As senhas seguem a regra da tela de login (mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número).

| E-mail | Senha | Perfil | Projetos vinculados |
|---|---|---|---|
| ana.admin@empresa.com | `Admin123` | Administrador | Todos (Administrador) |
| rafael@teste.com | `Rafael123` | Administrador | Todos (Administrador) |
| joao@teste.com | `Joao1234` | Líder de Projeto | Sistema Web, Aplicativo Mobile, Portal do Cliente |
| ana@teste.com | `AnaCosta1` | Líder de Projeto | Sistema Web, Aplicativo Mobile |
| pedro@teste.com | `Pedro123` | Membro da Equipe | Sistema Web, Aplicativo Mobile, Portal do Cliente |
| maria@teste.com | `Maria123` | Membro da Equipe | Sistema Web, Aplicativo Mobile, Portal do Cliente |
| bruno.lider@empresa.com | `Lider123` | Líder de Projeto | Nenhum |
| carla.lider@empresa.com | `Lider456` | Líder de Projeto | Nenhum |
| diego.membro@empresa.com | `Membro123` | Membro da Equipe | Nenhum |
| elisa.membro@empresa.com | `Membro456` | Membro da Equipe | Nenhum |

> Líderes e membros só enxergam as demandas dos projetos em que estão vinculados (tabela `usuario_projetos`) ou atribuídas a eles. Os usuários sem projeto vinculado conseguem entrar no sistema, mas não veem demandas. Para ver tudo, entre com um Administrador.

---

## 📋 Sistema

O **Sistema de Acompanhamento de Demandas de Desenvolvimento** é inspirado em ferramentas utilizadas por equipes de tecnologia para a organização de demandas relacionadas a um software.

Cada demanda pertence a um projeto e possui título, descrição, tipo, prioridade, status, responsável (opcional), data de criação, data da última atualização e prazo de finalização.

**Tipos:**

* 📝 Tarefa
* 🐛 Defeito ("Bug")
* ✨ Melhoria
* 📄 Documentação

**Prioridades:** Crítica, Alta, Média e Baixa.

**Status:** Aberta, Em andamento, Em revisão, Concluída e Cancelada. Toda demanda começa como **Aberta**. As demandas não são excluídas do banco: quando não são mais necessárias, passam para **Cancelada**.

### Perfis de acesso

O acesso exige login, e as permissões são verificadas no backend (respostas `401` sem login e `403` sem permissão):

| Perfil | Pode |
|---|---|
| **Administrador** | Ver todos os projetos, usuários e demandas; criar demandas; gerenciar qualquer demanda (editar, responsável, prioridade, status e cancelamento) |
| **Líder de Projeto** | Ver os projetos aos quais está vinculado e as demandas deles; criar e gerenciar as demandas desses projetos, com todas as transições de status |
| **Membro da Equipe** | Ver os projetos aos quais está vinculado, as demandas deles e as atribuídas a ele; comentar; mover as suas demandas de Aberta → Em andamento e de Em andamento → Em revisão. Não cria, não conclui e não cancela demandas |

### Telas

* **Login:** autenticação por e-mail e senha.
* **Dashboard:** totais por status, prioridade e tipo, demandas críticas em aberto e próximas do prazo.
* **Listagem de demandas:** filtros por status, prioridade e tipo, busca textual, ordenação e paginação.
* **Cadastro de demanda:** criação de demandas (Administrador e Líder de Projeto).
* **Detalhes da demanda:** dados completos e comentários.

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

Seu desenvolvimento tem como foco o **Sistema de Acompanhamento de Demandas de Desenvolvimento**, inspirado em ferramentas utilizadas por equipes de tecnologia para organizar tarefas, defeitos ("bugs"), melhorias e documentação de um software.
