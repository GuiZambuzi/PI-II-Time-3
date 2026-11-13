/*

João Victor Grisolia Luis - RA: 26005781

Arquivo: sessao.js
Descrição: verifica a sessão ao abrir a página, com isso, consegue manter o usuario
autenticado caso ele mude de pagina

*/

let usuarioAtual = null;

async function carregarSessao() {
    const resposta = await fetch("http://localhost:3000/sessao", { credentials: "include" });

    // se não tiver sessão (não logou, expirou ou fez logout): volta ao login
    if (resposta.status === 401) {
        window.location.replace("login.html");
        return;
    }

    // se tudo der certo, espera o json da resposta e cria uma mensagem de saudação
    // junto com o nome do usuario e o seu perfil
    usuarioAtual = await resposta.json();
    document.querySelector("#saudacaoUsuario").textContent = `Olá, ${usuarioAtual.nome}!`;
    document.querySelector("#perfilUsuario").textContent = usuarioAtual.perfil;
}

// serve pra quando o usuario apertar no botão de sair, ele seja levado
// pra pagina de login 

async function sair() {
    await fetch("http://localhost:3000/logout", { method: "POST", credentials: "include" });
    window.location.replace("login.html");
}

carregarSessao();

document.querySelector("#botaoSair").addEventListener("click", sair);