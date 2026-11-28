/* 
 * Autor: Guilherme Henrique Lopes Zambuzi
 * Descrição: Validações de frontend, listagem dinâmica de projetos/responsáveis e regras de perfil para a tela de Cadastro de Demandas - PI2.
 */

const API_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async function() {
    const form = document.getElementById("demanda-form");
    const selectProjeto = document.getElementById("id_projeto");
    const selectResponsavel = document.getElementById("id_responsavel");
    const btnCancelar = document.querySelector(".btn-secondary");

    // Lógica do botão Cancelar
    if (btnCancelar) {
        btnCancelar.addEventListener("click", function() {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = "listagemDemanda.html";
            }
        });
    }

    let usuarioLogado = null;

    // 0. VERIFICAR SESSÃO E PERFIL DO USUÁRIO LOGADO
    try {
        const respSessao = await fetch(`${API_URL}/sessao`, {
            credentials: "include"
        });
        if (respSessao.ok) {
            usuarioLogado = await respSessao.json();
        }
    } catch (e) {
        console.log("Usuário não autenticado ou sessão expirada.");
    }

    // 1. CARREGAR OS PROJETOS DO SERVIDOR AO ABRIR A PÁGINA
    try {
        const resposta = await fetch(`${API_URL}/projetos`, {
            credentials: "include"
        });

        if (resposta.status === 401) {
            selectProjeto.innerHTML = '<option value="" disabled selected>Faça login para ver os projetos</option>';
            return;
        }

        if (!resposta.ok) {
            throw new Error("Erro ao carregar projetos do servidor.");
        }
        const projetos = await resposta.json();

        selectProjeto.innerHTML = '<option value="" disabled selected>Selecione um projeto...</option>';

        if (projetos.length === 0) {
            selectProjeto.innerHTML = '<option value="" disabled selected>Nenhum projeto encontrado</option>';
        }
        
        projetos.forEach(projeto => {
            const option = document.createElement("option");
            option.value = projeto.ID || projeto.id;
            option.textContent = projeto.NOME || projeto.nome;
            selectProjeto.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao buscar projetos:", erro);
        selectProjeto.innerHTML = '<option value="" disabled selected>Erro ao carregar projetos</option>';
    }


    // 1.1. CARREGAR RESPONSÁVEIS DO PROJETO SELECIONADO
    async function carregarResponsaveis(idProjeto, responsavelSelecionado = "") {
        selectResponsavel.innerHTML =
            '<option value="">Sem responsável (Opcional)</option>';

        selectResponsavel.disabled = true;

        if (!idProjeto) return;

        try {
            const resposta = await fetch(
                `${API_URL}/usuarios?id_projeto=${encodeURIComponent(idProjeto)}`,
                {
                    credentials: "include"
                }
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(resultado.mensagem || "Erro ao carregar responsáveis.");
            }

            selectResponsavel.innerHTML =
                '<option value="">Sem responsável (Opcional)</option>';

            resultado.forEach(user => {
                const option = document.createElement("option");
                const userId = user.ID || user.id;
                const userName = user.NOME || user.nome;
                const userPerfil = user.PERFIL || user.perfil;

                option.value = userId;
                option.textContent = `${userName} (${userPerfil})`;

                selectResponsavel.appendChild(option);
            });

            // Membro da equipe só pode selecionar a si mesmo.
            if (usuarioLogado?.perfil === "Membro da Equipe") {
                selectResponsavel.value = String(usuarioLogado.id);
                selectResponsavel.disabled = true;
            } else {
                selectResponsavel.value = String(responsavelSelecionado || "");
                selectResponsavel.disabled = false;
            }

        } catch (erro) {
            console.error("Erro ao buscar responsáveis:", erro);

            selectResponsavel.innerHTML =
                '<option value="">Erro ao carregar responsáveis</option>';
        }
    }

    // Atualiza os responsáveis sempre que o projeto for alterado.
    selectProjeto.addEventListener("change", function() {
        carregarResponsaveis(selectProjeto.value);
    });


    // 1.2. MODO EDIÇÃO: se a URL tiver ?id=..., carrega a demanda e preenche o formulário.
    // (a tela de detalhes abre esta página com o botão "Editar": cadastroDemanda.html?id=123)
    const idEdicao = new URLSearchParams(window.location.search).get("id");
    const modoEdicao = idEdicao !== null && idEdicao !== "";
    let prazoOriginal = null; // AAAA-MM-DD da demanda antes da edição

    if (modoEdicao) {
        try {
            const respDemanda = await fetch(`${API_URL}/demandas/${encodeURIComponent(idEdicao)}`, {
                credentials: "include"
            });

            if (!respDemanda.ok) {
                const erroDemanda = await respDemanda.json().catch(() => ({}));
                alert("Erro " + respDemanda.status + ": " + (erroDemanda.mensagem || "Não foi possível carregar a demanda."));
                window.location.href = "listagemDemanda.html";
                return;
            }

            const demanda = await respDemanda.json();

            document.getElementById("titulo").value = demanda.titulo || "";
            document.getElementById("tipo").value = demanda.tipo || "";
            document.getElementById("prioridade").value = demanda.prioridade || "";
            document.getElementById("descricao").value = demanda.descricao || "";
            document.getElementById("status").value = demanda.status || "";
            selectResponsavel.value = demanda.responsavelId ? String(demanda.responsavelId) : "";

            // O projeto não muda na edição.
            selectProjeto.value = String(demanda.projetoId);
            selectProjeto.disabled = true;

            // Carrega somente os responsáveis vinculados ao projeto da demanda.
            await carregarResponsaveis(
                demanda.projetoId,
                demanda.responsavelId
            );

            // A API devolve o prazo como DD/MM/AAAA; o input type="date" quer AAAA-MM-DD
            if (demanda.prazoFinalizacao) {
                prazoOriginal = demanda.prazoFinalizacao.split("/").reverse().join("-");
                document.getElementById("prazo_finalizacao").value = prazoOriginal;
            }

            document.getElementById("titulo-formulario").textContent = "Editar Demanda";
            document.getElementById("subtitulo-formulario").textContent =
                "Altere os campos desejados e salve. As mudanças ficam registradas no histórico da demanda.";
            document.getElementById("btn-submit").textContent = "Salvar Alterações";
        } catch (erro) {
            console.error("Erro ao carregar a demanda para edição:", erro);
            alert("Não foi possível carregar a demanda para edição.");
            return;
        }
    }

    // 2. VALIDAÇÃO E ENVIO DO FORMULÁRIO
    form.addEventListener("submit", async function(event) {
        event.preventDefault();
        limparErros();

        let formularioValido = true;

        // Validação do Título
        const titulo = document.getElementById("titulo").value.trim();
        if (titulo === "") {
            mostrarErro("erro-titulo", "O título da demanda é obrigatório.");
            formularioValido = false;
        } else if (titulo.length < 5) {
            mostrarErro("erro-titulo", "O título deve ter pelo menos 5 caracteres.");
            formularioValido = false;
        }

        // Validação do Tipo da Demanda
        const tipo = document.getElementById("tipo").value;
        if (tipo === "") {
            mostrarErro("erro-tipo", "Selecione o tipo da demanda.");
            formularioValido = false;
        }

        // Validação da Prioridade
        const prioridade = document.getElementById("prioridade").value;
        if (prioridade === "") {
            mostrarErro("erro-prioridade", "Selecione a prioridade.");
            formularioValido = false;
        }

        // Validação do Projeto Vinculado
        const id_projeto = selectProjeto.value;
        if (id_projeto === "") {
            mostrarErro("erro-projeto", "Selecione o projeto vinculado.");
            formularioValido = false;
        }

        // Responsável (se estiver travado para membro da equipe, garante o ID dele)
        const id_responsavel =
            usuarioLogado?.perfil === "Membro da Equipe"
                ? usuarioLogado.id
                : selectResponsavel.value;

        // Validação do Prazo de Finalização
        const prazo_finalizacao = document.getElementById("prazo_finalizacao").value;
        if (prazo_finalizacao === "") {
            mostrarErro("erro-prazo", "O prazo de finalização é obrigatório.");
            formularioValido = false;
        } else if (!modoEdicao || prazo_finalizacao !== prazoOriginal) {
            // Na edição, só exige data futura se o prazo foi alterado
            // (uma demanda antiga pode ter o prazo já vencido e continuar editável)
            const dataPrazo = new Date(prazo_finalizacao);
            dataPrazo.setUTCHours(23, 59, 59, 999);

            const dataAtual = new Date();
            dataAtual.setHours(0, 0, 0, 0);

            if (dataPrazo < dataAtual) {
                mostrarErro("erro-prazo", "O prazo não pode ser uma data no passado.");
                formularioValido = false;
            }
        }

        // Validação da Descrição
        const descricao = document.getElementById("descricao").value.trim();
        if (descricao === "") {
            mostrarErro("erro-descricao", "A descrição é obrigatória.");
            formularioValido = false;
        } else if (descricao.length < 20) {
            mostrarErro("erro-descricao", "A descrição deve ter pelo menos 20 caracteres.");
            formularioValido = false;
        }

        // Se o formulário estiver válido, envia via FETCH para a API
        if (formularioValido) {
            const dadosDemanda = {
                titulo,
                tipo,
                prioridade,
                id_projeto,
                id_responsavel: id_responsavel || null,
                prazo_finalizacao,
                descricao
            };

            try {
                // Edição: PATCH /demandas/:id | Cadastro: POST /demandas
                const url = modoEdicao
                    ? `${API_URL}/demandas/${encodeURIComponent(idEdicao)}`
                    : `${API_URL}/demandas`;

                const respostaApi = await fetch(url, {
                    method: modoEdicao ? "PATCH" : "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(dadosDemanda)
                });

                const resultado = await respostaApi.json();

                if (!respostaApi.ok) {
                    alert("Erro " + respostaApi.status + ": " + (resultado.mensagem || "Erro ao salvar."));
                    return;
                }

                // Edição concluída: volta para a tela de detalhes da demanda
                if (modoEdicao) {
                    alert(resultado.mensagem || "Demanda atualizada com sucesso!");
                    window.location.href = `detalhesDemanda.html?id=${encodeURIComponent(idEdicao)}`;
                    return;
                }

                alert(resultado.mensagem || "Demanda cadastrada com sucesso!");
                form.reset();

                await carregarResponsaveis("");
                
                // Reaplica a trava de membro da equipe caso limpe o form
                if (usuarioLogado && usuarioLogado.perfil === "Membro da Equipe") {
                    selectResponsavel.value = usuarioLogado.id;
                }

            } catch (erro) {
                console.error("Erro de conexão:", erro);
                alert("Não foi possível conectar ao servidor backend.");
            }
        }
    });
});

// Funções Auxiliares
function mostrarErro(idElemento, mensagem) {
    const spanErro = document.getElementById(idElemento);
    if (spanErro) {
        spanErro.innerText = mensagem;
        spanErro.style.display = "block";
    }
}

function limparErros() {
    const spansDeErro = document.querySelectorAll(".error-msg");
    for (let i = 0; i < spansDeErro.length; i++) {
        spansDeErro[i].innerText = "";
        spansDeErro[i].style.display = "none";
    }
}