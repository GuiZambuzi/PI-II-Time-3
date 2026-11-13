import express from 'express';
import session from 'express-session';
import cors from 'cors';
import demandasRouter from './routes/listagemDemanda';
import usuariosRouter from './routes/usuarios';
import cadastroDemandaRouter from './routes/cadastroDemanda';
import detalhesDemandasRouter from './routes/detalhesDemandas';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = 3000;

/*
 * CORS: o frontend roda no Vite (porta 5173) e a API na porta 3000, ou seja,
 * em origens diferentes. Sem o CORS o navegador bloqueia as respostas da API.
 * - origin: apenas o endereço do frontend pode chamar a API pelo navegador;
 * - credentials: true permite o envio e o recebimento do cookie da sessão
 *   (demandly.sid). Funciona junto com o credentials: "include" do fetch.
 * Com credentials: true a origem precisa ser explícita (não pode ser "*").
 */
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));

app.use(express.json());

app.use(session({
    name: 'demandly.sid',
    secret: process.env.SESSION_SECRET ?? 'segredo-local-de-desenvolvimento-demandly-pi2',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, // o JavaScript da página não consegue ler o cookie
        sameSite: 'lax',
        secure: false, // ambiente local em HTTP; com HTTPS usar true
        maxAge: 30 * 60 * 1000, // 30 minutos
    },
}));

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

// Rotas de usuários e autenticação (POST /login, GET /sessao, POST /logout, GET /usuarios)
app.use('/', usuariosRouter);

// Rota de detalhes de demandas
app.use('/demandas', detalhesDemandasRouter);

// Rota de Cadastro de demandas
app.use('/', cadastroDemandaRouter);

app.listen(PORT, () => {
    console.log(`Servidor BACKEND rodando em http://localhost:${PORT}`);
});
