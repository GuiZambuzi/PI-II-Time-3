/*
 * Autor: Guilherme Henrique Lopes Zambuzi
 * Descrição: Serviço que consulta uma API externa (BrasilAPI) para verificar
 * feriados nacionais no cadastro/alteração de prazos e fornecer datas de feriados
 * para o cálculo de dias úteis das demandas no PI2.
 */

export interface FeriadoApi {
    date: string; // formato YYYY-MM-DD
    name: string; // nome do feriado
    type: string; // ex.: "national" na BrasilAPI
}

// Cache em memória por ano para evitar chamadas repetidas durante a execução
const cachePorAno = new Map<number, FeriadoApi[]>();

function validarFormatoDataISO(data: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(data);
}

/**
 * Busca e coloca em cache os feriados nacionais de um ano específico.
 */
export async function buscarFeriadosDoAno(ano: number): Promise<FeriadoApi[]> {
    if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) {
        throw new Error(`Ano inválido para consulta de feriados: ${ano}`);
    }

    const emCache = cachePorAno.get(ano);
    if (emCache) {
        return emCache;
    }

    const resposta = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`, {
        signal: AbortSignal.timeout(5000)
    });

    if (!resposta.ok) {
        throw new Error(`BrasilAPI respondeu com status ${resposta.status}`);
    }

    const dados = (await resposta.json()) as FeriadoApi[];
    const nacionais = Array.isArray(dados)
        ? dados.filter((item) => item.type === "national")
        : [];

    cachePorAno.set(ano, nacionais);
    return nacionais;
}

/**
 * Retorna o nome do feriado nacional se a data (YYYY-MM-DD) for feriado;
 * caso contrário, retorna null.
 */
export async function buscarFeriadoNacional(data: string): Promise<string | null> {
    const dataLimpa = String(data ?? "").trim();

    if (!validarFormatoDataISO(dataLimpa)) {
        throw new Error("Data inválida. Use o formato YYYY-MM-DD.");
    }

    const ano = Number(dataLimpa.slice(0, 4));
    const feriados = await buscarFeriadosDoAno(ano);
    const encontrado = feriados.find((f) => f.date === dataLimpa);

    return encontrado ? encontrado.name : null;
}

/**
 * Retorna um Set com datas (YYYY-MM-DD) de feriados nacionais para um intervalo de anos.
 * Útil para o contador de dias úteis desconsiderar feriados sem chamar a API a cada dia.
 */
export async function obterSetFeriadosPorIntervalo(
    anoInicial: number,
    anoFinal: number
): Promise<Set<string>> {
    const inicio = Math.min(anoInicial, anoFinal);
    const fim = Math.max(anoInicial, anoFinal);
    const datasFeriados = new Set<string>();

    for (let ano = inicio; ano <= fim; ano++) {
        const feriados = await buscarFeriadosDoAno(ano);
        for (const feriado of feriados) {
            datasFeriados.add(feriado.date);
        }
    }

    return datasFeriados;
}