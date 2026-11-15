/*
 * Feito por Rafael França Cardoso
 *
 * Rota responsável por listar as demandas cadastradas.
 */

import { Router, Request, Response } from "express";
import { getConn } from "../database/db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
    let conn;

    try {
        conn = await getConn();

        const busca = String(req.query.busca || "").trim();
        const status = String(req.query.status || "").trim();
        const prioridade = String(req.query.prioridade || "").trim();
        const tipo = String(req.query.tipo || "").trim();
        const ordenacao = String(req.query.ordenacao || "").trim();

        let sql = `
            SELECT
                d.id AS "id",
                d.titulo AS "titulo",
                DBMS_LOB.SUBSTR(d.descricao, 4000, 1) AS "descricao",
                d.tipo AS "tipo",
                d.prioridade AS "prioridade",
                d.status AS "status",
                p.nome AS "projeto",
                NVL(u.nome, 'Não atribuído') AS "responsavel",
                TO_CHAR(d.data_criacao, 'YYYY-MM-DD') AS "dataCriacao",
                TO_CHAR(d.prazo_finalizacao, 'YYYY-MM-DD') AS "prazoFinalizacao"
            FROM demandas d
            INNER JOIN projetos p ON d.id_projeto = p.id
            LEFT JOIN usuarios u ON d.id_responsavel = u.id
            WHERE 1 = 1
        `;

        const binds: any = {};

        // Busca por título, projeto ou responsável.
        if (busca) {
            sql += `
                AND (
                    LOWER(d.titulo) LIKE LOWER(:busca)
                    OR LOWER(p.nome) LIKE LOWER(:busca)
                    OR LOWER(u.nome) LIKE LOWER(:busca)
                    OR TO_CHAR(d.data_criacao, 'DD/MM/YYYY') LIKE :busca
                    OR TO_CHAR(d.prazo_finalizacao, 'DD/MM/YYYY') LIKE :busca
                )
            `;

            binds.busca = `%${busca}%`;
        }

        // Filtros.
        if (status && status.toLowerCase() !== "todos") {
            sql += " AND LOWER(d.status) = LOWER(:status)";
            binds.status = status;
        }

        if (prioridade && prioridade.toLowerCase() !== "todas") {
            sql += " AND LOWER(d.prioridade) = LOWER(:prioridade)";
            binds.prioridade = prioridade;
        }

        if (tipo && tipo.toLowerCase() !== "todos") {
            sql += " AND LOWER(d.tipo) = LOWER(:tipo)";
            binds.tipo = tipo;
        }

        // Ordenação.
        if (ordenacao === "prioridade") {
            sql += `
                ORDER BY CASE LOWER(d.prioridade)
                    WHEN 'crítica' THEN 1
                    WHEN 'alta' THEN 2
                    WHEN 'média' THEN 3
                    WHEN 'baixa' THEN 4
                END
            `;
        } else if (ordenacao === "criacao") {
            sql += " ORDER BY d.data_criacao ASC";
        } else if (ordenacao === "prazo") {
            sql += " ORDER BY d.prazo_finalizacao ASC";
        } else if (ordenacao === "status") {
            sql += " ORDER BY d.status ASC";
        }

        const resultado = await conn.execute(sql, binds);

        return res.status(200).json(resultado.rows || []);

    } catch (erro) {
        console.error("Erro ao listar demandas:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível carregar as demandas."
        });

    } finally {
        if (conn) {
            await conn.close();
        }
    }
});

export default router;