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
// permissões por perfil (João Victor Grisolia Luis)
import {
    exigirPerfil,
    ehAdministrador,
    podeAcessarProjeto,
    podeGerenciarDemanda,
    ADMINISTRADOR,
    LIDER,
    DemandaPermissao
} from "../middleware/permissoes";
// verificação de feriado nacional via API externa (BrasilAPI)
import { buscarFeriadoNacional } from "../feriados";

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

/**
 * Valida o prazo de finalização (usado no cadastro e na edição):
 *  1) formato AAAA-MM-DD (evita ORA-01861 no TO_DATE);
 *  2) data que realmente existe (o regex aceitaria 2026-02-30);
 *  3) não pode ser feriado nacional (API externa, regra 2.2.5 do escopo).
 * Retorna null se estiver tudo certo, ou { status, mensagem } para a rota responder.
 */
async function validarPrazo(prazo: string): Promise<{ status: number; mensagem: string } | null> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo)) {
        return { status: 400, mensagem: "Prazo inválido. Use o formato AAAA-MM-DD." };
    }

    const data = new Date(`${prazo}T00:00:00Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== prazo) {
        return { status: 400, mensagem: "Prazo inválido. A data informada não existe." };
    }

    try {
        const feriado = await buscarFeriadoNacional(prazo);
        if (feriado) {
            return {
                status: 400,
                mensagem: `O prazo de finalização não pode ser um feriado nacional (${feriado}). Escolha outra data.`
            };
        }
    } catch (erro) {
        console.error("Erro ao consultar a API de feriados:", erro instanceof Error ? erro.message : erro);
        return {
            status: 503,
            mensagem: "Não foi possível verificar se o prazo é feriado agora. Tente novamente em instantes."
        };
    }

    return null;
}

// Converte AAAA-MM-DD para DD/MM/AAAA (usado nas frases do histórico)
const formatarDataBR = (iso: string): string => iso.split("-").reverse().join("/");

// 1. ROTA GET /projetos: Lista apenas os projetos vinculados ao usuário logado
// (o Administrador vê todos os projetos - permissão do perfil, item 2.1.1)
router.get("/projetos", exigirLogin, async (req: Request, res: Response) => {
    // O usuário vem da sessão (cookie), nunca do corpo ou da URL
    const usuario = req.session.usuario!;

    let conn;
    try {
        conn = await getConn();
        const resultado: any = ehAdministrador(usuario)
            ? await conn.execute(
                `SELECT p.id AS "id", p.nome AS "nome", p.descricao AS "descricao"
                   FROM projetos p
                  ORDER BY p.id`
            )
            : await conn.execute(
                `SELECT p.id AS "id", p.nome AS "nome", p.descricao AS "descricao"
                   FROM projetos p
                   JOIN usuario_projetos up ON up.id_projeto = p.id
                  WHERE up.id_usuario = :idUsuario
                  ORDER BY p.id`,
                { idUsuario: usuario.id }
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

// OBS: o GET /usuarios (select de responsáveis) fica em routes/usuarios.ts,
// protegido por exigirLogin. A cópia que existia aqui nunca era executada
// (o usuariosRouter é montado antes no server.ts) e não exigia login.

// 2. ROTA POST /demandas: Cadastra uma nova demanda com validações e persistência no Oracle
// Só Administrador e Líder de Projeto criam demandas (Membro da Equipe recebe 403)
router.post("/demandas", exigirLogin, exigirPerfil(ADMINISTRADOR, LIDER), async (req: Request, res: Response) => {
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

    // Formato, data real e feriado nacional (API externa).
    // Roda ANTES de abrir a conexão com o banco, para não segurar uma conexão
    // do pool enquanto espera a resposta da internet.
    const prazoTexto = String(prazo_finalizacao);
    const erroPrazo = await validarPrazo(prazoTexto);
    if (erroPrazo) {
        return res.status(erroPrazo.status).json({ mensagem: erroPrazo.mensagem });
    }

    const usuario = req.session.usuario!;

    let conn;
    try {
        conn = await getConn();

        // Verificar se o usuário logado está vinculado ao projeto informado
        // (o Administrador pode cadastrar em qualquer projeto)
        if (!(await podeAcessarProjeto(conn, usuario, Number(id_projeto)))) {
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
                prazo: prazoTexto
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

// Dados atuais da demanda usados na edição (inclui o que as checagens de permissão precisam)
interface DemandaEdicao extends DemandaPermissao {
    titulo: string;
    descricao: string;
    tipo: string;
    prioridade: string;
    prazo: string;              // AAAA-MM-DD
    responsavelNome: string | null;
}

// 3. ROTA PATCH /demandas/:id: Edita os dados de uma demanda existente (item "editar demanda" do escopo)
// - Só Administrador e Líder de Projeto (o Líder só nas demandas dos projetos dele);
// - Campos editáveis: título, descrição, tipo, prioridade, responsável e prazo.
//   Projeto e status NÃO mudam aqui (status tem rota própria; projeto é estrutural);
// - Atualiza data_ultima_atualizacao automaticamente e grava cada mudança
//   no histórico (historico_alteracoes), tudo na mesma transação.
router.patch("/demandas/:id", exigirLogin, exigirPerfil(ADMINISTRADOR, LIDER), async (req: Request, res: Response) => {
    const idDemanda = Number(req.params.id);
    if (!Number.isInteger(idDemanda) || idDemanda <= 0) {
        return res.status(400).json({ mensagem: "ID da demanda inválido." });
    }

    const { titulo, descricao, tipo, prioridade, id_responsavel, prazo_finalizacao } = req.body ?? {};

    // Mesmos campos obrigatórios do cadastro (o responsável continua opcional)
    if (!titulo || !descricao || !tipo || !prioridade || !prazo_finalizacao) {
        return res.status(400).json({
            mensagem: "Dados incompletos. Título, descrição, tipo, prioridade e prazo são obrigatórios."
        });
    }

    const tipoCanonico = TIPOS[normalizar(tipo)];
    const prioridadeCanonica = PRIORIDADES[normalizar(prioridade)];

    if (!tipoCanonico) {
        return res.status(400).json({
            mensagem: "Tipo de demanda inválido. Permitidos: Tarefa, Defeito, Melhoria ou Documentação."
        });
    }
    if (!prioridadeCanonica) {
        return res.status(400).json({
            mensagem: "Prioridade inválida. Permitidas: Crítica, Alta, Média ou Baixa."
        });
    }

    const novoTitulo = String(titulo).trim();
    const novaDescricao = String(descricao).trim();
    const novoPrazo = String(prazo_finalizacao);
    const novoResponsavel: number | null =
        id_responsavel === undefined || id_responsavel === null || id_responsavel === ""
            ? null
            : Number(id_responsavel);

    if (novoResponsavel !== null && !Number.isInteger(novoResponsavel)) {
        return res.status(400).json({ mensagem: "Responsável inválido." });
    }

    const usuario = req.session.usuario!;

    let conn;
    try {
        conn = await getConn();

        // 1. Carrega a demanda atual (404 se não existir)
        const consulta = await conn.execute<DemandaEdicao>(
            `SELECT d.id AS "id", d.id_projeto AS "idProjeto", d.id_responsavel AS "idResponsavel",
                    d.status AS "status", d.titulo AS "titulo", d.descricao AS "descricao",
                    d.tipo AS "tipo", d.prioridade AS "prioridade",
                    TO_CHAR(d.prazo_finalizacao, 'YYYY-MM-DD') AS "prazo",
                    u.nome AS "responsavelNome"
               FROM demandas d
               LEFT JOIN usuarios u ON u.id = d.id_responsavel
              WHERE d.id = :id`,
            { id: idDemanda }
        );
        const atual = consulta.rows?.[0];
        if (!atual) {
            return res.status(404).json({ mensagem: "Demanda não encontrada." });
        }

        // 2. Permissão: Administrador em qualquer demanda; Líder só nos projetos dele
        if (!(await podeGerenciarDemanda(conn, usuario, atual))) {
            return res.status(403).json({ mensagem: "Você não tem permissão para editar esta demanda." });
        }

        // 3. Demanda encerrada não é editada (preserva o que foi concluído/cancelado)
        if (atual.status === "Concluída" || atual.status === "Cancelada") {
            return res.status(409).json({
                mensagem: `Não é possível editar uma demanda ${atual.status.toLowerCase()}.`
            });
        }

        // 4. Descobre o que realmente mudou
        const prazoMudou = novoPrazo !== atual.prazo;
        const responsavelMudou = novoResponsavel !== (atual.idResponsavel ?? null);

        // 5. Prazo novo: formato, data real e feriado nacional.
        // Só valida se o prazo mudou, para não bloquear a edição de título/descrição
        // de uma demanda antiga cujo prazo já estava salvo.
        if (prazoMudou) {
            const erroPrazo = await validarPrazo(novoPrazo);
            if (erroPrazo) {
                return res.status(erroPrazo.status).json({ mensagem: erroPrazo.mensagem });
            }
        }

        // 6. Responsável novo precisa existir (e precisamos do nome para o histórico)
        let nomeNovoResponsavel: string | null = null;
        if (responsavelMudou && novoResponsavel !== null) {
            const existe: any = await conn.execute(
                `SELECT nome AS "nome" FROM usuarios WHERE id = :id`,
                { id: novoResponsavel }
            );
            if (!existe.rows || existe.rows.length === 0) {
                return res.status(400).json({
                    mensagem: "O usuário responsável informado não existe no banco de dados."
                });
            }
            nomeNovoResponsavel = existe.rows[0].nome;
        }

        // 7. Monta o UPDATE só com os campos alterados e as frases do histórico
        const sets: string[] = [];
        const binds: Record<string, any> = { id: idDemanda };
        const historico: string[] = [];
        const quem = usuario.nome;

        if (novoTitulo !== atual.titulo) {
            sets.push("titulo = :titulo");
            binds.titulo = novoTitulo;
            historico.push(`${quem} alterou o título da demanda de "${atual.titulo}" para "${novoTitulo}".`);
        }
        if (novaDescricao !== atual.descricao) {
            sets.push("descricao = :descricao");
            binds.descricao = novaDescricao;
            historico.push(`${quem} alterou a descrição da demanda.`);
        }
        if (tipoCanonico !== atual.tipo) {
            sets.push("tipo = :tipo");
            binds.tipo = tipoCanonico;
            historico.push(`${quem} alterou o tipo da demanda de ${atual.tipo} para ${tipoCanonico}.`);
        }
        if (prioridadeCanonica !== atual.prioridade) {
            sets.push("prioridade = :prioridade");
            binds.prioridade = prioridadeCanonica;
            historico.push(`${quem} alterou a prioridade da demanda de ${atual.prioridade} para ${prioridadeCanonica}.`);
        }
        if (responsavelMudou) {
            sets.push("id_responsavel = :idResponsavel");
            binds.idResponsavel = novoResponsavel;
            historico.push(
                `${quem} alterou o responsável da demanda de ${atual.responsavelNome ?? "(sem responsável)"} ` +
                `para ${nomeNovoResponsavel ?? "(sem responsável)"}.`
            );
        }
        if (prazoMudou) {
            sets.push("prazo_finalizacao = TO_DATE(:prazo, 'YYYY-MM-DD')");
            binds.prazo = novoPrazo;
            historico.push(
                `${quem} alterou o prazo de finalização da demanda de ${formatarDataBR(atual.prazo)} para ${formatarDataBR(novoPrazo)}.`
            );
        }

        // Nada mudou: não mexe no banco nem na data da última atualização
        if (sets.length === 0) {
            return res.status(200).json({ mensagem: "Nenhuma alteração foi feita na demanda." });
        }

        // 8. UPDATE + histórico na mesma transação (sem autoCommit: ou grava tudo, ou nada)
        sets.push("data_ultima_atualizacao = CURRENT_TIMESTAMP");
        await conn.execute(`UPDATE demandas SET ${sets.join(", ")} WHERE id = :id`, binds);

        for (const frase of historico) {
            await conn.execute(
                `INSERT INTO historico_alteracoes (id_demanda, id_usuario, descricao_alteracao)
                 VALUES (:idDemanda, :idUsuario, :descricao)`,
                { idDemanda, idUsuario: usuario.id, descricao: frase }
            );
        }

        await conn.commit();

        return res.status(200).json({ mensagem: "Demanda atualizada com sucesso!" });

    } catch (error) {
        // desfaz o que foi feito antes do erro (UPDATE sem o histórico, por exemplo)
        if (conn) {
            try {
                await conn.rollback();
            } catch (e) {
                console.error("Erro ao desfazer a transação:", e);
            }
        }
        console.error("Erro ao editar demanda no Oracle:", error);
        return res.status(500).json({
            mensagem: "Erro interno no servidor ao tentar atualizar a demanda."
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