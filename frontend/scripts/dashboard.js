/*
    Arquivo: dashboard.js
    Tela: Dashboard (Tela Inicial) do Sistema de Acompanhamento de Demandas
    Autor exclusivo: João Pedro Barbosa da Silva (Aluno 2) - RA 25016974

    Descricao:
    - Reuniao 5: busca os indicadores em GET /dashboard (dados do banco Oracle)
      e preenche os cartoes, as barras e as listas de demandas da tela. Erros
      da API (401, 500 ou falha de conexao) sao exibidos ao usuario na tela.
    - Reuniao 3: valida os campos do painel de filtros e, quando todos os
      dados sao validos, aplica o filtro nas listas de demandas (criticas em
      aberto e proximas do prazo). Enquanto houver dado invalido, o "Aplicar
      filtros" e bloqueado e mensagens de erro sao exibidas.
*/

// Endereco da API (mesmo padrao das demais telas)
const API_URL = "http://localhost:3000";

// ------------------------------------------------------------------
// Referencias aos elementos do formulario de filtros
// ------------------------------------------------------------------
const formulario = document.querySelector("#formFiltros");

const campoBusca = document.querySelector("#filtroBusca");
const campoStatus = document.querySelector("#filtroStatus");
const campoPrioridade = document.querySelector("#filtroPrioridade");
const campoTipo = document.querySelector("#filtroTipo");
const campoDataInicio = document.querySelector("#filtroDataInicio");
const campoDataFim = document.querySelector("#filtroDataFim");

const botaoLimpar = document.querySelector("#botaoLimpar");

// Elementos onde as mensagens de erro sao exibidas
const erroBusca = document.querySelector("#erroBusca");
const erroData = document.querySelector("#erroData");

// Areas de feedback do resultado do filtro
const filtrosAplicados = document.querySelector("#filtrosAplicados");
const semResultados = document.querySelector("#semResultados");

// Todas as demandas exibidas nas listas do dashboard.
// E uma funcao porque os itens so existem depois que a API responde.
function obterDemandas() {
    return document.querySelectorAll(".demand");
}

// ------------------------------------------------------------------
// Valores permitidos pelo escopo do sistema (item 3 da Reuniao 3).
// Servem para garantir que os selects so aceitem valores validos.
// ------------------------------------------------------------------
const STATUS_PERMITIDOS = ["Aberta", "Em andamento", "Em revisão", "Concluída", "Cancelada"];
const PRIORIDADES_PERMITIDAS = ["Crítica", "Alta", "Média", "Baixa"];
const TIPOS_PERMITIDOS = ["Tarefa", "Defeito", "Melhoria", "Documentação"];

// Regras de tamanho da busca textual
const BUSCA_MIN = 2;
const BUSCA_MAX = 60;

// ------------------------------------------------------------------
// Funcoes auxiliares de exibicao de erro (mesmo padrao do login.js)
// ------------------------------------------------------------------

// Marca um campo como invalido e escreve a mensagem no elemento de erro
function mostrarErro(campo, elementoErro, mensagem) {
    if (campo) {
        campo.classList.add("is-invalid");
    }
    if (elementoErro) {
        elementoErro.innerText = mensagem;
    }
}

// Remove todas as marcacoes e mensagens de erro do formulario
function limparErros() {
    [campoBusca, campoStatus, campoPrioridade, campoTipo, campoDataInicio, campoDataFim].forEach(
        function (campo) {
            campo.classList.remove("is-invalid");
        }
    );

    erroBusca.innerText = "";
    erroData.innerText = "";
}

// Converte uma data em texto (YYYY-MM-DD) para objeto Date; retorna null se invalida
function converterData(texto) {
    if (!texto) {
        return null;
    }

    const data = new Date(texto);
    // Data invalida (ex.: campo vazio ou valor impossivel) resulta em NaN
    return isNaN(data.getTime()) ? null : data;
}

