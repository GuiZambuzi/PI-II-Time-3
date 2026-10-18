/**
Feito por Rafael França Cardoso

Este arquivo contém os dados de teste compartilhados pelo grupo.

Usuários:
Armazena os usuários cadastrados, seus dados de acesso e perfis.

Projetos:
Armazena os projetos disponíveis no sistema.

Demandas:
Armazena as demandas com título, descrição, tipo, prioridade, status, projeto, responsável, data de criação e prazo de finalização.

Comentários:
Armazena os comentários vinculados às demandas e aos usuários.

Os dados são armazenados em memória e utilizados pelas rotas da API durante o desenvolvimento e os testes.
*/

export const usuarios = [
  {
    id: 1,
    nome: "Rafael Camilo",
    email: "rafael@teste.com",
    senha: "123456",
    perfil: "Administrador"
  },
  {
    id: 2,
    nome: "João Silva",
    email: "joao@teste.com",
    senha: "123456",
    perfil: "Líder de Projeto"
  },
  {
    id: 3,
    nome: "Pedro Santos",
    email: "pedro@teste.com",
    senha: "123456",
    perfil: "Membro da Equipe"
  },
  {
    id: 4,
    nome: "Maria Oliveira",
    email: "maria@teste.com",
    senha: "123456",
    perfil: "Membro da Equipe"
  },
  {
    id: 5,
    nome: "Ana Costa",
    email: "ana@teste.com",
    senha: "123456",
    perfil: "Líder de Projeto"
  }
];

export const projetos = [
  {
    id: 1,
    nome: "Sistema Web",
    descricao: "Sistema de acompanhamento de demandas"
  },
  {
    id: 2,
    nome: "Aplicativo Mobile",
    descricao: "Aplicativo para dispositivos móveis"
  },
  {
    id: 3,
    nome: "Portal do Cliente",
    descricao: "Portal para atendimento de clientes"
  }
];

