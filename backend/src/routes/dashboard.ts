/*
 * Feito por João Pedro Barbosa da Silva (Aluno 2) - RA 25016974
 *
 * Rota responsável pelo Dashboard (tela inicial do sistema).
 *
 * GET /dashboard: retorna um resumo das demandas cadastradas:
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
 * Os dados ficam em memória (../data/dados). Quando o banco de dados
 * for integrado, apenas a forma de acesso aos dados deverá mudar.
 */

import { Router, Request, Response } from "express";
import { demandas, projetos, usuarios } from "../data/dados";

const router = Router();

// Janela (em dias) usada para considerar uma demanda "próxima do prazo"
const DIAS_PROXIMO_PRAZO = 7;

// Categorias oficiais do escopo, usadas para montar as contagens do resumo
const STATUS = ["Aberta", "Em andamento", "Em revisão", "Concluída", "Cancelada"];
const PRIORIDADES = ["Crítica", "Alta", "Média", "Baixa"];
const TIPOS = ["Tarefa", "Defeito", "Melhoria", "Documentação"];

// Status considerados finais: quando a demanda deixa de estar "em aberto"
const STATUS_FINAIS = ["concluída", "concluida", "cancelada"];

// Normaliza um texto para comparar sem diferença de acento/caixa
const normalizar = (valor: unknown): string =>
    String(valor ?? "").trim().toLocaleLowerCase("pt-BR");

// Indica se uma demanda está "em aberto" (não concluída e não cancelada)
const estaEmAberto = (status: unknown): boolean =>
    !STATUS_FINAIS.includes(normalizar(status));

// Formata uma data no padrão ISO (YYYY-MM-DD) para comparar prazos como texto
const dataISO = (data: Date): string => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
};

// Conta quantas demandas existem em cada categoria de um campo
const contarPor = (
    campo: "status" | "prioridade" | "tipo",
    categorias: string[]
): Record<string, number> => {
    const contagem: Record<string, number> = {};

    categorias.forEach((categoria) => {
        contagem[categoria] = demandas.filter(
            (demanda) => normalizar(demanda[campo]) === normalizar(categoria)
        ).length;
    });

    return contagem;
};

// Enriquece a demanda com o nome do projeto e do responsável (como na listagem)
const detalharDemanda = (demanda: (typeof demandas)[number]) => {
    const projeto = projetos.find((item) => item.id === demanda.projetoId);
    const usuario = usuarios.find((item) => item.id === demanda.responsavelId);

    return {
        ...demanda,
        projeto: projeto?.nome ?? "Sem projeto",
        responsavel: usuario?.nome ?? "Não atribuído"
    };
};

router.get("/", (req: Request, res: Response) => {
    // Datas de referência para o critério "próxima do prazo"
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + DIAS_PROXIMO_PRAZO);

    const hojeISO = dataISO(hoje);
    const limiteISO = dataISO(limite);

    // Demandas críticas que ainda estão em aberto, ordenadas pelo prazo
    const criticasEmAberto = demandas
        .filter(
            (demanda) =>
                normalizar(demanda.prioridade) === "crítica" &&
                estaEmAberto(demanda.status)
        )
        .map(detalharDemanda)
        .sort((a, b) => a.prazoFinalizacao.localeCompare(b.prazoFinalizacao));

    // Demandas em aberto cujo prazo ocorre de hoje até o limite, ordenadas pelo prazo
    const proximasDoPrazo = demandas
        .filter(
            (demanda) =>
                estaEmAberto(demanda.status) &&
                demanda.prazoFinalizacao >= hojeISO &&
                demanda.prazoFinalizacao <= limiteISO
        )
        .map(detalharDemanda)
        .sort((a, b) => a.prazoFinalizacao.localeCompare(b.prazoFinalizacao));

    // Resposta padronizada em JSON com todo o resumo do dashboard
    return res.status(200).json({
        total: demandas.length,
        porStatus: contarPor("status", STATUS),
        porPrioridade: contarPor("prioridade", PRIORIDADES),
        porTipo: contarPor("tipo", TIPOS),
        criticasEmAberto,
        proximasDoPrazo,
        criterios: {
            emAberto:
                "Demanda com status diferente de Concluída e Cancelada (Aberta, Em andamento ou Em revisão).",
            proximasDoPrazo: `Demanda em aberto cujo prazo de finalização ocorre de hoje até ${DIAS_PROXIMO_PRAZO} dias à frente.`
        }
    });
});

export default router;
