
/*
 * Feito por Rafael França Cardoso
 *
 * Rota responsável pela listagem de demandas.
 *
 * Permite buscar, filtrar e ordenar demandas utilizando
 * os dados compartilhados do sistema.
 *
 * Retorna erro 400 quando os parâmetros dos filtros
 * ou da ordenação são inválidos.
 */

import { Router, Request, Response } from "express";
import { demandas, projetos, usuarios } from "../data/dados";

const router = Router();

const normalizar = (valor: unknown): string =>
    String(valor ?? "").trim().toLocaleLowerCase("pt-BR");

router.get("/", (req: Request, res: Response) => {
    const busca = normalizar(req.query.busca);
    const status = normalizar(req.query.status);
    const prioridade = normalizar(req.query.prioridade);
    const tipo = normalizar(req.query.tipo);
    const ordenacao = normalizar(req.query.ordenacao);

    const statusPermitidos = [
        "aberta",
        "em andamento",
        "em revisão",
        "concluída",
        "cancelada"
    ];

    const prioridadesPermitidas = [
        "crítica",
        "critica",
        "alta",
        "média",
        "media",
        "baixa"
    ];

    const tiposPermitidos = [
        "tarefa",
        "defeito",
        "melhoria",
        "documentação"
    ];

    const ordenacoesPermitidas = [
        "prioridade",
        "criacao",
        "prazo",
        "status"
    ];

    // Validação dos parâmetros recebidos
    if (
        status &&
        status !== "todos" &&
        !statusPermitidos.includes(status)
    ) {
        return res.status(400).json({
            mensagem: "Status inválido."
        });
    }

    if (
        prioridade &&
        prioridade !== "todas" &&
        !prioridadesPermitidas.includes(prioridade)
    ) {
        return res.status(400).json({
            mensagem: "Prioridade inválida."
        });
    }

    if (
        tipo &&
        tipo !== "todos" &&
        !tiposPermitidos.includes(tipo)
    ) {
        return res.status(400).json({
            mensagem: "Tipo inválido."
        });
    }

    if (
        ordenacao &&
        ordenacao !== "nenhuma" &&
        !ordenacoesPermitidas.includes(ordenacao)
    ) {
        return res.status(400).json({
            mensagem: "Ordenação inválida."
        });
    }

    // Relaciona cada demanda ao projeto e ao responsável
    let resultado = demandas.map((demanda) => {
        const projeto = projetos.find(
            (item) => item.id === demanda.projetoId
        );

        const usuario = usuarios.find(
            (item) => item.id === demanda.responsavelId
        );

        return {
            ...demanda,
            projeto: projeto?.nome ?? "Sem projeto",
            responsavel: usuario?.nome ?? "Não atribuído"
        };
    });

    // Busca por título ou descrição
    if (busca) {
        resultado = resultado.filter((demanda) =>
            [
                demanda.titulo,
                demanda.descricao
            ].some((campo) => normalizar(campo).includes(busca))
        );
    }

    // Filtro por status
    if (status && status !== "todos") {
        resultado = resultado.filter(
            (demanda) => normalizar(demanda.status) === status
        );
    }

    // Filtro por prioridade
    if (prioridade && prioridade !== "todas") {
        resultado = resultado.filter(
            (demanda) => normalizar(demanda.prioridade) === prioridade
        );
    }

    // Filtro por tipo
    if (tipo && tipo !== "todos") {
        resultado = resultado.filter(
            (demanda) => normalizar(demanda.tipo) === tipo
        );
    }

    // Ordenação por prioridade
    const ordemPrioridade: Record<string, number> = {
        "crítica": 1,
        "critica": 1,
        "alta": 2,
        "média": 3,
        "media": 3,
        "baixa": 4
    };

    if (ordenacao === "prioridade") {
        resultado.sort(
            (a, b) =>
                (ordemPrioridade[normalizar(a.prioridade)] ?? 99) -
                (ordemPrioridade[normalizar(b.prioridade)] ?? 99)
        );
    } else if (ordenacao === "criacao") {
        resultado.sort((a, b) =>
            a.dataCriacao.localeCompare(b.dataCriacao)
        );
    } else if (ordenacao === "prazo") {
        resultado.sort((a, b) =>
            a.prazoFinalizacao.localeCompare(b.prazoFinalizacao)
        );
    } else if (ordenacao === "status") {
        resultado.sort((a, b) =>
            a.status.localeCompare(b.status, "pt-BR")
        );
    }

    // Retorna as demandas encontradas
    return res.status(200).json(resultado);
});

export default router;