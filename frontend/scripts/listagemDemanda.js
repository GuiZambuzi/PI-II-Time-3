/*
 * Feito por Rafael França Cardoso
 *
 * Este arquivo JavaScript é responsável pela integração
 * da página de Listagem de Demandas com a API.
 *
 * Busca:
 * Consulta demandas pelo título, projeto, responsável e datas.
 *
 * Filtros:
 * Permite filtrar por status, prioridade e tipo.
 *
 * Ordenação:
 * Permite ordenar as demandas pelos critérios disponíveis.
 *
 * Integração:
 * Utiliza fetch para consumir a API e exibir os registros
 * armazenados no banco de dados Oracle.
 *
 * Mensagens:
 * Exibe erros retornados pela API e informa quando não
 * existem demandas correspondentes à pesquisa.
 */

// Endereço da API.
const API_URL = "http://localhost:3000";

// Elementos da página.
const busca = document.querySelector("#busca");
const status = document.querySelector("#status");
const prioridade = document.querySelector("#prioridade");
const tipo = document.querySelector("#tipo");
const ordenacao = document.querySelector("#ordenacao");

const botaoFiltrar = document.querySelector("#btn-filtrar");
const botaoResetar = document.querySelector("#btn-resetar");

const tbody = document.querySelector("#lista-demandas");
const mensagemSemResultados = document.querySelector("#sem-resultados");
const mensagemErro = document.querySelector("#mensagem-erro");

// Formata as datas recebidas da API.
function formatarData(data) {
    if (!data) {
        return "-";
    }

    const partes = String(data).split("T")[0].split("-");

    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return data;
}

// Define a classe CSS de acordo com o status.
function classeStatus(valor) {
    const classes = {
        "aberta": "aberta",
        "em andamento": "andamento",
        "em revisão": "revisao",
        "concluída": "concluida",
        "cancelada": "cancelada"
    };

    return classes[valor.toLowerCase()] || "aberta";
}

// Define a classe CSS de acordo com a prioridade.
function classePrioridade(valor) {
    const classes = {
        "crítica": "critica",
        "critica": "critica",
        "alta": "alta",
        "média": "media",
        "media": "media",
        "baixa": "baixa"
    };

    return classes[valor.toLowerCase()] || "baixa";
}

// Cria um elemento de texto para evitar inserir HTML recebido da API.
function criarCelula(texto) {
    const td = document.createElement("td");

    td.textContent = texto ?? "-";

    return td;
}

// Cria uma etiqueta de status ou prioridade.
function criarEtiqueta(texto, classe) {
    const span = document.createElement("span");

    span.className = classe;
    span.textContent = texto;

    return span;
}

// Cria as linhas da tabela com os dados recebidos.
function exibirDemandas(demandas) {
    tbody.innerHTML = "";

    if (demandas.length === 0) {
        mensagemSemResultados.style.display = "block";
        return;
    }

    mensagemSemResultados.style.display = "none";

    demandas.forEach(function (demanda) {
        const linha = document.createElement("tr");

        linha.appendChild(criarCelula(demanda.titulo));
        linha.appendChild(criarCelula(demanda.tipo));

        const prioridadeCelula = document.createElement("td");

        prioridadeCelula.appendChild(
            criarEtiqueta(
                demanda.prioridade,
                `prioridade ${classePrioridade(demanda.prioridade)}`
            )
        );

        linha.appendChild(prioridadeCelula);

        const statusCelula = document.createElement("td");

        statusCelula.appendChild(
            criarEtiqueta(
                demanda.status,
                `status ${classeStatus(demanda.status)}`
            )
        );

        linha.appendChild(statusCelula);

        linha.appendChild(criarCelula(demanda.projeto));
        linha.appendChild(criarCelula(demanda.responsavel));
        linha.appendChild(criarCelula(formatarData(demanda.dataCriacao)));
        linha.appendChild(criarCelula(formatarData(demanda.prazoFinalizacao)));

        // Cria o botão para acessar os detalhes da demanda.
        const acoes = document.createElement("td");
        const botaoVisualizar = document.createElement("a");

        botaoVisualizar.className = "btn-visualizar";
        botaoVisualizar.textContent = "Visualizar";
        botaoVisualizar.href = `detalhesDemanda.html?id=${encodeURIComponent(demanda.id)}`;

        acoes.appendChild(botaoVisualizar);
        linha.appendChild(acoes);

        tbody.appendChild(linha);
    });
}

// Consulta a API utilizando os filtros selecionados.
async function carregarDemandas() {
    mensagemErro.textContent = "";
    mensagemSemResultados.style.display = "none";

    const parametros = new URLSearchParams({
        busca: busca.value.trim(),
        status: status.value,
        prioridade: prioridade.value,
        tipo: tipo.value,
        ordenacao: ordenacao.value
    });

    try {
        const resposta = await fetch(
            `${API_URL}/demandas?${parametros.toString()}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.mensagem || "Erro ao carregar demandas.");
        }

        exibirDemandas(dados);

        const temFiltro =
            busca.value.trim() !== "" ||
            status.value !== "Todos" ||
            prioridade.value !== "Todas" ||
            tipo.value !== "Todos" ||
            ordenacao.value !== "nenhuma";

        botaoResetar.style.display = temFiltro ? "block" : "none";

    } catch (erro) {
        console.error("Erro na integração com a API:", erro);

        tbody.innerHTML = "";
        mensagemSemResultados.style.display = "none";
        mensagemErro.style.display = "block";
        mensagemErro.textContent = erro.message;
        botaoResetar.style.display = "block";
    }
}

// Aplica os filtros selecionados.
botaoFiltrar.addEventListener("click", function () {
    carregarDemandas();
});

// Limpa os filtros e carrega novamente todas as demandas.
botaoResetar.addEventListener("click", function () {
    busca.value = "";
    status.value = "Todos";
    prioridade.value = "Todas";
    tipo.value = "Todos";
    ordenacao.value = "nenhuma";

    carregarDemandas();
});

// Carrega as demandas assim que a página é aberta.
carregarDemandas();