// ------------------------------------------------------------------
// Validacao dos campos do filtro.
// Retorna true se estiver tudo valido; caso contrario mostra os erros
// e retorna false (impedindo a aplicacao do filtro).
// ------------------------------------------------------------------
function validarFiltros() {
    limparErros();

    let formValido = true;

    const busca = campoBusca.value.trim();
    const dataInicioTexto = campoDataInicio.value;
    const dataFimTexto = campoDataFim.value;

    // 1) Busca textual: quando preenchida, respeitar minimo e maximo de caracteres
    if (busca.length > 0 && busca.length < BUSCA_MIN) {
        mostrarErro(campoBusca, erroBusca, "Digite pelo menos " + BUSCA_MIN + " caracteres para buscar.");
        formValido = false;
    } else if (busca.length > BUSCA_MAX) {
        mostrarErro(campoBusca, erroBusca, "A busca deve ter no máximo " + BUSCA_MAX + " caracteres.");
        formValido = false;
    }

    // 2) Selects: aceitar apenas os valores previstos no escopo ("" = "Todos")
    if (campoStatus.value !== "" && !STATUS_PERMITIDOS.includes(campoStatus.value)) {
        mostrarErro(campoStatus, erroBusca, "Status inválido.");
        formValido = false;
    }
    if (campoPrioridade.value !== "" && !PRIORIDADES_PERMITIDAS.includes(campoPrioridade.value)) {
        mostrarErro(campoPrioridade, erroBusca, "Prioridade inválida.");
        formValido = false;
    }
    if (campoTipo.value !== "" && !TIPOS_PERMITIDOS.includes(campoTipo.value)) {
        mostrarErro(campoTipo, erroBusca, "Tipo inválido.");
        formValido = false;
    }

    // 3) Periodo por datas
    const dataInicio = converterData(dataInicioTexto);
    const dataFim = converterData(dataFimTexto);

    // 3a) Se uma data do periodo for preenchida, a outra passa a ser obrigatoria
    if (dataInicioTexto !== "" && dataFimTexto === "") {
        mostrarErro(campoDataFim, erroData, "Informe também a data final do prazo.");
        formValido = false;
    } else if (dataFimTexto !== "" && dataInicioTexto === "") {
        mostrarErro(campoDataInicio, erroData, "Informe também a data inicial do prazo.");
        formValido = false;
    } else if (dataInicio && dataFim && dataInicio > dataFim) {
        // 3b) Consistencia: inicio nao pode ser depois do fim
        mostrarErro(campoDataInicio, erroData, "A data inicial não pode ser posterior à data final.");
        mostrarErro(campoDataFim, erroData, "A data inicial não pode ser posterior à data final.");
        formValido = false;
    }

    // 4) Impedir aplicar o filtro sem nenhum criterio preenchido
    const nenhumFiltro =
        busca === "" &&
        campoStatus.value === "" &&
        campoPrioridade.value === "" &&
        campoTipo.value === "" &&
        dataInicioTexto === "" &&
        dataFimTexto === "";

    if (formValido && nenhumFiltro) {
        mostrarErro(campoBusca, erroBusca, "Preencha ao menos um filtro para aplicar.");
        formValido = false;
    }

    return formValido;
}

// ------------------------------------------------------------------
// Comportamento: aplica o filtro nas listas de demandas.
// Mostra/oculta cada demanda conforme os criterios informados.
// ------------------------------------------------------------------
function aplicarFiltros() {
    const busca = campoBusca.value.trim().toLowerCase();
    const status = campoStatus.value;
    const prioridade = campoPrioridade.value;
    const tipo = campoTipo.value;
    const dataInicio = converterData(campoDataInicio.value);
    const dataFim = converterData(campoDataFim.value);

    let quantidadeVisivel = 0;

    obterDemandas().forEach(function (demanda) {
        const titulo =(demanda.dataset.titulo || "").toLowerCase();
        const textoCompleto = demanda.innerText.toLowerCase();
        const prazo = converterData(demanda.dataset.prazo);

        // Cada criterio so restringe quando estiver preenchido
        const casaBusca = busca === "" || titulo.includes(busca) || textoCompleto.includes(busca);
        const casaStatus = status === "" || demanda.dataset.status === status;
        const casaPrioridade = prioridade === "" || demanda.dataset.prioridade === prioridade;
        const casaTipo = tipo === "" || demanda.dataset.tipo === tipo;
        const casaData =
            (!dataInicio || (prazo && prazo >= dataInicio)) &&
            (!dataFim || (prazo && prazo <= dataFim));

        const visivel = casaBusca && casaStatus && casaPrioridade && casaTipo && casaData;

        demanda.hidden = !visivel;
        if (visivel) {
            quantidadeVisivel++;
        }
    });

    exibirResumo(quantidadeVisivel);
}

