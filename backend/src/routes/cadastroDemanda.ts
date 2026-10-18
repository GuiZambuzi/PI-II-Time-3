/*
 * Feito por Guilherme Henrique Lopes Zambuzi
 *
 * Rotas responsáveis pelo Cadastro de Demandas e Listagem de Projetos.
 * Valida dados no servidor, define status inicial e datas automáticas.
 */

import { Router, Request, Response } from "express";
import { demandas, projetos, usuarios } from "../data/dados";

const router = Router();

// Função auxiliar de normalização 
const normalizar = (valor: unknown): string =>
    String(valor ?? "").trim().toLocaleLowerCase("pt-BR");

// 1. ROTA GET /projetos: Lista os projetos disponíveis
router.get("/projetos", (req: Request, res: Response) => {
    return res.status(200).json(projetos);
});

// 2. ROTA POST /demandas: Cadastra uma nova demanda com validações no servidor
router.post("/demandas", (req: Request, res: Response) => {
    const { titulo, descricao, tipo, prioridade, projetoId, responsavelId, prazoFinalizacao } = req.body;

    // Validação de campos obrigatórios exigidos pelo Requisito
    if (!titulo || !descricao || !tipo || !prioridade || !projetoId) {
        return res.status(400).json({
            mensagem: "Dados incompletos. Título, descrição, tipo, prioridade e projeto são obrigatórios."
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

    // Verificar se o projeto informado realmente existe nos dados em memória
    const projetoExiste = projetos.find((p) => p.id === Number(projetoId));
    if (!projetoExiste) {
        return res.status(400).json({
            mensagem: "O projeto informado não existe."
        });
    }

    // Verificar se o usuário responsável existe 
    if (responsavelId !== undefined && responsavelId !== null && responsavelId !== "") {
        const usuarioExiste = usuarios.find((u) => u.id === Number(responsavelId));
        if (!usuarioExiste) {
            return res.status(400).json({
                mensagem: "O usuário responsável informado não existe."
            });
        }
    }

    // Geração de ID incremental seguro com base nos dados atuais
    const novoId = demandas.length > 0 ? Math.max(...demandas.map(d => d.id)) + 1 : 1;
    
    // Data atual no formato YYYY-MM-DD compatível com o array existente
    const dataHoje = new Date().toISOString().split("T")[0];

    // Construção do objeto da nova demanda com regras automáticas do servidor
    const novaDemanda = {
        id: novoId,
        titulo: String(titulo).trim(),
        descricao: String(descricao).trim(),
        tipo: String(tipo),
        prioridade: String(prioridade),
        status: "Aberta", // Definido automaticamente pelo servidor conforme o requisito
        projetoId: Number(projetoId),
        responsavelId: responsavelId ? Number(responsavelId) : null,
        dataCriacao: dataHoje,
        prazoFinalizacao: prazoFinalizacao || null,
        dataAtualizacao: dataHoje
    };

    // Adiciona a demanda ao array em memória compartilhado
    demandas.push(novaDemanda);

    // Retorna código 201 (Created) com a demanda criada
    return res.status(201).json({
        mensagem: "Demanda cadastrada com sucesso!",
        demanda: novaDemanda
    });
});

export default router;