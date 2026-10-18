/*
Diego Prandi Silva

Rotas responsaveis pelos detalhes das demandas
e pelo cadastro e listagem de comentarios
*/

import { Router, Request, Response } from 'express';
import { demandas, usuarios, comentarios } from '../data/dados';

const router = Router();

// busca uma demanda especifica pelo ID
router.get('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const demanda = demandas.find((item) => item.id === id);

    if (!demanda) {
        return res.status(404).json({
            mensagem: 'Demanda não encontrada.',
        });
    }

    return res.status(200).json(demanda);
});

// lista os comentarios de uma demanda
router.get('/:id/comentarios', (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const demanda = demandas.find((item) => item.id === id);

    if (!demanda) {
        return res.status(404).json({
            mensagem: 'Demanda não encontrada.',
        });
    }

    const resultado = comentarios.filter((item) => item.demandaId === id);

    return res.status(200).json(resultado);
});

// cadastra um comentario na demanda
router.post('/:id/comentarios', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { usuarioId, texto } = req.body;

    const demanda = demandas.find((item) => item.id === id);

    if (!demanda) {
        return res.status(404).json({
            mensagem: 'Demanda não encontrada.',
        });
    }

    if (!texto) {
        return res.status(400).json({
            mensagem: 'Preencha o texto do comentario.',
        });
    }

    const usuario = usuarios.find((item) => item.id === Number(usuarioId));

    if (!usuario) {
        return res.status(400).json({
            mensagem: 'Usuario invalido.',
        });
    }

    const novoComentario = {
        id: comentarios.length + 1,
        demandaId: id,
        usuarioId: usuario.id,
        texto: texto,
        dataHora: new Date().toISOString(),
    };

    comentarios.push(novoComentario);

    return res.status(201).json(novoComentario);
});

export default router;
