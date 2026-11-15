/* 
 * Autor: Guilherme Henrique Lopes Zambuzi
 * Descrição: Validações de frontend e integração com a API Oracle para a tela de Cadastro/Edição de Demandas - PI2.
 */

const API_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async function() {
    const form = document.getElementById("demanda-form");
    const selectProjeto = document.getElementById("id_projeto");

    // 1. CARREGAR OS PROJETOS DO USUÁRIO LOGADO AO ABRIR A PÁGINA
    try {
        // credentials: "include" faz o navegador enviar o cookie da sessão (demandly.sid)
        const resposta = await fetch(`${API_URL}/projetos`, {
            credentials: "include"
        });

        if (resposta.status === 401) {
            selectProjeto.innerHTML = '<option value="" disabled selected>Faça login para ver seus projetos</option>';
            return;
        }

        if (!resposta.ok) {
            throw new Error("Erro ao carregar projetos do servidor.");
        }
        const projetos = await resposta.json();

        selectProjeto.innerHTML = '<option value="" disabled selected>Selecione um projeto...</option>';

        if (projetos.length === 0) {
            selectProjeto.innerHTML = '<option value="" disabled selected>Você não possui projetos vinculados</option>';
        }
        
        projetos.forEach(projeto => {
            const option = document.createElement("option");
            // Compatível com chaves maiúsculas ou minúsculas do Oracle
            option.value = projeto.ID || projeto.id;
            option.textContent = projeto.NOME || projeto.nome;
            selectProjeto.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao buscar projetos:", erro);
        selectProjeto.innerHTML = '<option value="" disabled selected>Erro ao carregar projetos</option>';
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

        // Validação do Responsável (Opcional, mas se selecionado precisa existir)
        const id_responsavel = document.getElementById("id_responsavel").value;

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
                    credentials: "include", // envia o cookie da sessão
                    body: JSON.stringify(dadosDemanda)
                });

                const resultado = await respostaApi.json();

                if (!respostaApi.ok) {
                    // Exibe o erro retornado pela API na tela, conforme exigido na Reunião 5
                    alert("Erro " + respostaApi.status + ": " + (resultado.mensagem || "Erro ao cadastrar."));
                    return;
                }

                alert(resultado.mensagem || "Demanda cadastrada com sucesso!");
                form.reset();
                
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