/**
 * Diego Prandi Silva - RA: 25002584
 *
 * Arquivo: detalhesDemandas.js
 * Descrição: Responsável por buscar e exibir os detalhes de uma demanda,
 * carregar os comentários cadastrados e permitir o envio de novos comentários
 */

const API_URL = 'http://localhost:3000';

// Pega o ID da demanda que veio pela URL
const parametros = new URLSearchParams(window.location.search);
const idDemanda = parametros.get('id');

// Elementos da página
const titulo = document.getElementById('tituloDemanda');
const descricao = document.getElementById('descricaoDemanda');
const tipo = document.getElementById('tipoDemanda');
const prioridade = document.getElementById('prioridadeDemanda');
const status = document.getElementById('statusDemanda');
const projeto = document.getElementById('projetoDemanda');
const responsavel = document.getElementById('responsavelDemanda');
const dataCriacao = document.getElementById('dataCriacao');
const ultimaAtualizacao = document.getElementById('ultimaAtualizacao');
const prazoFinalizacao = document.getElementById('prazoFinalizacao');

const listaComentarios = document.getElementById('listaComentarios');
const textoComentario = document.getElementById('textoComentario');
const btnAdicionarComentario = document.getElementById('btnAdicionarComentario');

const listaHistorico = document.getElementById('listaHistorico');

const mensagemErro = document.getElementById('mensagemErro');
const mensagemComentario = document.getElementById('mensagemComentario');

// Procura um campo considerando os nomes possíveis retornados pela API
function pegarCampo(objeto, nomes) {
    for (const nome of nomes) {
        if (objeto[nome] !== undefined && objeto[nome] !== null) {
            return objeto[nome];
        }

        if (objeto[nome.toUpperCase()] !== undefined && objeto[nome.toUpperCase()] !== null) {
            return objeto[nome.toUpperCase()];
        }
    }

    return '-';
}

// Mostra mensagens de erro
function mostrarErro(mensagem) {
    mensagemErro.textContent = mensagem;
}

