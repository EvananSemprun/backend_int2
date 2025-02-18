import type { Request, Response } from 'express';
import User from "../models/User";
import { checkPassword, hashPassword ,hashApiKeyAndSecret } from '../utils/auth'
import slug from 'slug'
import { validationResult } from 'express-validator'
import AdminBalance from '../models/admin_balance';
import bcrypt from 'bcrypt'

export const createAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role, saldo: userSaldo } = req.body;
        
        // Verificamos si el usuario ya existe
        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(409).json({ error: 'Un usuario con ese mail ya está registrado' });
            return;
        }

        const handle = slug(req.body.handle, '');
        const handleExists = await User.findOne({ handle });
        if (handleExists) {
            res.status(409).json({ error: 'Nombre de usuario no disponible' });
            return;
        }

        let saldo = 0;
        
        if (role === 'admin' || role === 'vendedor') {
            // Si es admin o vendedor, obtener el saldo del AdminBalance
            const adminBalance = await AdminBalance.findOne().sort({ created_at: -1 }).limit(1);
            if (adminBalance) {
                saldo = adminBalance.saldo; // Asignamos el saldo del admin
            } else {
                res.status(400).json({ error: 'No se encontró el saldo para el rol' });
                return;
            }
        } else if (role === 'cliente') {
            // Si es cliente, asignar el saldo proporcionado en el body
            if (!userSaldo || userSaldo < 100) {
                res.status(400).json({ error: 'El saldo para el cliente debe ser al menos 100' });
                return;
            }
            saldo = userSaldo; // Asignamos el saldo del cliente
        }

        // Creamos el nuevo usuario
        const user = new User(req.body);
        user.password = await hashPassword(password);
        user.handle = handle;
        user.saldo = saldo; // Asignamos el saldo adecuado

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

export const updateAdminBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { api_key, api_secret, saldo } = req.body;

        const adminBalance = await AdminBalance.findOne({});
        if (!adminBalance) {
            res.status(404).json({ error: 'Saldo del administrador no encontrado' });
            return ;
        }

        if (saldo < adminBalance.saldo) {
            res.status(400).json({ error: 'El saldo no puede ser menor al saldo actual' });
            return;
        }

        let hashedApiKey = adminBalance.api_key;
        let hashedApiSecret = adminBalance.api_secret;

        if (api_key !== adminBalance.api_key) {
            hashedApiKey = await bcrypt.hash(api_key, 10);
        }

        if (api_secret !== adminBalance.api_secret) {
            hashedApiSecret = await bcrypt.hash(api_secret, 10);
        }

        adminBalance.api_key = hashedApiKey;
        adminBalance.api_secret = hashedApiSecret;
        adminBalance.saldo = saldo;

        await adminBalance.save();

        res.status(200).json({ message: 'Saldo del administrador actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};
