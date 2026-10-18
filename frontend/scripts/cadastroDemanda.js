/* 
 * Autor: Guilherme Henrique Lopes Zambuzi
 * Arquivo: cadastroDemanda.js
 * Descrição: Validações de frontend para a tela de Cadastro/Edição de Demandas - PI2.
 */

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("demanda-form");

    form.addEventListener("submit", function(event) {
        // Impede o envio do formulário antes das validações
        event.preventDefault();

        // Limpa todas as mensagens de erro antes de validar novamente
        limparErros();

        let formularioValido = true;

        // Validação do Título (Obrigatório e mínimo de 5 caracteres)
        const titulo = document.getElementById("titulo").value.trim();
        if (titulo === "") {
            mostrarErro("erro-titulo", "O título da demanda é obrigatório.");
            formularioValido = false;
        } else if (titulo.length < 5) {
            mostrarErro("erro-titulo", "O título deve ter pelo menos 5 caracteres.");
            formularioValido = false;
        }

        // Validação da Categoria / Tipo (Obrigatório e escopo)
        const categoria = document.getElementById("categoria").value;
        const categoriasPermitidas = ["tarefa", "defeito", "melhoria", "documentacao"];
        if (categoria === "") {
            mostrarErro("erro-categoria", "Selecione o tipo da demanda.");
            formularioValido = false;
        } else if (!categoriasPermitidas.includes(categoria)) {
            mostrarErro("erro-categoria", "Tipo de demanda inválido.");
            formularioValido = false;
        }

        // Validação da Prioridade (Obrigatório e escopo)
        const prioridade = document.getElementById("prioridade").value;
        const prioridadesPermitidas = ["critica", "alta", "media", "baixa"];
        if (prioridade === "") {
            mostrarErro("erro-prioridade", "Selecione a prioridade.");
            formularioValido = false;
        } else if (!prioridadesPermitidas.includes(prioridade)) {
            mostrarErro("erro-prioridade", "Prioridade inválida.");
            formularioValido = false;
        }

        // Validação do Projeto Vinculado (Obrigatório)
        const projeto = document.getElementById("projeto").value;
        if (projeto === "") {
            mostrarErro("erro-projeto", "Selecione o projeto vinculado.");
            formularioValido = false;
        }

        // Validação do Responsável (Obrigatório)
        const responsavel = document.getElementById("responsavel").value;
        if (responsavel === "") {
            mostrarErro("erro-responsavel", "Selecione o responsável pela demanda.");
            formularioValido = false;
        }

        // Validação do Prazo (Não pode ser data no passado)
        const prazoStr = document.getElementById("prazo").value;
        if (prazoStr !== "") {
            const dataPrazo = new Date(prazoStr);
            dataPrazo.setUTCHours(23, 59, 59, 999); 
            
            const dataAtual = new Date();
            dataAtual.setHours(0, 0, 0, 0); 

            if (dataPrazo < dataAtual) {
                mostrarErro("erro-prazo", "O prazo não pode ser uma data no passado.");
                formularioValido = false;
            }
        }

        // Validação do Status
        const status = document.getElementById("status").value;
        const statusPermitidos = ["pendente", "em-andamento", "em-revisao", "concluida", "cancelada"];
        if (status === "") {
            mostrarErro("erro-status", "O status é obrigatório.");
            formularioValido = false;
        } else if (!statusPermitidos.includes(status)) {
            mostrarErro("erro-status", "Status inválido selecionado.");
            formularioValido = false;
        }

        // Validação da Descrição (Obrigatório e mínimo de 20 caracteres)
        const descricao = document.getElementById("descricao").value.trim();
        if (descricao === "") {
            mostrarErro("erro-descricao", "A descrição é obrigatória.");
            formularioValido = false;
        } else if (descricao.length < 20) {
            mostrarErro("erro-descricao", "A descrição deve ter pelo menos 20 caracteres para ficar clara.");
            formularioValido = false;
        }

        // Conclusão da Validação
        if (formularioValido) {
            alert("Demanda salva com sucesso!");
            // form.submit(); // Descomentar quando integrar com o backend em Node.js
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