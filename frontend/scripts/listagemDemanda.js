/* 
 * Feito por Rafael França Cardoso
 *
 * Este arquivo JavaScript é responsável pelas funcionalidades da página de Listagem de Demandas.
 *
 * Busca:
 * Permite pesquisar demandas pelo título, projeto, responsável e datas.
 *
 * Filtros:
 * Permite filtrar as demandas por status, prioridade e tipo.
 *
 * Ordenação:
 * Permite ordenar as demandas por prioridade, data de criação,
 * prazo de finalização ou status.
 *
 * Reset:
 * Permite limpar os filtros e retornar a lista para o estado inicial.
 *
 * Mensagem:
 * Exibe uma mensagem quando nenhuma demanda corresponde aos filtros.
 */

const busca = document.querySelector("#busca");
const status = document.querySelector("#status");
const prioridade = document.querySelector("#prioridade");
const tipo = document.querySelector("#tipo");
const botaoFiltrar = document.querySelector("#btn-filtrar");
const botaoResetar = document.querySelector("#btn-resetar");
const mensagemSemResultados = document.querySelector("#sem-resultados");
const ordenacao = document.querySelector("#ordenacao");

const linhas = document.querySelectorAll("tbody tr");
const linhasOriginais = Array.from(linhas);

function filtrarDemandas() {
    const texto = busca.value.toLowerCase();
    const statusSelecionado = status.value.toLowerCase();
    const prioridadeSelecionada = prioridade.value.toLowerCase();
    const tipoSelecionado = tipo.value.toLowerCase();

    let encontrouAlguma = false;

    linhas.forEach(function (linha) {
        const titulo = linha.children[0].textContent.toLowerCase();
        const projeto = linha.children[4].textContent.toLowerCase();
        const responsavel = linha.children[5].textContent.toLowerCase();
        const criacao = linha.children[6].textContent.toLowerCase();
        const prazo = linha.children[7].textContent.toLowerCase();

        const encontrouTexto =
            titulo.includes(texto) ||
            projeto.includes(texto) ||
            responsavel.includes(texto) ||
            criacao.includes(texto) ||
            prazo.includes(texto);

        const conteudo = linha.textContent.toLowerCase();

        const encontrouStatus =
            statusSelecionado === "todos" ||
            conteudo.includes(statusSelecionado);

        const encontrouPrioridade =
            prioridadeSelecionada === "todas" ||
            conteudo.includes(prioridadeSelecionada);

        const encontrouTipo =
            tipoSelecionado === "todos" ||
            conteudo.includes(tipoSelecionado);

        if (
            encontrouTexto &&
            encontrouStatus &&
            encontrouPrioridade &&
            encontrouTipo
        ) {
            linha.style.display = "";
            encontrouAlguma = true;
        } else {
            linha.style.display = "none";
        }
    });

    if (encontrouAlguma) {
        mensagemSemResultados.style.display = "none";
    } else {
        mensagemSemResultados.style.display = "block";
    }

    botaoResetar.style.display = "block";
}

function ordenarDemandas() {
    const tbody = document.querySelector("tbody");
    const linhasArray = Array.from(linhas);

    if (ordenacao.value === "prioridade") {
        const ordem = {
            "crítica": 1,
            "alta": 2,
            "média": 3,
            "baixa": 4
        };

        linhasArray.sort(function (a, b) {
            const prioridadeA = a.children[2].textContent.trim().toLowerCase();
            const prioridadeB = b.children[2].textContent.trim().toLowerCase();

            return ordem[prioridadeA] - ordem[prioridadeB];
        });
    }

    if (ordenacao.value === "criacao") {
        linhasArray.sort(function (a, b) {
            const dataA = a.children[6].textContent.split("/").reverse().join("");
            const dataB = b.children[6].textContent.split("/").reverse().join("");

            return dataA.localeCompare(dataB);
        });
    }

    if (ordenacao.value === "prazo") {
        linhasArray.sort(function (a, b) {
            const dataA = a.children[7].textContent.split("/").reverse().join("");
            const dataB = b.children[7].textContent.split("/").reverse().join("");

            return dataA.localeCompare(dataB);
        });
    }

    if (ordenacao.value === "status") {
        linhasArray.sort(function (a, b) {
            const statusA = a.children[3].textContent.trim();
            const statusB = b.children[3].textContent.trim();

            return statusA.localeCompare(statusB);
        });
    }

    linhasArray.forEach(function (linha) {
        tbody.appendChild(linha);
    });
}

botaoFiltrar.addEventListener("click", function () {
    filtrarDemandas();
    ordenarDemandas();

    const temFiltro =
        busca.value !== "" ||
        status.value !== "Todos" ||
        prioridade.value !== "Todas" ||
        tipo.value !== "Todos" ||
        ordenacao.value !== "nenhuma";

    if (temFiltro) {
        botaoResetar.style.display = "block";
    } else {
        botaoResetar.style.display = "none";
    }
});

botaoResetar.addEventListener("click", function () {
    busca.value = "";
    status.value = "Todos";
    prioridade.value = "Todas";
    tipo.value = "Todos";
    ordenacao.value = "nenhuma";

    const tbody = document.querySelector("tbody");

    linhasOriginais.forEach(function (linha) {
        linha.style.display = "";
        tbody.appendChild(linha);
    });

    mensagemSemResultados.style.display = "none";
    botaoResetar.style.display = "none";
});