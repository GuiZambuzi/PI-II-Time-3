/*

João Victor Grisolia Luis - RA: 26005781

Arquivo: login.js
Descrição: Este arquivo contém a lógica de validação do formulário de login,
a exibição de mensagens de erro, a alternância da visibilidade da senha e a
integração com a API (POST /login). Após o login, os dados do usuário (incluindo
o perfil) ficam guardados no sessionStorage para manter o usuário autenticado
ao navegar pelo sistema.
*/

// endereço da API (ajuste a porta e o caminho conforme o servidor da equipe).
const API_URL = "http://localhost:3000";

// chave onde os dados do usuário logado ficam guardados no navegador
const chave_usuario = "usuarioLogado";

const formulario = document.querySelector("#formLogin");

const campoEmail = document.querySelector("#email");
const campoSenha = document.querySelector("#password");
const botaoSenha = document.querySelector("#togglePassword");
const botaoEntrar = document.querySelector("#botaoEntrar");

const erroEmail = document.querySelector("#erroEmail");
const erroSenha = document.querySelector("#erroPassword");

// erros retornados pela API -> a div é criada no final do formulario com o appendChild
const erroGeral = document.createElement("div");
    erroGeral.id = "erroGeral";
    erroGeral.setAttribute("role", "alert");
    erroGeral.style.color = "#dc3545";
    erroGeral.style.marginTop = "12px";
    formulario.appendChild(erroGeral);

const camposComErro = [
    campoEmail,
    campoSenha
];

const mensagensDeErro = [
    erroEmail,
    erroSenha
];

botaoSenha.addEventListener("click", function () {
    const senhaVisivel = campoSenha.type === "text";

    campoSenha.type = senhaVisivel ? "password" : "text";
    botaoSenha.innerText = senhaVisivel ? "Mostrar" : "Ocultar";
    botaoSenha.setAttribute("aria-label", senhaVisivel ? "Mostrar senha" : "Ocultar senha");
});

function mostrarErro(campo, elementoErro, mensagem) {
    campo.classList.add("is-invalid");
    elementoErro.innerText = mensagem;
}

function limparErros() {
    camposComErro.forEach(function (campo) {
        campo.classList.remove("is-invalid");
    });

    mensagensDeErro.forEach(function (elementoErro) {
        elementoErro.innerText = "";
    });
}

/**
 * envia o email e a senha para POST /login e 
 * retorna { status, dados } com o código HTTP e o corpo da resposta.
 */
async function enviarLogin(email, senha) {
    const resposta = await fetch(API_URL + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, senha: senha }),
        // permite que o navegador receba e envie o cookie da sessão (demandly.sid),
        // já que o front (porta 5173) e a API (porta 3000) estão em origens diferentes
        credentials: "include"
    });

    // se o corpo não for um JSON válido, retorna com o objeto vazio.
    const dados = await resposta.json().catch(function () {
        return {};
    });

    return { status: resposta.status, dados: dados };
}

formulario.addEventListener("submit", async function(event) {
    event.preventDefault();
    limparErros();

    // Email
    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    let formValido = true;

    if (email === "") {
        mostrarErro(campoEmail, erroEmail, "O email é obrigatório.");
        formValido = false;

    } else if (campoEmail.validity.typeMismatch) {
        mostrarErro(campoEmail, erroEmail, "Informe um endereço de email válido.");
        formValido = false;
    }

    // senha: mínimo de 8 caracteres, com pelo menos uma letra maiúscula,
    // uma letra minúscula e um número
    const possuiMaiuscula = /[A-Z]/.test(senha);
    const possuiMinuscula = /[a-z]/.test(senha);
    const possuiNumero = /[0-9]/.test(senha);

    if (senha.length < 8 || !possuiMaiuscula || !possuiMinuscula || !possuiNumero) {
        mostrarErro(campoSenha, erroSenha, "Digite uma senha válida.");
        formValido = false;
    }

    // as validações do javascript não substituem as do servidor, 
    // ai só chama a API se passarem.
    if (!formValido) {
        return;
    }

    botaoEntrar.disabled = true;

     try {
        const resultado = await enviarLogin(email, senha);

        if (resultado.status === 200) {
            // guarda as credenciais do usuário (id, nome, email e perfil) para as outras telas
            sessionStorage.setItem(chave_usuario, JSON.stringify(resultado.dados.usuario));
            window.location.href = "dashboard.html";
            return;
        }

        // erros da API (400, 401, 500 etc) exibidos na tela do usuario
        erroGeral.innerText = resultado.dados.mensagem || "Não foi possível realizar o login.";

        if (resultado.status === 401) {
            campoEmail.classList.add("is-invalid");
            campoSenha.classList.add("is-invalid");
        }

    } catch (erro) {
        // API fora do ar, porta errada, CORS etc
        console.error("Erro ao chamar POST /login:", erro);
        erroGeral.innerText = "Não foi possível conectar ao servidor. Tente novamente.";

    } finally {
        botaoEntrar.disabled = false;
    }
    
});