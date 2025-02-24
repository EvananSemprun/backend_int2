import type { Request, Response } from 'express';
import User from "../models/User";
import { checkPassword, hashPassword  } from '../utils/auth'
import slug from 'slug'
import { validationResult } from 'express-validator'
import AdminBalance from '../models/admin_balance';
import bcrypt from 'bcrypt'
import { generateJWT } from '../utils/jwt';
import Product from '../models/Product';
import Sale from '../models/Sales';
import mongoose from 'mongoose';

export const createAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role, saldo: userSaldo } = req.body;
        
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
        
        if (role === 'admin' || role === 'vendedor' || role === 'master') {
            const adminBalance = await AdminBalance.findOne().sort({ created_at: -1 }).limit(1);
            if (adminBalance) {
              saldo = adminBalance.saldo;
            } else {
              res.status(400).json({ error: 'No se encontró el saldo para el rol' });
              return;
            }
          } else if (role === 'cliente') {
            if (!userSaldo || userSaldo < 100) {
              res.status(400).json({ error: 'El saldo para el cliente debe ser al menos 100' });
              return;
            }
            saldo = userSaldo;
          }
          

        const user = new User(req.body);
        user.password = await hashPassword(password);
        user.handle = handle;
        user.saldo = saldo;

        await user.save();
        res.status(201).send('Registro Creado Correctamente');
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const updateAdminBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { api_key, api_secret, saldo } = req.body;

        const adminBalance = await AdminBalance.findOne({});
        if (!adminBalance) {
            res.status(404).json({ error: 'Saldo del administrador no encontrado' });
            return;
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

        // Actualizar saldo de los usuarios con rol 'admin' o 'vendedor'
        await User.updateMany({ role: { $in: ['admin', 'vendedor'] } }, { $set: { saldo: saldo } });

        res.status(200).json({ message: 'Saldo del administrador actualizado correctamente y saldo de administradores y vendedores actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const getAdminBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminBalance = await AdminBalance.findOne().sort({ created_at: -1 }).limit(1);
        
        if (!adminBalance) {
            res.status(404).json({ error: 'No se encontró el saldo del administrador' });
            return;
        }

        res.status(200).json({ saldo: adminBalance.saldo });
    } catch (error) {
        console.error(error);
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

    const token = generateJWT({ id: user._id })


    res.send(token)

}


export const getUser = async (req: Request, res: Response) => {
    res.json(req.user)
}

export const getUserCounts = async (req: Request, res: Response) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const adminCount = await User.countDocuments({ role: 'admin' });
        const sellerCount = await User.countDocuments({ role: 'vendedor' });
        const clientCount = await User.countDocuments({ role: 'cliente' });

        res.json({ adminCount, sellerCount, clientCount });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las estadísticas' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { product_group, name, code, type, price, special_price, available } = req.body;

        // Verificar si ya existe un producto con el mismo código
        const productExists = await Product.findOne({ code });
        if (productExists) {
            return res.status(409).json({ error: 'El producto con este código ya está registrado' });
        }

        // Crear el nuevo producto
        const product = new Product({ product_group, name, code, type, price, special_price, available });
        await product.save();
        res.status(201).json({ message: 'Producto creado exitosamente', product });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el producto' });
    }
};
export const getProducts = async (req: Request, res: Response) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los productos' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { product_group, name, code, type, price, special_price, available } = req.body;

        // Buscar el producto por su ID
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Si el código del producto cambia, verificar si ya existe otro producto con ese código
        if (code && code !== product.code) {
            const productExists = await Product.findOne({ code });
            if (productExists) {
                return res.status(409).json({ error: 'Ya existe un producto con este código' });
            }
        }

        // Actualizar los campos del producto
        product.product_group = product_group || product.product_group;
        product.name = name || product.name;
        product.code = code || product.code;
        product.type = type || product.type;
        product.price = price || product.price;
        product.special_price = special_price || product.special_price;
        product.available = available || product.available;

        await product.save();
        res.status(200).json({ message: 'Producto actualizado correctamente', product });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};

export const createSale = async (req: Request, res: Response): Promise<void> => {
    try {
        const { quantity, product, status, order_id, pins } = req.body;
        const userId = req.user ? req.user._id : null; // Verifica si hay un usuario autenticado

        const adminBalance = await AdminBalance.findOne();
        if (!adminBalance) {
            res.status(404).json({ error: 'Saldo del administrador no encontrado' });
            return;
        }

        let user = null;
        let userBalance = 0;

        if (userId) {
            user = await User.findById(userId);
            if (!user) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return;
            }

            if (user.saldo < quantity) {
                res.status(400).json({ error: 'Saldo insuficiente para el usuario' });
                return;
            }

            userBalance = user.saldo;
        }

        if (adminBalance.saldo < quantity) {
            res.status(400).json({ error: 'Saldo insuficiente del administrador' });
            return;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (user) {
                user.saldo -= quantity;
                await user.save({ session });
            }

            adminBalance.saldo -= quantity;
            await adminBalance.save({ session });

            const sale = new Sale({
                user: user ? { 
                    id: user._id, 
                    handle: user.handle, 
                    name: user.name, 
                    email: user.email 
                } : null, 
                quantity,
                product,
                status,
                order_id,
                pins
            });

            await sale.save({ session });

            await session.commitTransaction();
            session.endSession();

            res.status(201).json({ message: 'Venta registrada exitosamente', sale });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};
