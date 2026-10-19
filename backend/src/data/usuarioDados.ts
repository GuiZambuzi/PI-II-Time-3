/**
 * 
 * João Victor Grisolia Luis - RA: 26005781
 * 
 * Arquivo: usuarioDados.ts
 * Descrição: Este arquivo contém os tipos e dados de teste relacionados aos usuários do sistema.
 * Dados de teste em memória: usuários dos três perfis.
 */

export type Perfil = "Administrador" | "Líder de Projeto" | "Membro da Equipe";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha: string; 
  perfil: Perfil;
}

export const usuarios: Usuario[] = [
  { id: 1, nome: "Ana Souza", email: "ana.admin@empresa.com", senha: "admin123", perfil: "Administrador" },
  { id: 2, nome: "Bruno Lima", email: "bruno.lider@empresa.com", senha: "lider123", perfil: "Líder de Projeto" },
  { id: 3, nome: "Carla Mendes", email: "carla.lider@empresa.com", senha: "lider456", perfil: "Líder de Projeto" },
  { id: 4, nome: "Diego Alves", email: "diego.membro@empresa.com", senha: "membro123", perfil: "Membro da Equipe" },
  { id: 5, nome: "Elisa Rocha", email: "elisa.membro@empresa.com", senha: "membro456", perfil: "Membro da Equipe" },
];