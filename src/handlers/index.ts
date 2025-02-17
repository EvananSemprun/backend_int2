import type { Request, Response } from 'express';
import User from "../models/User";
import { checkPassword, hashPassword } from '../utils/auth'
import slug from 'slug'
import { validationResult } from 'express-validator'

export const createAccount = async (req: Request, res: Response): Promise<void> => {


    try {
        const { email, password } = req.body;
        const userExists = await User.findOne({ email });

        if (userExists) {
            res.status(409).json({ error: 'Un usuario con ese mail ya esta registrado' });
            return;
        }

        const handle = slug(req.body.handle, '')
        const handleExists = await User.findOne({ handle })
        if (handleExists) {
            res.status(409).json({ error: 'Nombre de usuario no disponible' });
            return;
        }


        const user = new User(req.body);
        user.password = await hashPassword(password)
        user.handle = handle

        await user.save();
        res.status(201).send('Registro Creado Correctamente');
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const login = async (req: Request, res: Response) => {

    let errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Revisar si el usuario esta registrado
    const user = await User.findOne({ email })
    if (!user) {
        const error = new Error('El Usuario no existe')
        return res.status(404).json({ error: error.message })
    }
    const isPasswordCorrect = await checkPassword(password, user.password)
    if (!isPasswordCorrect) {
        const error = new Error('Password Incorrecto')
        return res.status(401).json({ error: error.message })
    }
    res.send('si es')

}