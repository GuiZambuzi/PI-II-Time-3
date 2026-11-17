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

    // 1.1. CARREGAR OS USUÁRIOS/RESPONSÁVEIS DO SERVIDOR
    try {
        const respUsuarios = await fetch(`${API_URL}/usuarios`, {
            credentials: "include"
        });

        if (respUsuarios.ok) {
            const usuarios = await respUsuarios.json();
            selectResponsavel.innerHTML = '<option value="" selected>Sem responsável (Opcional)</option>';

            usuarios.forEach(user => {
                const option = document.createElement("option");
                const userId = user.ID || user.id;
                const userName = user.NOME || user.nome;
                const userPerfil = user.PERFIL || user.perfil;

                option.value = userId;
                option.textContent = `${userName} (${userPerfil})`;
                selectResponsavel.appendChild(option);
            });

            // Regra de Permissão (Escopo): Se for Membro da Equipe, ele só pode abrir para si mesmo
            if (usuarioLogado && usuarioLogado.perfil === "Membro da Equipe") {
                selectResponsavel.value = usuarioLogado.id;
                selectResponsavel.disabled = true; // Trava o campo para evitar burlar a regra visualmente
            }
        }
    } catch (erro) {
        console.error("Erro ao buscar usuários responsáveis:", erro);
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
        const id_responsavel = selectResponsavel.disabled ? usuarioLogado?.id : selectResponsavel.value;

        // Validação do Prazo de Finalização
        const prazo_finalizacao = document.getElementById("prazo_finalizacao").value;
        if (prazo_finalizacao === "") {
            mostrarErro("erro-prazo", "O prazo de finalização é obrigatório.");
            formularioValido = false;
        } else {
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
                const respostaApi = await fetch(`${API_URL}/demandas`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(dadosDemanda)
                });

                const resultado = await respostaApi.json();

                if (!respostaApi.ok) {
                    alert("Erro " + respostaApi.status + ": " + (resultado.mensagem || "Erro ao cadastrar."));
                    return;
                }

                alert(resultado.mensagem || "Demanda cadastrada com sucesso!");
                form.reset();
                
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

