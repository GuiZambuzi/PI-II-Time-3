/*
 * Autor: Guilherme Henrique Lopes Zambuzi
 *
 * Descrição: Serviço que consulta uma API externa (BrasilAPI) para verificar
 * se uma data é feriado nacional. Exigido pelo escopo do PI2: o prazo de
 * finalização de uma demanda não pode cair em feriado nacional, tanto no
 * cadastro quanto na alteração.
 *
 * Como usar nas rotas:
 *   const feriado = await buscarFeriadoNacional("2026-12-25");
 *   // feriado === "Natal"  -> bloquear com mensagem de erro
 *   // feriado === null     -> data liberada
 *
 * Se a API externa estiver fora do ar, a função lança um erro (a rota decide
 * o que responder, por exemplo 503).
 */

interface FeriadoApi {
    date: string;   // formato AAAA-MM-DD
    name: string;   // nome do feriado
    type: string;   // "national" na BrasilAPI
}

// Cache em memória: a lista de feriados de um ano não muda durante a execução,
// então cada ano é consultado uma única vez (menos chamadas e mais rapidez).
const cachePorAno = new Map<number, FeriadoApi[]>();

async function buscarFeriadosDoAno(ano: number): Promise<FeriadoApi[]> {
    const emCache = cachePorAno.get(ano);
    if (emCache) return emCache;

    // timeout de 5s para a tela não ficar travada se a API demorar
    const resposta = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`, {
        signal: AbortSignal.timeout(5000)
    });

    if (!resposta.ok) {
        throw new Error(`BrasilAPI respondeu com status ${resposta.status}`);
    }

    const feriados = (await resposta.json()) as FeriadoApi[];
    cachePorAno.set(ano, feriados);
    return feriados;
}

/**
 * Retorna o nome do feriado nacional se a data for feriado; caso contrário, null.
 * @param data string no formato AAAA-MM-DD (o mesmo do input type="date")
 */
export async function buscarFeriadoNacional(data: string): Promise<string | null> {
    const ano = Number(data.slice(0, 4));
    const feriados = await buscarFeriadosDoAno(ano);
    const encontrado = feriados.find((f) => f.date === data);
    return encontrado ? encontrado.name : null;
}