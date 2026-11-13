/**
 *
 * João Victor Grisolia Luis - RA: 26005781
 *
 * Arquivo: usuarioDados.ts
 * Descrição: Este arquivo contém os tipos e dados de teste relacionados aos usuários do sistema.
 * Dados de teste em memória: usuários dos três perfis.
 *
 * As senhas NÃO ficam em texto puro: cada usuário guarda apenas o hash bcrypt
 * (custo 12) da sua senha. O hash já inclui o salt, então o login usa
 * bcrypt.compare(senhaDigitada, senhaHash) para verificar a senha.
 * Quando o banco Oracle for criado, esses mesmos hashes vão para a coluna senha_hash.
 */

export type Perfil = "Administrador" | "Líder de Projeto" | "Membro da Equipe";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senhaHash: string; // hash bcrypt da senha (60 caracteres)
  perfil: Perfil;
}

/*
 * Senhas de teste (apenas para desenvolvimento) e seus hashes:
 * ana.admin    -> Admin123
 * bruno.lider  -> Lider123
 * carla.lider  -> Lider456
 * diego.membro -> Membro123
 * elisa.membro -> Membro456
 */
export const usuarios: Usuario[] = [
  { id: 1, nome: "Ana Souza", email: "ana.admin@empresa.com", senhaHash: "$2b$12$EchRDOvMH1LPeUgmigcOs.mhXwym50W3LqkaeqhqBuPd2no.Fl3lO", perfil: "Administrador" },
  { id: 2, nome: "Bruno Lima", email: "bruno.lider@empresa.com", senhaHash: "$2b$12$Ij5R7vcOGaGAaBEPltvC7uYMkJ3yEOkrOWsvzAZO7DGcQUgynjO6u", perfil: "Líder de Projeto" },
  { id: 3, nome: "Carla Mendes", email: "carla.lider@empresa.com", senhaHash: "$2b$12$73ZW92SLCWa3s9OlUuaUKOKeXLB.VLh/VdjnNOeJ9h4eYDRwNknRy", perfil: "Líder de Projeto" },
  { id: 4, nome: "Diego Alves", email: "diego.membro@empresa.com", senhaHash: "$2b$12$3XJhpipHqgE0IA4hWqxfsu2VkdHO8dBgn7kXQGXU2y3nPyMSyyVeS", perfil: "Membro da Equipe" },
  { id: 5, nome: "Elisa Rocha", email: "elisa.membro@empresa.com", senhaHash: "$2b$12$1fFndQTXO73omASuz3tf1.Jy97FAiXRZx40bahtEYszEEgWpEayKm", perfil: "Membro da Equipe" },
];
