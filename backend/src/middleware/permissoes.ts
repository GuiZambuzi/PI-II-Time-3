/*

João Victor Grisolia Luis - RA: 26005781

Arquivo: permissoes.ts
Descrição: Regras de autorização por perfil (item 2.1 do Documento de Visão).

Perfis e permissões:
- Administrador: vê todos os projetos, usuários e demandas; cria, edita,
  atribui responsável, altera prioridade e status e cancela qualquer demanda.
- Líder de Projeto: vê os projetos aos quais está vinculado e as demandas
  desses projetos; cria e gerencia (edita, atribui, prioridade, status, cancela)
  as demandas desses projetos.
- Membro da Equipe: vê os projetos aos quais está vinculado, as demandas desses
  projetos e as atribuídas a ele; comenta; altera o status das demandas
  atribuídas a ele apenas de Aberta -> Em andamento e Em andamento -> Em revisão.
  Não cria, não conclui, não cancela, não altera prioridade nem responsável.

O que este arquivo oferece:
- exigirPerfil(...perfis): middleware que responde 403 para outros perfis;
- filtroDemandasVisiveis(usuario): trecho SQL que restringe as demandas
  ao que o perfil pode ver (usado na listagem e no dashboard);
- exigirAcessoDemanda: middleware para rotas /demandas/:id (404/403);
- verificarAcessoDemanda / podeAcessarProjeto: checagens para rotas por id;
- podeGerenciarDemanda / podeAlterarStatus: regras para as rotas de alteração
  (edição, status, cancelamento), que devem chamá-las antes do UPDATE.
*/

import { Request, Response, NextFunction } from "express";
import type { Connection } from "oracledb";
import type { Perfil, UsuarioSessao } from "../routes/usuarios";
import { getConn } from "../database/db";

// nomes dos perfis exatamente como estão na tabela usuarios
export const ADMINISTRADOR: Perfil = "Administrador";
export const LIDER: Perfil = "Líder de Projeto";
export const MEMBRO: Perfil = "Membro da Equipe";

/** true se o usuário for Administrador (acessa tudo). */
export function ehAdministrador(usuario: UsuarioSessao): boolean {
  return usuario.perfil === ADMINISTRADOR;
}

/**
 * Middleware exigirPerfil
 * Libera a rota só para os perfis informados. Deve vir depois do exigirLogin.
 * Ex.: router.post("/demandas", exigirLogin, exigirPerfil(ADMINISTRADOR, LIDER), ...)
 */
export function exigirPerfil(...perfisPermitidos: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.session.usuario;

    // sem sessão: não está logado
    if (!usuario) {
      return res.status(401).json({ mensagem: "Faça login para continuar." });
    }

    // logado, mas o perfil não tem permissão para esta operação
    if (!perfisPermitidos.includes(usuario.perfil)) {
      return res.status(403).json({ mensagem: "Seu perfil não tem permissão para esta operação." });
    }

    return next();
  };
}

/**
 * Trecho SQL (começando com AND) que limita as demandas ao que o usuário pode ver.
 * - Administrador: nenhuma restrição (string vazia);
 * - Líder e Membro: demandas dos projetos em que estão vinculados
 *   (usuario_projetos) ou atribuídas a eles.
 * O alias padrão "d" é o da tabela demandas na consulta.
 */
export function filtroDemandasVisiveis(
  usuario: UsuarioSessao,
  alias = "d"
): { sql: string; binds: Record<string, number> } {
  if (ehAdministrador(usuario)) {
    return { sql: "", binds: {} };
  }

  return {
    sql: `
      AND (
        ${alias}.id_projeto IN (
          SELECT up.id_projeto FROM usuario_projetos up WHERE up.id_usuario = :idUsuarioPermissao
        )
        OR ${alias}.id_responsavel = :idUsuarioPermissao
      )`,
    binds: { idUsuarioPermissao: usuario.id },
  };
}

/** true se o usuário pode acessar o projeto (Administrador sempre pode). */
export async function podeAcessarProjeto(
  conn: Connection,
  usuario: UsuarioSessao,
  idProjeto: number
): Promise<boolean> {
  if (ehAdministrador(usuario)) return true;

  const resultado = await conn.execute(
    `SELECT 1 FROM usuario_projetos WHERE id_usuario = :idUsuario AND id_projeto = :idProjeto`,
    { idUsuario: usuario.id, idProjeto }
  );
  return (resultado.rows?.length ?? 0) > 0;
}

/** Dados mínimos da demanda usados nas checagens de permissão. */
export interface DemandaPermissao {
  id: number;
  idProjeto: number;
  idResponsavel: number | null;
  status: string;
}

/**
 * Verifica se a demanda existe e se o usuário pode vê-la.
 * Retorna o status HTTP a responder (404 ou 403) ou a própria demanda (acesso ok).
 */
