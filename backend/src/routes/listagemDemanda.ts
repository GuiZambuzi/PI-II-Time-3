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
        const pagina = Math.max(1, Number(req.query.pagina) || 1);
        const limite = 10;
        const deslocamento = (pagina - 1) * limite;

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

        let countSql = `
            SELECT COUNT(*) AS "total"
            FROM demandas d
            INNER JOIN projetos p ON d.id_projeto = p.id
            LEFT JOIN usuarios u ON d.id_responsavel = u.id
            WHERE 1 = 1
        `;

        let filtros = "";
        const binds: any = {};

        // Busca por título, projeto ou responsável.
        if (busca) {
            filtros += `
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
            filtros += " AND LOWER(d.status) = LOWER(:status)";
            binds.status = status;
        }

        if (prioridade && prioridade.toLowerCase() !== "todas") {
            filtros += " AND LOWER(d.prioridade) = LOWER(:prioridade)";
            binds.prioridade = prioridade;
        }

        if (tipo && tipo.toLowerCase() !== "todos") {
            filtros += " AND LOWER(d.tipo) = LOWER(:tipo)";
            binds.tipo = tipo;
        }

        // Aplica os mesmos filtros nas duas consultas
        sql += filtros;
        countSql += filtros;

        // Ordenação (com critério de desempate d.id DESC).
        if (ordenacao === "prioridade") {
            sql += `
                ORDER BY CASE LOWER(d.prioridade)
                    WHEN 'crítica' THEN 1
                    WHEN 'alta' THEN 2
                    WHEN 'média' THEN 3
                    WHEN 'baixa' THEN 4
                END, d.id DESC
            `;
        } else if (ordenacao === "criacao") {
            sql += " ORDER BY d.data_criacao ASC, d.id DESC";
        } else if (ordenacao === "prazo") {
            sql += " ORDER BY d.prazo_finalizacao ASC, d.id DESC";
        } else if (ordenacao === "status") {
            sql += " ORDER BY d.status ASC, d.id DESC";
        } else {
            sql += " ORDER BY d.data_criacao DESC, d.id DESC";
        }

        // Paginação no final da consulta principal.
        sql += `
            OFFSET :deslocamento ROWS
            FETCH NEXT :limite ROWS ONLY
        `;

        // Executa a contagem total (apenas com os binds de filtro)
        const totalResult = await conn.execute(countSql, binds);
        const total = totalResult.rows && totalResult.rows.length > 0 ? (totalResult.rows[0] as any).total : 0;

        // Executa a consulta principal passando os filtros + deslocamento e limite
        const resultado = await conn.execute(sql, {
            ...binds,
            deslocamento,
            limite
        });

        return res.status(200).json({
            demandas: resultado.rows || [],
            total,
            pagina,
            limite
        });

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