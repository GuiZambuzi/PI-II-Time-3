/*
 * Autor: Guilherme Henrique Lopes Zambuzi
 * Descrição: Rota de listagem de demandas (com filtros, ordenação, paginação e
 * contador de dias úteis excluindo fins de semana e feriados nacionais) e
 * atualização de status com validação de permissão por perfil.
 */

import { Router, Request, Response } from "express";
import { getConn } from "../database/db";
import { exigirLogin } from "../middleware/exigirLogin";
// permissões por perfil (João Victor Grisolia Luis)
import {
    filtroDemandasVisiveis,
    podeGerenciarDemanda,
    DemandaPermissao
} from "../middleware/permissoes";
// cache de feriados nacionais via BrasilAPI
import { buscarFeriadosDoAno } from "../feriados";

const router = Router();

const normalizar = (valor: unknown): string =>
    String(valor ?? "").trim().toLocaleLowerCase("pt-BR");

// Transições permitidas por perfil para o board ("pendente", "em analise", "em execucao", "concluido")
// Ajuste conforme os status exatos salvos na tabela demandas do seu time
const TRANSICOES_POR_PERFIL: Record<string, Record<string, string[]>> = {
    "Membro da Equipe": {
        "pendente": ["em analise", "em execucao"],
        "em analise": ["em execucao"],
        "em execucao": ["em analise"]
    },
    "Líder de Projeto": {
        "pendente": ["em analise", "em execucao", "concluido"],
        "em analise": ["pendente", "em execucao", "concluido"],
        "em execucao": ["em analise", "concluido"],
        "concluido": ["em execucao"]
    },
    "Administrador": {
        "pendente": ["em analise", "em execucao", "concluido"],
        "em analise": ["pendente", "em execucao", "concluido"],
        "em execucao": ["em analise", "concluido"],
        "concluido": ["em analise", "em execucao"]
    }
};