export async function verificarAcessoDemanda(
  conn: Connection,
  usuario: UsuarioSessao,
  idDemanda: number
): Promise<{ status: 404 | 403 } | { status: 200; demanda: DemandaPermissao }> {
  const resultado = await conn.execute<DemandaPermissao>(
    `SELECT id AS "id", id_projeto AS "idProjeto",
            id_responsavel AS "idResponsavel", status AS "status"
       FROM demandas
      WHERE id = :id`,
    { id: idDemanda }
  );
  const demanda = resultado.rows?.[0];

  if (!demanda) return { status: 404 };

  // a demanda é visível se o usuário é admin, é o responsável ou está no projeto
  const ehResponsavel = demanda.idResponsavel === usuario.id;
  if (ehResponsavel || (await podeAcessarProjeto(conn, usuario, demanda.idProjeto))) {
    return { status: 200, demanda };
  }

  return { status: 403 };
}

/**
 * Middleware exigirAcessoDemanda
 * Para rotas com :id da demanda (detalhes, comentários...). Responde 404 se a
 * demanda não existe e 403 se o usuário não pode vê-la; senão segue para a rota.
 * Id inválido (não numérico) segue adiante para a própria rota responder 400.
 */
export async function exigirAcessoDemanda(req: Request, res: Response, next: NextFunction) {
  const usuario = req.session.usuario;
  if (!usuario) {
    return res.status(401).json({ mensagem: "Faça login para continuar." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next();

  let conn;
  try {
    conn = await getConn();
    const acesso = await verificarAcessoDemanda(conn, usuario, id);

    if (acesso.status === 404) {
      return res.status(404).json({ mensagem: "Demanda não encontrada." });
    }
    if (acesso.status === 403) {
      return res.status(403).json({ mensagem: "Você não tem acesso a esta demanda." });
    }
  } catch (erro) {
    console.error("Erro ao verificar acesso à demanda:", erro instanceof Error ? erro.message : erro);
    return res.status(500).json({ mensagem: "Não foi possível acessar o banco de dados. Tente novamente." });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error("Erro ao fechar conexão:", e);
      }
    }
  }

  return next();
}

/**
 * true se o perfil pode gerenciar a demanda: editar dados, atribuir/alterar
 * responsável, alterar prioridade e prazo e cancelar.
 * Administrador: qualquer demanda. Líder: só demandas dos projetos dele.
 * Membro: nunca.
 */
export async function podeGerenciarDemanda(
  conn: Connection,
  usuario: UsuarioSessao,
  demanda: DemandaPermissao
): Promise<boolean> {
  if (ehAdministrador(usuario)) return true;
  if (usuario.perfil === LIDER) return podeAcessarProjeto(conn, usuario, demanda.idProjeto);
  return false;
}

/**
 * Ciclo de vida da demanda (item 2.2.4): status de destino permitidos a partir
 * de cada status. Cancelar é possível em qualquer status, menos Concluída.
 */
export const TRANSICOES_STATUS: Record<string, string[]> = {
  "Aberta": ["Em andamento", "Cancelada"],
  "Em andamento": ["Em revisão", "Cancelada"],
  "Em revisão": ["Concluída", "Em andamento", "Cancelada"],
  "Concluída": [],
  "Cancelada": [],
};

// únicas transições que o Membro da Equipe pode fazer (e só nas demandas dele)
const TRANSICOES_MEMBRO: Record<string, string> = {
  "Aberta": "Em andamento",
  "Em andamento": "Em revisão",
};

/**
 * Confere se o usuário pode mudar a demanda para o novo status.
 * Primeiro valida o ciclo de vida (vale para todos os perfis) e depois o perfil.
 * Retorna { permitido: true } ou { permitido: false, status, mensagem } com o
 * código HTTP a responder (400 = transição inválida, 403 = sem permissão).
 */
export async function podeAlterarStatus(
  conn: Connection,
  usuario: UsuarioSessao,
  demanda: DemandaPermissao,
  novoStatus: string
): Promise<{ permitido: true } | { permitido: false; status: 400 | 403; mensagem: string }> {
  const destinos = TRANSICOES_STATUS[demanda.status] ?? [];
  if (!destinos.includes(novoStatus)) {
    return {
      permitido: false,
      status: 400,
      mensagem: `Não é permitido alterar o status de ${demanda.status} para ${novoStatus}.`,
    };
  }

  if (usuario.perfil === MEMBRO) {
    const ehResponsavel = demanda.idResponsavel === usuario.id;
    if (!ehResponsavel || TRANSICOES_MEMBRO[demanda.status] !== novoStatus) {
      return {
        permitido: false,
        status: 403,
        mensagem:
          "Membro da Equipe só pode mover as demandas atribuídas a ele de Aberta para Em andamento e de Em andamento para Em revisão.",
      };
    }
    return { permitido: true };
  }

  // Administrador e Líder: todas as transições do ciclo (Líder só nos projetos dele)
  if (!(await podeGerenciarDemanda(conn, usuario, demanda))) {
    return { permitido: false, status: 403, mensagem: "Você não tem acesso a este projeto." };
  }
  return { permitido: true };
}
