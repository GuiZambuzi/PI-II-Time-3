import express from 'express';
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/teste', (req, res) => {
    res.json({
        mensagem: 'opann',
    });
});

app.get('/', (req, res) => {
    res.send('Servidor funfando!');
});

app.listen(PORT, () => {
    console.log(`Servidor BACKEND rodando em http://localhost:${PORT}`);
});
