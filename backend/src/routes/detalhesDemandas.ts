/**
 * Diego Prandi Silva - RA: 25002584
 *
 * Arquivo: detalhesDemandas.ts
 * Descrição: Rotas responsáveis por exibir os detalhes das demandas,
 * listar os comentários e cadastrar novos comentários no banco de dados Oracle.
 */

import { Router, Request, Response } from 'express';
import oracledb from 'oracledb';
import { getConn } from '../database/db';
// permissões por perfil (João Victor Grisolia Luis): 403 para demandas fora
// dos projetos do usuário (Administrador vê todas)
import { exigirAcessoDemanda } from '../middleware/permissoes';

const router = Router();

// Busca os detalhes de uma demanda pelo ID
router.get('/:id', exigirAcessoDemanda, async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            mensagem: 'ID da demanda inválido.',
        });
    }

    let conn;

    try {
        conn = await getConn();

        const resultado = await conn.execute(
            `SELECT
                d.id AS "id",
                d.titulo AS "titulo",
                d.descricao AS "descricao",
                d.tipo AS "tipo",
                d.prioridade AS "prioridade",
                d.status AS "status",
                d.id_projeto AS "projetoId",
                p.nome AS "projeto",
                d.id_responsavel AS "responsavelId",
                u.nome AS "responsavel",
                TO_CHAR(d.data_criacao, 'DD/MM/YYYY HH24:MI') AS "dataCriacao",
                TO_CHAR(d.data_ultima_atualizacao, 'DD/MM/YYYY HH24:MI') AS "ultimaAtualizacao",
                TO_CHAR(d.prazo_finalizacao, 'DD/MM/YYYY') AS "prazoFinalizacao"
            FROM demandas d
            INNER JOIN projetos p ON p.id = d.id_projeto
            LEFT JOIN usuarios u ON u.id = d.id_responsavel
            WHERE d.id = :id`,
            { id }
        );

        const demandas = resultado.rows as any[];

        if (demandas.length === 0) {
            return res.status(404).json({
                mensagem: 'Demanda não encontrada.',
            });
        }

        return res.status(200).json(demandas[0]);
    } catch (erro) {
        console.error('Erro ao buscar detalhes da demanda:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao consultar os detalhes da demanda.',
        });
    } finally {
        if (conn) {
            await conn.close();
        }
    }
});

// Lista os comentários de uma demanda
router.get('/:id/comentarios', exigirAcessoDemanda, async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            mensagem: 'ID da demanda inválido.',
        });
    }

    let conn;

    try {
        conn = await getConn();

        const demanda = await conn.execute(
            `SELECT id
             FROM demandas
             WHERE id = :id`,
            { id }
        );

        if (!demanda.rows || demanda.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Demanda não encontrada.',
            });
        }

        const resultado = await conn.execute(
            `SELECT
                c.id AS "id",
                c.id_demanda AS "demandaId",
                c.id_usuario AS "usuarioId",
                u.nome AS "usuario",
                c.texto_comentario AS "texto",
                TO_CHAR(c.data_hora, 'DD/MM/YYYY HH24:MI') AS "dataHora"
            FROM comentarios c
            INNER JOIN usuarios u ON u.id = c.id_usuario
            WHERE c.id_demanda = :id
            ORDER BY c.data_hora ASC`,
            { id }
        );

        return res.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar comentários:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao consultar os comentários.',
        });
    } finally {
        if (conn) {
            await conn.close();
        }
    }
});

// Cadastra um comentário em nome do usuário logado
// (as rotas de /demandas exigem login: exigirLogin no server.ts)
router.post('/:id/comentarios', exigirAcessoDemanda, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { texto } = req.body;

    const usuarioLogado = req.session.usuario;
    if (!usuarioLogado) {
        return res.status(401).json({
            mensagem: 'Faça login para continuar.',
        });
    }

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            mensagem: 'ID da demanda inválido.',
        });
    }

    if (typeof texto !== 'string' || texto.trim() === '') {
        return res.status(400).json({
            mensagem: 'Preencha o texto do comentário.',
        });
    }

    let conn;

    try {
        conn = await getConn();

        const demanda = await conn.execute(
            `SELECT id
             FROM demandas
             WHERE id = :id`,
            { id }
        );

        if (!demanda.rows || demanda.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Demanda não encontrada.',
            });
        }

        const resultado = await conn.execute(
            `INSERT INTO comentarios (
                id_demanda,
                id_usuario,
                texto_comentario
            )
            VALUES (
                :idDemanda,
                :idUsuario,
                :texto
            )
            RETURNING id INTO :idComentario`,
            {
                idDemanda: id,
                idUsuario: usuarioLogado.id,
                texto: texto.trim(),
                idComentario: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER,
                },
            },
            { autoCommit: true }
        );

        const idComentario = (resultado.outBinds as any).idComentario[0];

        const novoComentario = await conn.execute(
            `SELECT
                c.id AS "id",
                c.id_demanda AS "demandaId",
                c.id_usuario AS "usuarioId",
                u.nome AS "usuario",
                c.texto_comentario AS "texto",
                TO_CHAR(c.data_hora, 'DD/MM/YYYY HH24:MI') AS "dataHora"
            FROM comentarios c
            INNER JOIN usuarios u ON u.id = c.id_usuario
            WHERE c.id = :idComentario`,
            { idComentario }
        );

        return res.status(201).json({
            mensagem: 'Comentário cadastrado com sucesso.',
            comentario: (novoComentario.rows as any[])[0],
        });
    } catch (erro) {
        console.error('Erro ao cadastrar comentário:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao cadastrar o comentário.',
        });
    } finally {
        if (conn) {
            await conn.close();
        }
    }
});

export default router;
