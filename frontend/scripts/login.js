const formulario = document.querySelector("#formLogin");

const campoEmail = document.querySelector("#email");
const campoSenha = document.querySelector("#password");
const botaoSenha = document.querySelector("#togglePassword");

const erroEmail = document.querySelector("#erroEmail");
const erroSenha = document.querySelector("#erroPassword");

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

formulario.addEventListener("submit", function(event) {
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

    // Senha
    const possuiMaiuscula = /[A-Z]/.test(senha);
    const possuiMinuscula = /[a-z]/.test(senha);
    const possuiNumero = /[0-9]/.test(senha);
    const possuiEspecial = /[!@_]/.test(senha);

    if (senha.length < 8 || !possuiMaiuscula || !possuiMinuscula || !possuiNumero) {
        
        mostrarErro(campoSenha, erroSenha, "Digite uma senha válida.");
        formValido = false;
    }

    if (formValido) {
        window.location.href = "dashboard.html";
    }
    
});