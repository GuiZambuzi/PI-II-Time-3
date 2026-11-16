/*

João Victor Grisolia Luis - RA: 26005781

Arquivo: sessao.js
Descrição: verifica a sessão ao abrir a página, com isso, consegue manter o usuario
autenticado caso ele mude de pagina

*/

let usuarioAtual = null;

async function carregarSessao() {
    let resposta;

    try {
        resposta = await fetch("http://localhost:3000/sessao", { credentials: "include" });
    } catch (erro) {
        // servidor fora do ar: não dá para confirmar a sessão
        console.error("Não foi possível verificar a sessão:", erro);
        return;
    }

    // se não tiver sessão (não logou, expirou ou fez logout): volta ao login
    if (resposta.status === 401) {
        window.location.replace("login.html");
        return;
    }

    // se tudo der certo, espera o json da resposta e cria uma mensagem de saudação
    // junto com o nome do usuario e o seu perfil
    usuarioAtual = await resposta.json();

    // os elementos só são preenchidos se existirem na página
    const saudacao = document.querySelector("#saudacaoUsuario");
    const perfil = document.querySelector("#perfilUsuario");
    if (saudacao) saudacao.textContent = `Olá, ${usuarioAtual.nome}!`;
    if (perfil) perfil.textContent = usuarioAtual.perfil;
}

// serve pra quando o usuario apertar no botão de sair, ele seja levado
// pra pagina de login 

async function sair() {
    await fetch("http://localhost:3000/logout", { method: "POST", credentials: "include" });
    window.location.replace("login.html");
}

carregarSessao();

// liga o botão Sair, se a página tiver o botão (evita erro em páginas sem ele)
document.querySelector("#botaoSair")?.addEventListener("click", sair);