// Monta o chip com o resumo dos filtros aplicados e a mensagem de "sem resultados"
function exibirResumo(quantidadeVisivel) {
    const partes = [];

    if (campoBusca.value.trim() !== "") {
        partes.push('Busca: "' + campoBusca.value.trim() + '"');
    }
    if (campoStatus.value !== "") {
        partes.push("Status: " + campoStatus.value);
    }
    if (campoPrioridade.value !== "") {
        partes.push("Prioridade: " + campoPrioridade.value);
    }
    if (campoTipo.value !== "") {
        partes.push("Tipo: " + campoTipo.value);
    }
    if (campoDataInicio.value !== "" && campoDataFim.value !== "") {
        partes.push("Prazo: " + campoDataInicio.value + " a " + campoDataFim.value);
    }

    filtrosAplicados.innerText = "Filtros aplicados — " + partes.join(" · ");
    filtrosAplicados.hidden = false;

    // Mensagem quando nenhuma demanda corresponde ao filtro
    semResultados.hidden = quantidadeVisivel > 0;
}

// Volta o dashboard ao estado inicial: todas as demandas visiveis, sem feedback
function reiniciarListas() {
    limparErros();
    obterDemandas().forEach(function (demanda) {
        demanda.hidden = false;
    });
    filtrosAplicados.hidden = true;
    filtrosAplicados.innerText = "";
    semResultados.hidden = true;
}

// ------------------------------------------------------------------
// Eventos do formulario
// ------------------------------------------------------------------

// Ao aplicar: validar primeiro; so filtrar se estiver tudo valido
formulario.addEventListener("submit", function (event) {
    event.preventDefault(); // impede o envio/recarregamento enquanto validamos

    if (validarFiltros()) {
        aplicarFiltros();
    }
});

// Ao limpar: o reset nativo esvazia os campos; devolvemos as listas ao estado inicial
botaoLimpar.addEventListener("click", function () {
    // setTimeout garante que o reset ja limpou os campos antes de reiniciar as listas
    setTimeout(reiniciarListas, 0);
});


// ------------------------------------------------------------------
// Integracao com a API (Reuniao 5): GET /dashboard
// Os dados vem do banco; nada e escrito com innerHTML a partir da API
// (so textContent), para nao inserir HTML vindo do servidor na pagina.
// ------------------------------------------------------------------

// Classes CSS ja existentes para cada prioridade
const CLASSE_PRIORIDADE = {
    "Crítica": "critica",
    "Alta": "alta",
    "Média": "media",
    "Baixa": "baixa"
};

// Icone exibido antes do nome de cada tipo
const ICONE_TIPO = {
    "Tarefa": "📝",
    "Defeito": "🐛",
    "Melhoria": "✨",
    "Documentação": "📄"
};

const mensagemErro = document.querySelector("#mensagemErro");

// Mostra uma mensagem de erro para o usuario (e nao apenas no console)
function exibirErroApi(mensagem) {
    mensagemErro.textContent = mensagem;
    mensagemErro.hidden = false;
}

// Cria um elemento simples com classe e texto
function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) {
        elemento.className = classe;
    }
    if (texto !== undefined) {
        elemento.textContent = texto;
    }
    return elemento;
}

// Converte "YYYY-MM-DD" em "DD/MM/YYYY"
function formatarData(dataISO) {
    const partes = String(dataISO || "").split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : "-";
}

// Data de hoje no formato "YYYY-MM-DD" (horario local)
function hojeISO() {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return agora.getFullYear() + "-" + mes + "-" + dia;
}

// Preenche os seis cartoes de totais
function preencherCartoes(dados) {
    document.querySelector("#cardTotal").textContent = dados.total;
    document.querySelector("#cardAberta").textContent = dados.porStatus["Aberta"];
    document.querySelector("#cardAndamento").textContent = dados.porStatus["Em andamento"];
    document.querySelector("#cardRevisao").textContent = dados.porStatus["Em revisão"];
    document.querySelector("#cardConcluida").textContent = dados.porStatus["Concluída"];
    document.querySelector("#cardCancelada").textContent = dados.porStatus["Cancelada"];
}

