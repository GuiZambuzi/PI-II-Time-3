/**
 * Joao Victor Grisolia Luis - RA: 26005781
 *
 * Arquivo: usuarios.ts
 * Descrição: Este arquivo contém as rotas relacionadas aos usuários do sistema
 * e à autenticação por sessão (cookie).
 * Rotas: POST /login, GET /sessao, POST /logout e GET /usuarios
 *
 * Fluxo da autenticação:
 * 1. POST /login recebe e-mail e senha, busca o usuário na tabela usuarios do
 *    Oracle (SELECT), verifica a senha com bcrypt.compare e cria a sessão no
 *    servidor (express-session).
 * 2. A resposta envia o cookie "demandly.sid" (Set-Cookie) com o identificador da sessão.
 * 3. Nas próximas requisições o navegador devolve o cookie e o servidor
 *    encontra o usuário em req.session.usuario.
 */

import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { usuarios, Usuario, Perfil } from "../data/usuarioDados";
import { exigirLogin } from "../middleware/exigirLogin";
import { getConn } from "../database/db";

const router = Router();

/** Dados do usuário guardados na sessão (nunca a senha ou o hash). */
export interface UsuarioSessao {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

// Acrescenta o campo "usuario" aos dados da sessão do express-session.
// É opcional porque, antes do login, a sessão não tem usuário.
declare module "express-session" {
  interface SessionData {
    usuario?: UsuarioSessao;
  }
}

/** Função pra remover o hash da senha antes de enviar o usuário. */
function semSenha(usuario: Usuario): UsuarioSessao {
  const { senhaHash, ...publico } = usuario;
  return publico;
}

/**
 * POST /login
 * Corpo: { "email": string, "senha": string }
 * 200 -> dados do usuário e perfil (sem senha) + cookie da sessão
 * 400 -> e-mail ou senha ausentes/inválidos
 * 401 -> credenciais inválidas
 * 500 -> erro ao consultar o banco de dados
 */
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  const { email, senha } = req.body ?? {};

  // bcrypt.truncates: o bcrypt só considera os primeiros 72 bytes da senha,
  // então senhas maiores que isso são recusadas.
  if (typeof email !== "string" || email.trim() === "" ||
      typeof senha !== "string" || senha === "" || bcrypt.truncates(senha)) {
    return res.status(400).json({
      mensagem: "Campos obrigatórios ausentes: informe e-mail e senha.",
    });
  }

  // o e-mail é normalizado; a senha é usada exatamente como foi digitada
  const emailNormalizado = email.trim().toLowerCase();

  // busca o usuário pelo e-mail na tabela usuarios do Oracle
  let conn;
  let usuario: Usuario | undefined;
  try {
    conn = await getConn();
    const resultado = await conn.execute<Usuario>(
      // os apelidos entre aspas fazem o Oracle devolver as colunas com estes
      // nomes (em vez de MAIÚSCULAS), no mesmo formato do tipo Usuario
      `SELECT id AS "id", nome AS "nome", email AS "email",
              senha_hash AS "senhaHash", perfil AS "perfil"
         FROM usuarios
        WHERE LOWER(email) = :email`,
      { email: emailNormalizado } // bind: o valor nunca é concatenado no SQL (evita SQL injection)
    );
    usuario = resultado.rows?.[0];
  } catch (erro) {
    // banco fora do ar, tabela inexistente, .env errado etc.
    console.error("Erro ao consultar o usuário no Oracle:", erro instanceof Error ? erro.message : erro);
    return res.status(500).json({ mensagem: "Não foi possível acessar o banco de dados. Tente novamente." });
  } finally {
    // devolve a conexão ao pool, mesmo se der erro
    if (conn) await conn.close();
  }

  // compara a senha digitada com o hash guardado (o salt já está dentro do hash)
  const senhaCorreta = usuario ? await bcrypt.compare(senha, usuario.senhaHash) : false;

  // mesma resposta para e-mail inexistente e senha errada
  if (!usuario || !senhaCorreta) {
    return res.status(401).json({ mensagem: "E-mail ou senha inválidos." });
  }

  // gera um novo identificador de sessão no login e guarda o usuário nela
  return req.session.regenerate((erro) => {
    if (erro) return next(erro);

    req.session.usuario = semSenha(usuario);

    // grava a sessão antes de responder, para o cookie já valer na próxima página
    return req.session.save((erro) => {
      if (erro) return next(erro);

      return res.status(200).json({
        mensagem: "Login realizado com sucesso.",
        usuario: req.session.usuario,
      });
    });
  });
});

/**
 * GET /sessao
 * 200 -> usuário da sessão atual (identificado pelo cookie)
 * 401 -> sem sessão válida
 */
router.get("/sessao", exigirLogin, (req: Request, res: Response) => {
  return res.status(200).json(req.session.usuario);
});

/**
 * POST /logout
 * Destrói a sessão no servidor e limpa o cookie do navegador.
 */
router.post("/logout", exigirLogin, (req: Request, res: Response, next: NextFunction) => {
  req.session.destroy((erro) => {
    if (erro) return next(erro);

    res.clearCookie("demandly.sid", { path: "/", httpOnly: true, sameSite: "lax", secure: false });
    return res.status(200).json({ mensagem: "Sessão encerrada." });
  });
});

/**
 * GET /usuarios
 * status 200 -> lista de usuários pré-cadastrados, sem a senha.
 */
router.get("/usuarios", (req: Request, res: Response) => {
  return res.status(200).json(usuarios.map(semSenha));
});

export default router;


/*

EXEMPLOS DE BODY PARA TESTES DO MÉTODO POST /login -

status 200 - {"email":"ana.admin@empresa.com","senha":"Admin123"}
status 200 - {"email":"bruno.lider@empresa.com","senha":"Lider123"}
status 200 - {"email":"diego.membro@empresa.com","senha":"Membro123"}
status 400 - {"email":"ana.admin@empresa.com"}
status 400 - {"senha":"Admin123"}
status 400 - {}
status 401 - {"email":"ana.admin@empresa.com","senha":"SenhaErrada1"}
status 401 - {"email":"naoexiste@empresa.com","senha":"Teste1234"}

*/
