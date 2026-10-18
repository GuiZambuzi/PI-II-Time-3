import express from 'express';
import demandasRouter from './routes/listagemDemanda';
import cadastroDemandaRouter from './routes/cadastroDemanda'; // Importando suas rotas

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

// Rota de listagem de demandas
app.use('/demandas', demandasRouter);

// Rota de Cadastro de demandas
app.use('/', cadastroDemandaRouter); 

app.listen(PORT, () => {
    console.log(`Servidor BACKEND rodando em http://localhost:${PORT}`);
});
