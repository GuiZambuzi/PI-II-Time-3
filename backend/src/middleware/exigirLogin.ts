/*

João Victor Grisolia Luis - RA: 26005781

Arquivo: exigirLogin.ts
Descrição: Middleware que exige um usuário autenticado para acessar a rota.
Ele é executado antes da função da rota e confere se a sessão (identificada
pelo cookie "demandly.sid") possui um usuário logado.

- Sem usuário na sessão -> responde 401 e a rota não é executada;
- Com usuário na sessão -> chama next() e libera a próxima função da rota.

Como usar em uma rota:

    import { exigirLogin } from "../middleware/exigirLogin";

    router.get("/minha-rota", exigirLogin, (req, res) => { ... });

Obs.: o campo req.session.usuario é tipado em routes/usuarios.ts
(declare module "express-session").
*/

import { Request, Response, NextFunction } from "express";

export function exigirLogin(req: Request, res: Response, next: NextFunction) {
  // se a sessão n tem usuário: não está logado (ou a sessão expirou / fez logout)
  if (!req.session.usuario) {
    return res.status(401).json({ mensagem: "Faça login para continuar." });
  }

  // se o usuário for autenticado: segue para a função da rota
  return next();
}