// Busca os dados da demanda
async function carregarDemanda() {
    if (!idDemanda || isNaN(Number(idDemanda)) || Number(idDemanda) <= 0) {
        mostrarErro('ID da demanda inválido. Volte para a listagem e selecione uma demanda.');
        titulo.textContent = 'Demanda não encontrada';
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/demandas/${idDemanda}`, {
            method: 'GET',
            credentials: 'include',
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            mostrarErro(dados.mensagem || 'Não foi possível carregar a demanda.');
            return;
        }

        // Preenche a tela com os dados vindos da API
        titulo.textContent = pegarCampo(dados, ['titulo']);
        descricao.textContent = pegarCampo(dados, ['descricao']);
        tipo.textContent = pegarCampo(dados, ['tipo']);

        prioridade.textContent = pegarCampo(dados, ['prioridade']);
        status.textContent = pegarCampo(dados, ['status']);

        projeto.textContent = pegarCampo(dados, ['projetoNome', 'nomeProjeto', 'projeto']);

        responsavel.textContent = pegarCampo(dados, [
            'responsavelNome',
            'nomeResponsavel',
            'responsavel',
        ]);

        dataCriacao.textContent = pegarCampo(dados, ['dataCriacao']);
        ultimaAtualizacao.textContent = pegarCampo(dados, [
            'dataUltimaAtualizacao',
            'ultimaAtualizacao',
        ]);
        prazoFinalizacao.textContent = pegarCampo(dados, ['prazoFinalizacao']);

        // Mantém os links com o ID da demanda
        document.getElementById('btnEditar').href = `cadastroDemanda.html?id=${idDemanda}`;

        document.getElementById('btnAlterarStatus').href = `cadastroDemanda.html?id=${idDemanda}`;

        document.getElementById('btnCancelar').href = `cadastroDemanda.html?id=${idDemanda}`;

        // Atualiza as classes visuais
        prioridade.className = 'prioridade ' + String(prioridade.textContent).toLowerCase();
        status.className =
            'prioridade ' + String(status.textContent).toLowerCase().replaceAll(' ', '');
    } catch (erro) {
        console.error('Erro ao carregar demanda:', erro);
        mostrarErro('Erro ao conectar com o servidor. Verifique se a API está funcionando.');
    }
}

// Busca os comentários da demanda
async function carregarComentarios() {
    try {
        const resposta = await fetch(`${API_URL}/demandas/${idDemanda}/comentarios`, {
            method: 'GET',
            credentials: 'include',
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            listaComentarios.textContent =
                dados.mensagem || 'Não foi possível carregar os comentários.';
            return;
        }

        listaComentarios.innerHTML = '';

        const comentarios = Array.isArray(dados) ? dados : dados.comentarios;

        if (!comentarios || comentarios.length === 0) {
            listaComentarios.textContent = 'Nenhum comentário registrado.';
            return;
        }

        comentarios.forEach((comentario) => {
            const div = document.createElement('div');
            div.className = 'comentario';

            const nome = document.createElement('strong');
            nome.textContent = pegarCampo(comentario, ['usuario', 'nomeUsuario']);

            const texto = document.createElement('p');
            texto.textContent = pegarCampo(comentario, ['texto']);

            div.appendChild(nome);
            div.appendChild(texto);

            listaComentarios.appendChild(div);
        });
    } catch (erro) {
        console.error('Erro ao carregar comentários:', erro);
        listaComentarios.textContent = 'Erro ao conectar com o servidor.';
    }
}

// Busca o histórico de alterações da demanda
async function carregarHistorico() {
    try {
        const resposta = await fetch(`${API_URL}/demandas/${idDemanda}/historico`, {
            method: 'GET',
            credentials: 'include',
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            listaHistorico.textContent = dados.mensagem || 'Não foi possível carregar o histórico.';
            return;
        }

        listaHistorico.innerHTML = '';

        if (!dados || dados.length === 0) {
            listaHistorico.textContent = 'Nenhuma alteração registrada.';
            return;
        }

        dados.forEach((alteracao) => {
            const div = document.createElement('div');
            div.className = 'itemHistorico';

            const usuario = document.createElement('strong');
            usuario.textContent = pegarCampo(alteracao, ['usuario']);

            const descricao = document.createElement('p');
            descricao.textContent = pegarCampo(alteracao, ['descricao']);

            const data = document.createElement('small');
            data.textContent = pegarCampo(alteracao, ['dataHora']);

            div.appendChild(usuario);
            div.appendChild(descricao);
            div.appendChild(data);

            listaHistorico.appendChild(div);
        });
    } catch (erro) {
        console.error('Erro ao carregar histórico:', erro);
        listaHistorico.textContent = 'Erro ao conectar com o servidor.';
    }
}

// Envia um novo comentário
async function adicionarComentario() {
    const texto = textoComentario.value.trim();

    mensagemComentario.textContent = '';

    if (texto === '') {
        mensagemComentario.textContent = 'Digite um comentário antes de enviar.';
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/demandas/${idDemanda}/comentarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ texto: texto }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagemComentario.textContent =
                dados.mensagem || 'Não foi possível adicionar o comentário.';
            return;
        }

        textoComentario.value = '';
        mensagemComentario.textContent = 'Comentário adicionado com sucesso!';

        await carregarComentarios();
    } catch (erro) {
        console.error('Erro ao adicionar comentário:', erro);
        mensagemComentario.textContent = 'Erro ao conectar com o servidor.';
    }
}

// Evento do botão
btnAdicionarComentario.addEventListener('click', adicionarComentario);

// Carrega os dados quando a página abrir
carregarDemanda();

if (idDemanda && Number(idDemanda) > 0) {
    carregarComentarios();
    carregarHistorico();
}