// Monta uma lista de barras (prioridade ou tipo) com largura proporcional ao total
function preencherBarras(lista, contagem, total, tipoDeLista) {
    lista.replaceChildren();

    Object.keys(contagem).forEach(function (categoria) {
        const quantidade = contagem[categoria];
        const percentual = total > 0 ? Math.round((quantidade / total) * 100) : 0;

        const item = criarElemento("li", "bar");

        const cabecalho = criarElemento("div", "bar__head");
        if (tipoDeLista === "prioridade") {
            const classe = CLASSE_PRIORIDADE[categoria] || "baixa";
            cabecalho.appendChild(criarElemento("span", "badge badge--" + classe, categoria));
        } else {
            cabecalho.appendChild(
                criarElemento("span", "bar__type", (ICONE_TIPO[categoria] || "") + " " + categoria)
            );
        }
        cabecalho.appendChild(criarElemento("span", "bar__count", quantidade));

        const trilho = criarElemento("div", "bar__track");
        const preenchimento = criarElemento(
            "div",
            "bar__fill " +
                (tipoDeLista === "prioridade"
                    ? "bar__fill--" + (CLASSE_PRIORIDADE[categoria] || "baixa")
                    : "bar__fill--tipo")
        );
        preenchimento.style.width = percentual + "%";
        trilho.appendChild(preenchimento);

        item.appendChild(cabecalho);
        item.appendChild(trilho);
        lista.appendChild(item);
    });
}

// Monta uma lista de demandas (criticas ou proximas do prazo).
// Os data-* sao usados pelo filtro da Reuniao 3 (aplicarFiltros).
function preencherDemandas(lista, mensagemVazia, demandasApi, mostrarPrazo) {
    lista.replaceChildren();
    mensagemVazia.hidden = demandasApi.length > 0;

    const hoje = hojeISO();

    demandasApi.forEach(function (demanda) {
        const item = criarElemento("li", "demand");
        item.dataset.titulo = demanda.titulo;
        item.dataset.status = demanda.status;
        item.dataset.prioridade = demanda.prioridade;
        item.dataset.tipo = demanda.tipo;
        item.dataset.prazo = demanda.prazoFinalizacao;

        const info = criarElemento("div", "demand__info");
        info.appendChild(criarElemento("span", "demand__title", demanda.titulo));
        info.appendChild(
            criarElemento("span", "demand__meta", "#" + demanda.id + " · " + demanda.projeto)
        );
        item.appendChild(info);

        if (mostrarPrazo) {
            // Prazo de hoje recebe o destaque de urgencia
            const venceHoje = demanda.prazoFinalizacao === hoje;
            item.appendChild(
                criarElemento(
                    "span",
                    venceHoje ? "deadline deadline--urgent" : "deadline",
                    venceHoje ? "Vence hoje" : formatarData(demanda.prazoFinalizacao)
                )
            );
        } else {
            const classe = CLASSE_PRIORIDADE[demanda.prioridade] || "baixa";
            item.appendChild(criarElemento("span", "badge badge--" + classe, demanda.prioridade));
        }

        lista.appendChild(item);
    });
}

// Busca os indicadores na API e atualiza toda a tela
async function carregarDashboard() {
    mensagemErro.hidden = true;

    try {
        const resposta = await fetch(API_URL + "/dashboard", {
            method: "GET",
            credentials: "include" // envia o cookie da sessao (login)
        });

        // Sem sessao valida (nao logou ou expirou): volta para o login
        if (resposta.status === 401) {
            window.location.replace("login.html");
            return;
        }

        const dados = await resposta.json();

        // Outros erros (ex.: 500): mostra a mensagem enviada pela API
        if (!resposta.ok) {
            throw new Error(dados.mensagem || "Erro ao carregar o dashboard.");
        }

        preencherCartoes(dados);
        preencherBarras(document.querySelector("#listaPrioridade"), dados.porPrioridade, dados.total, "prioridade");
        preencherBarras(document.querySelector("#listaTipo"), dados.porTipo, dados.total, "tipo");
        preencherDemandas(
            document.querySelector("#listaCriticas"),
            document.querySelector("#vazioCriticas"),
            dados.criticasEmAberto,
            false
        );
        preencherDemandas(
            document.querySelector("#listaProximas"),
            document.querySelector("#vazioProximas"),
            dados.proximasDoPrazo,
            true
        );
    } catch (erro) {
        console.error("Erro na integração com a API:", erro);

        // "Failed to fetch" = servidor fora do ar / sem conexao
        const semConexao = erro instanceof TypeError;
        exibirErroApi(
            semConexao
                ? "Não foi possível conectar ao servidor. Verifique se o backend está em execução."
                : erro.message
        );
    }
}

carregarDashboard();
