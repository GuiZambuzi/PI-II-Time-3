/*
 * Feito por João Pedro Barbosa da Silva (Aluno 2) - RA 25016974
 *
 * Rota responsável pelo Dashboard (tela inicial do sistema).
 *
 * GET /dashboard: retorna um resumo das demandas gravadas no banco Oracle:
 *   - total de demandas;
 *   - quantidades por status, por prioridade e por tipo;
 *   - demandas críticas em aberto;
 *   - demandas próximas do prazo de finalização.
 *
 * Critérios definidos pela equipe:
 *   - "Em aberto": demanda cujo status NÃO é Concluída nem Cancelada
 *     (ou seja, Aberta, Em andamento ou Em revisão).
 *   - "Próxima do prazo": demanda em aberto cujo prazo de finalização
 *     ocorre de hoje até DIAS_PROXIMO_PRAZO dias à frente.
 *
 * Os dados são lidos do banco por meio do pool de conexões (database/db.ts).
 * A rota exige usuário autenticado (middleware exigirLogin): sem login, 401.
 */

import { Router, Request, Response } from "express";
import { getConn } from "../database/db";
import { exigirLogin } from "../middleware/exigirLogin";
// permissões por perfil (João Victor Grisolia Luis)
import { filtroDemandasVisiveis } from "../middleware/permissoes";

const router = Router();

// Janela (em dias) usada para considerar uma demanda "próxima do prazo"
const DIAS_PROXIMO_PRAZO = 7;

// Categorias oficiais do escopo, usadas para montar as contagens do resumo
// (categorias sem nenhuma demanda aparecem com 0, e não somem do resultado)
const STATUS = ["Aberta", "Em andamento", "Em revisão", "Concluída", "Cancelada"];
const PRIORIDADES = ["Crítica", "Alta", "Média", "Baixa"];
const TIPOS = ["Tarefa", "Defeito", "Melhoria", "Documentação"];

// Linha devolvida pela consulta de contagem (GROUP BY status, prioridade, tipo)
interface LinhaContagem {
    status: string;
    prioridade: string;
    tipo: string;
    quantidade: number;
}

// Formata uma data no padrão ISO (YYYY-MM-DD), usado como bind nas consultas
const dataISO = (data: Date): string => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
};

// Cria o objeto de contagem com todas as categorias zeradas
const contagemZerada = (categorias: string[]): Record<string, number> => {
    const contagem: Record<string, number> = {};
    categorias.forEach((categoria) => {
        contagem[categoria] = 0;
    });
    return contagem;
};

// Colunas das listas de demandas (críticas e próximas do prazo).
// Os apelidos entre aspas mantêm o formato JSON que a tela já espera.
const COLUNAS_LISTA = `
    d.id AS "id",
    d.titulo AS "titulo",
    d.tipo AS "tipo",
    d.prioridade AS "prioridade",
    d.status AS "status",
    p.nome AS "projeto",
    NVL(u.nome, 'Não atribuído') AS "responsavel",
    TO_CHAR(d.prazo_finalizacao, 'YYYY-MM-DD') AS "prazoFinalizacao"
`;

const JOINS_LISTA = `
    FROM demandas d
    INNER JOIN projetos p ON d.id_projeto = p.id
    LEFT JOIN usuarios u ON d.id_responsavel = u.id
`;

router.get("/", exigirLogin, async (req: Request, res: Response) => {
    let conn;

    try {
        conn = await getConn();

        // Datas de referência para o critério "próxima do prazo"
        const hoje = new Date();
        const limite = new Date();
        limite.setDate(limite.getDate() + DIAS_PROXIMO_PRAZO);

        // Permissão por perfil: os indicadores consideram só as demandas que o
        // usuário pode ver (Administrador: todas; Líder/Membro: dos projetos dele
        // ou atribuídas a ele)
        const visiveis = filtroDemandasVisiveis(req.session.usuario!);

        // 1) Contagem agrupada: uma única consulta serve para o total e para
        //    as três distribuições (status, prioridade e tipo).
        const resultadoContagem = await conn.execute(
            `SELECT
                d.status AS "status",
                d.prioridade AS "prioridade",
                d.tipo AS "tipo",
                COUNT(*) AS "quantidade"
             FROM demandas d
             WHERE 1 = 1 ${visiveis.sql}
             GROUP BY d.status, d.prioridade, d.tipo`,
            visiveis.binds
        );

        const porStatus = contagemZerada(STATUS);
        const porPrioridade = contagemZerada(PRIORIDADES);
        const porTipo = contagemZerada(TIPOS);
        let total = 0;

        ((resultadoContagem.rows || []) as LinhaContagem[]).forEach((linha) => {
            const quantidade = Number(linha.quantidade);
            total += quantidade;
            porStatus[linha.status] = (porStatus[linha.status] || 0) + quantidade;
            porPrioridade[linha.prioridade] = (porPrioridade[linha.prioridade] || 0) + quantidade;
            porTipo[linha.tipo] = (porTipo[linha.tipo] || 0) + quantidade;
        });

        // 2) Demandas críticas que ainda estão em aberto, ordenadas pelo prazo
        const resultadoCriticas = await conn.execute(
            `SELECT ${COLUNAS_LISTA}
             ${JOINS_LISTA}
             WHERE d.prioridade = 'Crítica'
               AND d.status NOT IN ('Concluída', 'Cancelada')
               ${visiveis.sql}
             ORDER BY d.prazo_finalizacao ASC, d.id ASC`,
            visiveis.binds
        );

        // 3) Demandas em aberto cujo prazo ocorre de hoje até o limite
        const resultadoProximas = await conn.execute(
            `SELECT ${COLUNAS_LISTA}
             ${JOINS_LISTA}
             WHERE d.status NOT IN ('Concluída', 'Cancelada')
               AND d.prazo_finalizacao >= TO_DATE(:hoje, 'YYYY-MM-DD')
               AND d.prazo_finalizacao <= TO_DATE(:limite, 'YYYY-MM-DD')
               ${visiveis.sql}
             ORDER BY d.prazo_finalizacao ASC, d.id ASC`,
            { hoje: dataISO(hoje), limite: dataISO(limite), ...visiveis.binds }
        );

        // Resposta padronizada em JSON com todo o resumo do dashboard
        return res.status(200).json({
            total,
            porStatus,
            porPrioridade,
            porTipo,
            criticasEmAberto: resultadoCriticas.rows || [],
            proximasDoPrazo: resultadoProximas.rows || [],
            criterios: {
                emAberto:
                    "Demanda com status diferente de Concluída e Cancelada (Aberta, Em andamento ou Em revisão).",
                proximasDoPrazo: `Demanda em aberto cujo prazo de finalização ocorre de hoje até ${DIAS_PROXIMO_PRAZO} dias à frente.`
            }
        });
    } catch (erro) {
        // O detalhe técnico fica só no terminal; o usuário recebe uma mensagem amigável
        console.error("Erro ao montar o dashboard:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível carregar o dashboard."
        });
    } finally {
        // Devolve a conexão ao pool, mesmo quando ocorre erro
        if (conn) {
            try {
                await conn.close();
            } catch (erro) {
                console.error("Erro ao fechar a conexão:", erro);
            }
        }
    }
});

export default router;