export const demandas = [
  {
    id: 1,
    titulo: "Corrigir erro no login",
    descricao: "O sistema apresenta erro ao inserir a senha correta.",
    tipo: "Defeito",
    prioridade: "Crítica",
    status: "Aberta",
    projetoId: 1,
    responsavelId: 3,
    dataCriacao: "2026-10-10",
    prazoFinalizacao: "2026-10-18",
    dataAtualizacao: "2026-10-10"
  },
  {
    id: 2,
    titulo: "Criar tela de cadastro",
    descricao: "Desenvolver formulário para cadastrar novos usuários.",
    tipo: "Tarefa",
    prioridade: "Alta",
    status: "Em andamento",
    projetoId: 1,
    responsavelId: 3,
    dataCriacao: "2026-10-11",
    prazoFinalizacao: "2026-10-22",
    dataAtualizacao: "2026-10-14"
  },
  {
    id: 3,
    titulo: "Melhorar pesquisa de demandas",
    descricao: "Permitir localizar demandas pelo título ou pela descrição.",
    tipo: "Melhoria",
    prioridade: "Média",
    status: "Em revisão",
    projetoId: 1,
    responsavelId: 4,
    dataCriacao: "2026-10-12",
    prazoFinalizacao: "2026-10-25",
    dataAtualizacao: "2026-10-16"
  },
  {
    id: 4,
    titulo: "Atualizar documentação",
    descricao: "Revisar as instruções de instalação e utilização do sistema.",
    tipo: "Documentação",
    prioridade: "Baixa",
    status: "Concluída",
    projetoId: 1,
    responsavelId: 2,
    dataCriacao: "2026-10-01",
    prazoFinalizacao: "2026-10-12",
    dataAtualizacao: "2026-10-11"
  },
  {
    id: 5,
    titulo: "Corrigir falha no aplicativo",
    descricao: "O aplicativo fecha ao abrir a página de perfil.",
    tipo: "Defeito",
    prioridade: "Alta",
    status: "Cancelada",
    projetoId: 2,
    responsavelId: 4,
    dataCriacao: "2026-10-03",
    prazoFinalizacao: "2026-10-15",
    dataAtualizacao: "2026-10-08"
  },
  {
    id: 6,
    titulo: "Implementar notificações",
    descricao: "Enviar notificações quando uma demanda for atualizada.",
    tipo: "Tarefa",
    prioridade: "Média",
    status: "Aberta",
    projetoId: 2,
    responsavelId: 3,
    dataCriacao: "2026-10-13",
    prazoFinalizacao: "2026-10-19",
    dataAtualizacao: "2026-10-13"
  },
  {
    id: 7,
    titulo: "Adicionar filtro por projeto",
    descricao: "Permitir filtrar a listagem pelo projeto relacionado.",
    tipo: "Melhoria",
    prioridade: "Crítica",
    status: "Em andamento",
    projetoId: 3,
    responsavelId: 4,
    dataCriacao: "2026-10-14",
    prazoFinalizacao: "2026-10-17",
    dataAtualizacao: "2026-10-16"
  },
  {
    id: 8,
    titulo: "Documentar API",
    descricao: "Registrar as rotas GET e POST e seus parâmetros.",
    tipo: "Documentação",
    prioridade: "Baixa",
    status: "Aberta",
    projetoId: 3,
    responsavelId: 2,
    dataCriacao: "2026-10-15",
    prazoFinalizacao: "2026-10-30",
    dataAtualizacao: "2026-10-15"
  },
  {
    id: 9,
    titulo: "Corrigir validação do formulário",
    descricao: "O formulário aceita campos obrigatórios vazios.",
    tipo: "Defeito",
    prioridade: "Alta",
    status: "Em revisão",
    projetoId: 2,
    responsavelId: 3,
    dataCriacao: "2026-10-08",
    prazoFinalizacao: "2026-10-20",
    dataAtualizacao: "2026-10-16"
  },
  {
    id: 10,
    titulo: "Criar relatório de desempenho",
    descricao: "Exibir indicadores de demandas por status e prioridade.",
    tipo: "Tarefa",
    prioridade: "Média",
    status: "Concluída",
    projetoId: 3,
    responsavelId: 4,
    dataCriacao: "2026-09-28",
    prazoFinalizacao: "2026-10-10",
    dataAtualizacao: "2026-10-09"
  },
  {
    id: 11,
    titulo: "Melhorar acessibilidade",
    descricao: "Ajustar textos e navegação para facilitar o uso da interface.",
    tipo: "Melhoria",
    prioridade: "Baixa",
    status: "Em andamento",
    projetoId: 1,
    responsavelId: 3,
    dataCriacao: "2026-10-16",
    prazoFinalizacao: "2026-11-05",
    dataAtualizacao: "2026-10-16"
  },
  {
    id: 12,
    titulo: "Corrigir erro no relatório",
    descricao: "O relatório apresenta contagens incorretas de demandas abertas.",
    tipo: "Defeito",
    prioridade: "Crítica",
    status: "Aberta",
    projetoId: 3,
    responsavelId: null,
    dataCriacao: "2026-10-16",
    prazoFinalizacao: "2026-10-18",
    dataAtualizacao: "2026-10-16"
  }
];

export const comentarios = [
  {
    id: 1,
    demandaId: 1,
    usuarioId: 3,
    texto: "Consegui reproduzir o erro ao tentar entrar no sistema.",
    dataHora: "2026-10-10T14:30:00"
  },
  {
    id: 2,
    demandaId: 2,
    usuarioId: 2,
    texto: "O formulário já está em desenvolvimento.",
    dataHora: "2026-10-12T10:15:00"
  },
  {
    id: 3,
    demandaId: 3,
    usuarioId: 4,
    texto: "A busca por descrição precisa ser testada.",
    dataHora: "2026-10-16T16:45:00"
  }
];
