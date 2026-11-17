/* 
 * Feito por Guilherme Henrique Lopes Zambuzi
 *
 * Rotas responsáveis pelo Cadastro de Demandas e Listagem de Projetos.
 * Conectado ao Banco de Dados Oracle, validando dados no servidor, 
 * definindo status inicial e datas automáticas.
 */

import { Router, Request, Response } from "express";
import { getConn } from "../database/db";
import { exigirLogin } from "../middleware/exigirLogin";

const router = Router();

// Função auxiliar de normalização 
const normalizar = (valor: unknown): string =>
    String(valor ?? "").trim().toLocaleLowerCase("pt-BR");

// Valores canônicos aceitos pelas CHECK da tabela demandas (com acento e maiúscula).
// A chave é o valor normalizado (minúsculo), o valor é o que vai para o banco.
const TIPOS: Record<string, string> = {
    "tarefa": "Tarefa",
    "defeito": "Defeito",
    "melhoria": "Melhoria",
    "documentação": "Documentação",
    "documentacao": "Documentação"
};

const PRIORIDADES: Record<string, string> = {
    "crítica": "Crítica",
    "critica": "Crítica",
    "alta": "Alta",
    "média": "Média",
    "media": "Média",
    "baixa": "Baixa"
};

// 1. ROTA GET /projetos: Lista apenas os projetos vinculados ao usuário logado
router.get("/projetos", exigirLogin, async (req: Request, res: Response) => {
    // O id vem da sessão (cookie), nunca do corpo ou da URL
    const idUsuario = req.session.usuario!.id;

    let conn;
    try {
        conn = await getConn();
        const resultado: any = await conn.execute(
            `SELECT p.id AS "id", p.nome AS "nome", p.descricao AS "descricao"
               FROM projetos p
               JOIN usuario_projetos up ON up.id_projeto = p.id
              WHERE up.id_usuario = :idUsuario
              ORDER BY p.id`,
            { idUsuario }
        );

        return res.status(200).json(resultado.rows || []);
    } catch (error) {
        console.error("Erro detalhado ao buscar projetos no Oracle:", error);
        return res.status(500).json({
            mensagem: "Erro interno no servidor ao buscar projetos."
        });
    } finally {
        if (conn) {
            try {
                await conn.close();
            } catch (e) {
                console.error("Erro ao fechar conexão:", e);
            }
        }
    }
});

// Rota GET /usuarios para preencher o select de responsáveis no frontend
router.get("/usuarios", async (req: Request, res: Response) => {
    let conn;
    try {
        conn = await getConn();
        const resultado: any = await conn.execute(
            `SELECT id AS "id", nome AS "nome", perfil AS "perfil" FROM usuarios ORDER BY nome`
        );
        return res.status(200).json(resultado.rows || []);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        return res.status(500).json({ mensagem: "Erro ao buscar usuários." });
    } finally {
        if (conn) await conn.close();
    }
});

// 2. ROTA POST /demandas: Cadastra uma nova demanda com validações e persistência no Oracle
router.post("/demandas", exigirLogin, async (req: Request, res: Response) => {
    const { titulo, descricao, tipo, prioridade, id_projeto, id_responsavel, prazo_finalizacao } = req.body;

    // Validação de campos obrigatórios exigidos pelo Requisito
    if (!titulo || !descricao || !tipo || !prioridade || !id_projeto || !prazo_finalizacao) {
        return res.status(400).json({
            mensagem: "Dados incompletos. Título, descrição, tipo, prioridade, projeto e prazo são obrigatórios."
        });
    }

    // Converte para o valor exato que o banco aceita (undefined se for inválido)
    const tipoCanonico = TIPOS[normalizar(tipo)];
    const prioridadeCanonica = PRIORIDADES[normalizar(prioridade)];

    // Validação de tipo permitido
    if (!tipoCanonico) {
        return res.status(400).json({
            mensagem: "Tipo de demanda inválido. Permitidos: Tarefa, Defeito, Melhoria ou Documentação."
        });
    }

    // Validação de prioridade permitida
    if (!prioridadeCanonica) {
        return res.status(400).json({
            mensagem: "Prioridade inválida. Permitidas: Crítica, Alta, Média ou Baixa."
        });
    }

    // Validação do formato da data (evita ORA-01861 no TO_DATE)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(prazo_finalizacao))) {
        return res.status(400).json({
            mensagem: "Prazo inválido. Use o formato AAAA-MM-DD."
        });
    }

    const idUsuario = req.session.usuario!.id;

    let conn;
    try {
        conn = await getConn();

        // Verificar se o usuário logado está vinculado ao projeto informado
        const vinculo: any = await conn.execute(
            `SELECT 1 FROM usuario_projetos
              WHERE id_usuario = :idUsuario AND id_projeto = :idProjeto`,
            { idUsuario, idProjeto: Number(id_projeto) }
        );
        if (vinculo.rows.length === 0) {
            return res.status(403).json({
                mensagem: "Você não tem acesso a este projeto."
            });
        }

        // Verificar se o usuário responsável existe (caso tenha sido informado)
        if (id_responsavel !== undefined && id_responsavel !== null && id_responsavel !== "") {
            const usuarioExiste: any = await conn.execute(
                "SELECT id FROM usuarios WHERE id = :id",
                { id: Number(id_responsavel) }
            );
            if (usuarioExiste.rows.length === 0) {
                return res.status(400).json({
                    mensagem: "O usuário responsável informado não existe no banco de dados."
                });
            }
        }

        // Script SQL de inserção utilizando parâmetros nomeados e tratamento de datas Oracle
        const querySQL = `
            INSERT INTO demandas (titulo, descricao, tipo, prioridade, status, id_projeto, id_responsavel, prazo_finalizacao)
            VALUES (:titulo, :descricao, :tipo, :prioridade, 'Aberta', :id_projeto, :id_responsavel, TO_DATE(:prazo, 'YYYY-MM-DD'))
        `;

        await conn.execute(
            querySQL,
            {
                titulo: String(titulo).trim(),
                descricao: String(descricao).trim(),
                tipo: tipoCanonico,
                prioridade: prioridadeCanonica,
                id_projeto: Number(id_projeto),
                id_responsavel: id_responsavel ? Number(id_responsavel) : null,
                prazo: String(prazo_finalizacao)
            },
            { autoCommit: true } // autoCommit: true é obrigatório no Oracle para efetivar o INSERT!
        );

        return res.status(201).json({
            mensagem: "Demanda cadastrada com sucesso no banco de dados Oracle!"
        });

    } catch (error) {
        console.error("Erro ao cadastrar demanda no Oracle:", error);
        return res.status(500).json({
            mensagem: "Erro interno no servidor ao tentar salvar a demanda."
        });
    } finally {
        if (conn) {
            try {
                await conn.close();
            } catch (e) {
                console.error("Erro ao fechar conexão:", e);
            }
        }
    }
});

export default router;