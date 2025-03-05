import User from "../models/User";
import slug from 'slug'
import Sale from '../models/Sales';
import Product from '../models/Product';
import mongoose from 'mongoose';
import Transaction from "../models/Transaction";
import AdminBalance from '../models/admin_balance';
import { generateJWT } from '../utils/jwt';
import { validationResult } from 'express-validator'
import { checkPassword, hashPassword } from '../utils/auth'
import type { Request, Response } from 'express';

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
            if (!['oro', 'plata', 'bronce'].includes(rango)) {
                res.status(400).json({ error: 'El rango para clientes debe ser oro, plata o bronce' });
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

        const saldoToAdd = parseFloat(saldo).toFixed(2);
        adminBalance.saldo += parseFloat(saldoToAdd);
        adminBalance.currentSaldo = adminBalance.saldo;

        await adminBalance.save();

        await User.updateMany(
            { role: { $in: ['vendedor', 'master'] } },
            { $inc: { saldo: parseFloat(saldoToAdd) } }
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

        res.status(200).json({
            saldo: adminBalance.saldo,
            currentSaldo: adminBalance.currentSaldo
        });
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
        const { product_group, name, code, type, price, price_oro, price_plata, price_bronce, available } = req.body;

        const productExists = await Product.findOne({ code });
        if (productExists) {
            return res.status(409).json({ error: 'El producto con este código ya está registrado' });
        }

        const product = new Product({ product_group, name, code, type, price, price_oro, price_plata, price_bronce, available });
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

        if (!id) {
            return res.status(400).json({ error: 'ID del producto no proporcionado' });
        }

        const { price_oro, price_plata, price_bronce, available } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        if (price_oro !== undefined) product.price_oro = price_oro;
        if (price_plata !== undefined) product.price_plata = price_plata;
        if (price_bronce !== undefined) product.price_bronce = price_bronce;
        if (available !== undefined) product.available = available;

        await product.save();
        res.status(200).json({ message: 'Producto actualizado correctamente', product });
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};

export const createSale = async (req: Request, res: Response): Promise<void> => {
    try {
        const { quantity, product, status, order_id, pins, user, totalPrice, totalOriginalPrice, productName } = req.body;
        const userId = req.user ? req.user._id : null;
        const adminBalance = await AdminBalance.findOne();
        if (!adminBalance) {
            res.status(404).json({ error: 'Saldo del administrador no encontrado' });
            return;
        }

        let userData = null;
        const session = await mongoose.startSession();
        session.startTransaction();

        const updateUserBalance = async (userBalance: any, isUserAdmin: boolean = false) => {
            if (userBalance.saldo < totalPrice) {
                res.status(400).json({ error: `${isUserAdmin ? 'Saldo insuficiente para el admin' : 'Saldo insuficiente para el cliente'}` });
                return false;
            }

            const newBalance = parseFloat((userBalance.saldo - totalPrice).toFixed(2));
            if (isNaN(newBalance)) {
                res.status(400).json({ error: 'Saldo inválido después de la operación' });
                return false;
            }

            userBalance.saldo = newBalance;

            if (!(userBalance instanceof mongoose.Model)) {
                await User.updateOne(
                    { _id: userBalance.id },
                    { $set: { saldo: newBalance } },
                    { session }
                );
            } else {
                await userBalance.save({ session });
            }

            return true;
        };

        try {
            let moneydisp = 0;
            if (userId || user) {
                const currentUser = userId ? await User.findById(userId).session(session) : user;
                if (!currentUser) {
                    res.status(404).json({ error: 'Usuario no encontrado' });
                    return;
                }

                userData = {
                    id: currentUser._id,
                    handle: currentUser.handle,
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role
                };

                const isUserAdmin = currentUser.role === 'admin' || currentUser.role === 'cliente';
                if (!(await updateUserBalance(currentUser, isUserAdmin))) return;

                moneydisp = parseFloat(currentUser.saldo.toFixed(2));

                if (adminBalance.saldo < totalOriginalPrice) {
                    res.status(400).json({ error: 'Saldo insuficiente del administrador' });
                    return;
                }

                const newAdminBalance = parseFloat((adminBalance.saldo - totalOriginalPrice).toFixed(2));
                if (isNaN(newAdminBalance)) {
                    res.status(400).json({ error: 'Saldo inválido después de la operación del administrador' });
                    return;
                }

                adminBalance.saldo = newAdminBalance;
                await adminBalance.save({ session });

                await User.updateMany(
                    { role: { $in: ['master', 'vendedor'] } },
                    { $set: { saldo: newAdminBalance } },
                    { session }
                );
            }

            interface Pin {
                pin: string;
                usado?: boolean;
            }

            interface SaleData {
                user: {
                    id: string;
                    handle: string;
                    name: string;
                    email: string;
                    role: string;
                } | null;
                quantity: number;
                product: string;
                productName: string;
                totalPrice: number;
                totalOriginalPrice: number;
                moneydisp: number;
                status: string;
                order_id: string;
                pins: Pin[];
            }

            const saleData: SaleData = {
                user: userData,
                quantity,
                product,
                productName,
                totalPrice,
                totalOriginalPrice,
                moneydisp,
                status,
                order_id,
                pins: pins.map(pin => ({
                    ...pin,
                    usado: pin.usado ?? false 
                }))
            };

            const sale = new Sale(saleData);
            

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
        const userHandle = req.params.userHandle;
        const sales = await Sale.find({ 'user.handle': userHandle }).populate('product user');

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

export const getUnusedPinsByUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userHandle = req.params.userHandle;
        const sales = await Sale.find({ 'user.handle': userHandle });

        if (!sales.length) {
            res.status(404).json({ error: 'No se encontraron ventas para este usuario' });
            return;
        }

        const unusedPins = sales.flatMap(sale =>
            sale.pins.filter(pin => !pin.usado) 
        );

        res.status(200).json({ unusedPins });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};
export const updatePinStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userHandle, pinId } = req.params;
        const { usado } = req.body;

        const sale = await Sale.findOne({ 'user.handle': userHandle, 'pins.key': pinId });

        if (!sale) {
            res.status(404).json({ error: 'Pin no encontrado para este usuario' });
            return;
        }

        const pin = sale.pins.find(p => p.key === pinId);
        if (pin) {
            pin.usado = usado;
            await sale.save();
            res.status(200).json({ message: 'Pin actualizado correctamente' });
        } else {
            res.status(404).json({ error: 'Pin no encontrado' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const updateUserBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, amount, transactionUserName, role } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        if (!['cliente', 'admin'].includes(user.role)) {
            res.status(400).json({ error: 'Solo los clientes y administradores pueden actualizar saldo' });
            return;
        }

        const previousBalance = user.saldo;

        user.saldo = parseFloat((user.saldo + amount).toFixed(2));
        await user.save();

        if (role === 'admin') {
            const adminUser = await User.findOne({ handle: transactionUserName, role: 'admin' });
            if (adminUser) {
                if (adminUser.saldo < amount) {
                    res.status(400).json({ error: 'Saldo insuficiente en la cuenta del administrador' });
                    return;
                }
                adminUser.saldo = parseFloat((adminUser.saldo - amount).toFixed(2));
                await adminUser.save();
            } else {
                res.status(400).json({ error: 'Administrador no encontrado' });
                return;
            }
        }

        const transaction = new Transaction({
            userId: user._id,
            amount,
            previousBalance,
            type: amount > 0 ? 'recarga' : 'retiro',
            created_at: new Date(),
            transactionUserName: transactionUserName,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            userRango: user.rango,
            userhandle: user.handle, 
        });

        await transaction.save();

        res.status(200).json({ message: 'Saldo actualizado correctamente', saldo: user.saldo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const transactions = await Transaction.find().sort({ created_at: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al obtener todas las transacciones' });
    }
};

export const getUserTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userHandle } = req.params
        const transactions = await Transaction.find({
            $or: [
                { transactionUserName: userHandle },
                { userhandle: userHandle }
            ]
        }).sort({ created_at: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al obtener transacciones del usuario' });
    }
};

export const getClients = async (req: Request, res: Response): Promise<void> => {
    try {
        const clients = await User.find({ role: 'cliente' }).select('_id name email');
        res.status(200).json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
};