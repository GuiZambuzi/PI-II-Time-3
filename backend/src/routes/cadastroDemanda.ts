/* 
 * Feito por Guilherme Henrique Lopes Zambuzi
 *
 * Rotas responsáveis pelo Cadastro de Demandas e Listagem de Projetos.
 * Conectado ao Banco de Dados Oracle, validando dados no servidor, 
 * definindo status inicial e datas automáticas.
 */

import { Router, Request, Response } from "express";
import { getConn } from "../database/db";

const router = Router();

// Função auxiliar de normalização 
const normalizar = (valor: unknown): string =>
    String(valor ?? "").trim().toLocaleLowerCase("pt-BR");

// 1. ROTA GET /projetos: Lista os projetos disponíveis diretamente do Oracle
router.get("/projetos", async (req: Request, res: Response) => {
    let conn;
    try {
        conn = await getConn();
        const resultado: any = await conn.execute(
            "SELECT id, nome, descricao FROM projetos ORDER BY id"
        );
        return res.status(200).json(resultado.rows);
    } catch (error) {
        console.error("Erro ao buscar projetos no Oracle:", error);
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

// 2. ROTA POST /demandas: Cadastra uma nova demanda com validações e persistência no Oracle
router.post("/demandas", async (req: Request, res: Response) => {
    const { titulo, descricao, tipo, prioridade, id_projeto, id_responsavel, prazo_finalizacao } = req.body;

    // Validação de campos obrigatórios exigidos pelo Requisito
    if (!titulo || !descricao || !tipo || !prioridade || !id_projeto || !prazo_finalizacao) {
        return res.status(400).json({
            mensagem: "Dados incompletos. Título, descrição, tipo, prioridade, projeto e prazo são obrigatórios."
        });
    }

    const tipoNorm = normalizar(tipo);
    const prioridadeNorm = normalizar(prioridade);

    const tiposPermitidos = ["tarefa", "defeito", "melhoria", "documentação", "documentacao"];
    const prioridadesPermitidas = ["crítica", "critica", "alta", "média", "media", "baixa"];

    // Validação de tipo permitido
    if (!tiposPermitidos.includes(tipoNorm)) {
        return res.status(400).json({
            mensagem: "Tipo de demanda inválido. Permitidos: Tarefa, Defeito, Melhoria ou Documentação."
        });
    }

    // Validação de prioridade permitida
    if (!prioridadesPermitidas.includes(prioridadeNorm)) {
        return res.status(400).json({
            mensagem: "Prioridade inválida. Permitidas: Crítica, Alta, Média ou Baixa."
        });
    }

    let conn;
    try {
        conn = await getConn();

        // Verificar se o projeto informado realmente existe no banco Oracle
        const projetoExiste: any = await conn.execute(
            "SELECT id FROM projetos WHERE id = :id",
            { id: id_projeto }
        );
        if (projetoExiste.rows.length === 0) {
            return res.status(400).json({
                mensagem: "O projeto informado não existe no banco de dados."
            });
        }

        // Verificar se o usuário responsável existe (caso tenha sido informado)
        if (id_responsavel !== undefined && id_responsavel !== null && id_responsavel !== "") {
            const usuarioExiste: any = await conn.execute(
                "SELECT id FROM usuarios WHERE id = :id",
                { id: id_responsavel }
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
                tipo: String(tipo),
                prioridade: String(prioridade),
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