function extrairDataLocal(valor: unknown): Date | null {
    if (!valor) return null;

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) return null;
        return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
    }

    const texto = String(valor).trim();
    const matchISO = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
    if (matchISO) {
        const ano = Number(matchISO[1]);
        const mes = Number(matchISO[2]);
        const dia = Number(matchISO[3]);
        return new Date(ano, mes - 1, dia);
    }

    const parsed = new Date(texto);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatarDataISO(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

async function obterSetFeriados(anoInicial: number, anoFinal: number): Promise<Set<string>> {
    const set = new Set<string>();
    const inicio = Math.min(anoInicial, anoFinal);
    const fim = Math.max(anoInicial, anoFinal);

    for (let ano = inicio; ano <= fim; ano++) {
        const lista = await buscarFeriadosDoAno(ano);
        for (const feriado of lista) {
            set.add(feriado.date);
        }
    }

    return set;
}

function calcularDiasUteis(
    dataCriacaoRaw: unknown,
    dataFimRaw: unknown,
    feriadosSet: Set<string>
): number {
    const inicio = extrairDataLocal(dataCriacaoRaw);
    const agora = new Date();
    const fimPadrao = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fim = extrairDataLocal(dataFimRaw) ?? fimPadrao;

    if (!inicio || fim <= inicio) {
        return 0;
    }

    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1);
    let diasUteis = 0;

    while (cursor <= fim) {
        const diaSemana = cursor.getDay(); // 0 = domingo, 6 = sábado
        const iso = formatarDataISO(cursor);

        if (diaSemana !== 0 && diaSemana !== 6 && !feriadosSet.has(iso)) {
            diasUteis++;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return diasUteis;
}

router.get("/", exigirLogin, async (req: Request, res: Response) => {
    let conn;

    try {
        conn = await getConn();

        const busca = String(req.query.busca || "").trim();
        const status = String(req.query.status || "").trim();
        const prioridade = String(req.query.prioridade || "").trim();
        const tipo = String(req.query.tipo || "").trim();
        const ordenacao = String(req.query.ordenacao || "").trim();
        const pagina = Math.max(1, Number(req.query.pagina) || 1);
        const limite = Math.max(1, Math.min(100, Number(req.query.limite) || 10));
        const deslocamento = (pagina - 1) * limite;

        let sql = `
            SELECT
                d.id AS "id",
                d.titulo AS "titulo",
                DBMS_LOB.SUBSTR(d.descricao, 4000, 1) AS "descricao",
                d.tipo AS "tipo",
                d.prioridade AS "prioridade",
                d.status AS "status",
                d.id_projeto AS "idProjeto",
                p.nome AS "projeto",
                d.id_responsavel AS "idResponsavel",
                NVL(u.nome, 'Não atribuído') AS "responsavel",
                TO_CHAR(d.data_criacao, 'YYYY-MM-DD') AS "dataCriacao",
                TO_CHAR(d.data_ultima_atualizacao, 'YYYY-MM-DD') AS "dataUltimaAtualizacao",
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

        // Permissão por perfil: Líder e Membro só veem as demandas dos projetos
        // em que estão vinculados ou atribuídas a eles; o Administrador vê todas.
        const visiveis = filtroDemandasVisiveis(req.session.usuario!);

        let filtros = visiveis.sql;
        const binds: any = { ...visiveis.binds };

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

        const linhas: any[] = resultado.rows || [];

        const anoAtual = new Date().getFullYear();
        let menorAno = anoAtual;
        for (const item of linhas) {
            const dtCriacao = extrairDataLocal(item.dataCriacao);
            if (dtCriacao && dtCriacao.getFullYear() < menorAno) {
                menorAno = dtCriacao.getFullYear();
            }
        }

        let feriadosSet = new Set<string>();
        try {
            feriadosSet = await obterSetFeriados(menorAno, anoAtual);
        } catch (erroApi) {
            console.warn("Aviso: falha ao carregar feriados para o contador de dias úteis:", erroApi);
        }

        const demandas = linhas.map((item) => {
            const statusNorm = normalizar(item.status);
            const encerrada = statusNorm === "concluido" || statusNorm === "concluída" || statusNorm === "cancelada";
            const dataLimite = encerrada ? item.dataUltimaAtualizacao : new Date();

            return {
                ...item,
                diasUteisAberto: calcularDiasUteis(item.dataCriacao, dataLimite, feriadosSet)
            };
        });

        return res.status(200).json({
            demandas,
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

// Atualiza o status da demanda (usado quando o usuário muda o status do card/visualização)
router.patch("/:id/status", exigirLogin, async (req: Request, res: Response) => {
    const idDemanda = Number(req.params.id);
    if (!Number.isInteger(idDemanda) || idDemanda <= 0) {
        return res.status(400).json({ mensagem: "ID da demanda inválido." });
    }

    const novoStatusBruto = String(req.body?.status ?? "").trim();
    const novoStatusNorm = normalizar(novoStatusBruto);

    if (!novoStatusBruto) {
        return res.status(400).json({ mensagem: "O novo status é obrigatório." });
    }

    const usuario = req.session.usuario!;
    let conn;

    try {
        conn = await getConn();

        interface DemandaStatusRow extends DemandaPermissao {
            status: string;
            dataCriacao: string | null;
        }

        const consulta = await conn.execute<DemandaStatusRow>(
            `SELECT
                d.id AS "id",
                d.id_projeto AS "idProjeto",
                d.id_responsavel AS "idResponsavel",
                d.status AS "status",
                TO_CHAR(d.data_criacao, 'YYYY-MM-DD') AS "dataCriacao"
             FROM demandas d
             WHERE d.id = :id`,
            { id: idDemanda }
        );

        const atual = consulta.rows?.[0];
        if (!atual) {
            return res.status(404).json({ mensagem: "Demanda não encontrada." });
        }

        if (!(await podeGerenciarDemanda(conn, usuario, atual))) {
            return res.status(403).json({
                mensagem: "Você não tem permissão para alterar o status desta demanda."
            });
        }

        const statusAtualNorm = normalizar(atual.status);
        if (statusAtualNorm === novoStatusNorm) {
            return res.status(200).json({
                mensagem: "Status mantido.",
                demanda: { id: atual.id, status: atual.status }
            });
        }

        const mapaPerfil = TRANSICOES_POR_PERFIL[usuario.perfil] || {};
        const destinosPermitidos = mapaPerfil[statusAtualNorm] || [];

        if (!destinosPermitidos.includes(novoStatusNorm)) {
            return res.status(403).json({
                mensagem: `Perfil "${usuario.perfil}" não pode alterar o status de "${atual.status}" para "${novoStatusBruto}".`
            });
        }

        await conn.execute(
            `UPDATE demandas
             SET status = :status,
                 data_ultima_atualizacao = CURRENT_TIMESTAMP
             WHERE id = :id`,
            {
                status: novoStatusBruto,
                id: idDemanda
            }
        );

        await conn.execute(
            `INSERT INTO historico_alteracoes (id_demanda, id_usuario, descricao_alteracao)
             VALUES (:idDemanda, :idUsuario, :descricao)`,
            {
                idDemanda,
                idUsuario: usuario.id,
                descricao: `${usuario.nome} alterou o status da demanda de ${atual.status} para ${novoStatusBruto}.`
            }
        );

        await conn.commit();

        const anoAtual = new Date().getFullYear();
        const dtCriacao = extrairDataLocal(atual.dataCriacao);
        const anoInicial = dtCriacao ? dtCriacao.getFullYear() : anoAtual;

        let feriadosSet = new Set<string>();
        try {
            feriadosSet = await obterSetFeriados(anoInicial, anoAtual);
        } catch (erroApi) {
            console.warn("Aviso: falha ao carregar feriados após atualizar status:", erroApi);
        }

        const encerrada = novoStatusNorm === "concluido" || novoStatusNorm === "concluída" || novoStatusNorm === "cancelada";
        const hojeISO = formatarDataISO(new Date());
        const diasUteisAberto = calcularDiasUteis(
            atual.dataCriacao,
            encerrada ? hojeISO : new Date(),
            feriadosSet
        );

        return res.status(200).json({
            mensagem: "Status atualizado com sucesso.",
            demanda: {
                id: atual.id,
                status: novoStatusBruto,
                diasUteisAberto
            }
        });
    } catch (erro) {
        if (conn) {
            try {
                await conn.rollback();
            } catch (e) {
                console.error("Erro ao desfazer transação:", e);
            }
        }
        console.error("Erro ao atualizar status da demanda:", erro);
        return res.status(500).json({
            mensagem: "Erro interno ao atualizar o status da demanda."
        });
    } finally {
        if (conn) {
            await conn.close();
        }
    }
});

export default router;