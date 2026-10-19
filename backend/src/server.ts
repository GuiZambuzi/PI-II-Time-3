import express from 'express';
import demandasRouter from './routes/listagemDemanda';
import usuariosRouter from './routes/usuarios';
import cadastroDemandaRouter from './routes/cadastroDemanda';
import detalhesDemandasRouter from './routes/detalhesDemandas';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = 3000;

app.use(express.json());

// Rota de teste
app.get('/teste', (req, res) => {
    res.json({
        mensagem: 'opann',
    });
});

// Rota inicial
app.get('/', (req, res) => {
    res.send('Servidor funfando!');
});

// Rota do dashboard (resumo das demandas)
app.use('/dashboard', dashboardRouter);

// Rota de listagem de demandas
app.use('/demandas', demandasRouter);

// Rota de usuários
app.use('/usuarios', usuariosRouter);

// Rota de detalhes de demandas
app.use('/demandas', detalhesDemandasRouter);

// Rota de Cadastro de demandas
app.use('/', cadastroDemandaRouter);

app.listen(PORT, () => {
    console.log(`Servidor BACKEND rodando em http://localhost:${PORT}`);
});
