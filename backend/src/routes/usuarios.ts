/**
 * Joao Victor Grisolia Luis - RA: 26005781
 * 
 * Arquivo: usuarios.ts
 * Descrição: Este arquivo contém as rotas relacionadas aos usuários do sistema.
 * Rotas: POST /login e GET /usuarios
 */

import { Router, Request, Response } from "express";
import { usuarios, Usuario } from "../data/usuarioDados";

const router = Router();

/** Função pra remover a senha antes de enviar o usuário completo. */
function semSenha(usuario: Usuario): Omit<Usuario, "senha"> {
  const { senha, ...publico } = usuario;
  return publico;
}

/**
 * POST /login
 * Corpo: { "email": string, "senha": string }
 * 200 -> dados do usuário e perfil (sem senha)
 * 400 -> e-mail ou senha ausentes/inválidos
 * 401 -> credenciais inválidas
 */

router.post("/login", (req: Request, res: Response) => {
  const { email, senha } = req.body ?? {};

  if (typeof email !== "string" || email.trim() === "" ||
      typeof senha !== "string" || senha === "") {
    return res.status(400).json({
      mensagem: "Campos obrigatórios ausentes: informe e-mail e senha.",
    });
  }

  const emailNormalizado = email.trim().toLowerCase();
  const usuario = usuarios.find(
    (user) => user.email.toLowerCase() === emailNormalizado && user.senha === senha
  );

  if (!usuario) {
    return res.status(401).json({mensagem: "E-mail ou senha inválidos."});
  }

  return res.status(200).json({
    mensagem: "Login realizado com sucesso.",
    usuario: semSenha(usuario),
  });
});

/**
 * GET /usuarios
 * status 200 -> lista de usuários pré-cadastrados, sem a senha.
 */

router.get("/", (req: Request, res: Response) => {
  return res.status(200).json(usuarios.map(semSenha));
});

export default router;


/*

EXEMPLOS DE BODY PARA TESTES DO MÉTODO POST -

status 200 - {"email":"ana.admin@empresa.com","senha":"admin123"}
status 200 - {"email":"bruno.lider@empresa.com","senha":"lider123"}
status 200 - {"email":"diego.membro@empresa.com","senha":"membro123"}
status 400 - {"email":"ana.admin@empresa.com"}
status 400 - {"senha":"admin123"}
status 400 - {}
status 401 - {"email":"ana.admin@empresa.com","senha":"senhaerrada"}
status 401 - {"email":"naoexiste@empresa.com","senha":"123456"}

*/