import type { Request, Response } from 'express';
import User from "../models/User";
import { checkPassword, hashPassword } from '../utils/auth'
import slug from 'slug'
import { validationResult } from 'express-validator'
import AdminBalance from '../models/admin_balance';
import bcrypt from 'bcrypt'
import { generateJWT } from '../utils/jwt';
import Product from '../models/Product';
import Sale from '../models/Sales';
import mongoose from 'mongoose';
import moment from 'moment';

export const createAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, role, saldo: userSaldo, rango } = req.body;

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
        let assignedRango = '';

        if (role === 'cliente' || role === 'admin') {
            if (!userSaldo || userSaldo < 100) {
                res.status(400).json({ error: 'El saldo debe ser al menos 100' });
                return;
            }
            saldo = userSaldo;
        } else if (role === 'vendedor' || role === 'master') {
            const adminBalance = await AdminBalance.findOne().sort({ created_at: -1 }).limit(1);
            if (adminBalance) {
                saldo = adminBalance.saldo;
            } else {
                res.status(400).json({ error: 'No se encontró el saldo para el rol' });
                return;
            }
        }

        if (['admin', 'vendedor', 'master'].includes(role)) {
            assignedRango = 'ultrap';
        } else if (role === 'cliente') {
            if (!['diamante', 'oro', 'bronce'].includes(rango)) {
                res.status(400).json({ error: 'El rango para clientes debe ser diamante, oro o bronce' });
                return;
            }
            assignedRango = rango;
        }

        const user = new User({
            ...req.body,
            password: await hashPassword(password),
            handle,
            saldo,
            rango: assignedRango
        });

        await user.save();
        res.status(201).send('Registro Creado Correctamente');
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const updateAdminBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { saldo } = req.body;

        const adminBalance = await AdminBalance.findOne({});
        if (!adminBalance) {
            res.status(404).json({ error: 'Saldo del administrador no encontrado' });
            return;
        }

        adminBalance.saldo += parseFloat(saldo.toFixed(2));
        await adminBalance.save();

        await User.updateMany(
            { role: { $in: ['vendedor', 'master'] } },
            { $inc: { saldo: parseFloat(saldo.toFixed(2)) } }
        );

        res.status(200).json({
            message: 'Saldo del administrador actualizado correctamente y saldo de vendedores y masters incrementado'
        });
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

};

export const getUser = async (req: Request, res: Response) => {
    res.json(req.user)
};

export const getUserCounts = async (req: Request, res: Response) => {
    try {
        if (!req.user || req.user.role !== 'master') {
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

        const productExists = await Product.findOne({ code });
        if (productExists) {
            return res.status(409).json({ error: 'El producto con este código ya está registrado' });
        }

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

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        if (code && code !== product.code) {
            const productExists = await Product.findOne({ code });
            if (productExists) {
                return res.status(409).json({ error: 'Ya existe un producto con este código' });
            }
        }

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
    const { quantity, product, status, order_id, pins, user, totalPrice, productName } = req.body;
    const userId = req.user ? req.user._id : null;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const adminBalance = await AdminBalance.findOne();
        if (!adminBalance) {
            res.status(404).json({ error: 'Saldo del administrador no encontrado' });
            return
        }

        let userData = null;

        const processUserBalance = async (userId: string | null, userData: any, session: any) => {
            const userRole = userData.role;
            let currentSaldo = userData.saldo;
            if (userRole === 'cliente' || userRole === 'admin') {
                if (currentSaldo < totalPrice) {
                    return res.status(400).json({ error: 'Saldo insuficiente' });
                }
                currentSaldo = parseFloat((currentSaldo - totalPrice).toFixed(2));
                if (isNaN(currentSaldo)) {
                    return res.status(400).json({ error: 'Saldo inválido después de la operación' });
                }
                await User.updateOne({ _id: userData.id }, { $set: { saldo: currentSaldo } }, { session });
            } else {
                if (adminBalance.saldo < totalPrice) {
                    return res.status(400).json({ error: 'Saldo insuficiente del administrador' });
                }
                const newAdminSaldo = parseFloat((adminBalance.saldo - totalPrice).toFixed(2));
                if (isNaN(newAdminSaldo)) {
                    return res.status(400).json({ error: 'Saldo inválido después de la operación del administrador' });
                }

                adminBalance.saldo = newAdminSaldo;
                await adminBalance.save({ session });

                await User.updateMany(
                    { role: { $in: ['vendedor', 'master'] } },
                    { $set: { saldo: newAdminSaldo } },
                    { session }
                );
            }
        };

        if (userId) {
            const foundUser = await User.findById(userId).session(session);
            if (!foundUser) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return
            }

            userData = {
                id: foundUser._id,
                handle: foundUser.handle,
                name: foundUser.name,
                email: foundUser.email,
                role: foundUser.role,
                saldo: foundUser.saldo,
            };

            await processUserBalance(foundUser._id.toString(), userData, session);
        } else if (user) {
            userData = {
                id: new mongoose.Types.ObjectId(user.id),
                handle: user.handle,
                name: user.name,
                email: user.email,
                role: user.role,
                saldo: user.saldo,
            };

            await processUserBalance(user.id, userData, session);
        }

        const sale = new Sale({
            user: userData,
            quantity,
            product,
            productName,
            totalPrice,
            status,
            order_id,
            pins
        });

        await sale.save({ session });
        await session.commitTransaction();
        res.status(201).json({ message: 'Venta registrada exitosamente', sale });
    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    } finally {
        session.endSession();
    }
};

export const getAllSales = async (req: Request, res: Response): Promise<void> => {
    try {
        const sales = await Sale.find().populate('product user');
        res.status(200).json(sales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const getUserSales = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.userId;
        const sales = await Sale.find({ 'user.id': userId }).populate('product user');

        if (!sales.length) {
            res.status(404).json({ error: 'No se encontraron ventas para este usuario' });
            return;
        }

        res.status(200).json(sales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const getSalesByDate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date } = req.query;

        if (!date || typeof date !== 'string') {
            res.status(400).json({ error: 'La fecha es obligatoria y debe ser un string' });
            return;
        }

        const startOfDay = moment(String(date), "YYYY-MM-DD").startOf('day').toDate();
        const endOfDay = moment(String(date), "YYYY-MM-DD").endOf('day').toDate();


        const sales = await Sale.find({
            created_at: { $gte: startOfDay, $lte: endOfDay }
        }).populate('product user');

        if (!sales.length) {
            res.status(404).json({ error: 'No se encontraron ventas para esa fecha' });
            return;
        }

        res.status(200).json(sales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const getUserSalesByDate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, date } = req.params;
        if (!date) {
            res.status(400).json({ error: 'La fecha es obligatoria' });
            return;
        }

        const startOfDay = moment(String(date)).startOf('day').toDate();
        const endOfDay = moment(String(date)).endOf('day').toDate();

        const sales = await Sale.find({
            'user.id': userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).populate('product user');

        if (!sales.length) {
            res.status(404).json({ error: 'No se encontraron ventas para este usuario en esa fecha' });
            return;
        }

        res.status(200).json(sales);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};
