import { body } from 'express-validator'
import { Router } from 'express';
import { authenticate } from './middleware/auth';
import { handleInputErrors } from './middleware/validation'
import { createAccount, updateAdminBalance, login, getAdminBalance, getUser, getUserCounts, createProduct, getProducts, updateProduct, createSale, getAllSales, getUserSales, updateUserBalance, getTransactions, getClients } from './handlers';

const router = Router();

router.get('/', (req, res) => {
    res.send('Bienvenido a la API');
});

router.post('/auth/register',
    body('handle').notEmpty().withMessage('El handle no puede ir vacío'),
    body('name').notEmpty().withMessage('El Nombre no puede ir vacío'),
    body('email').isEmail().withMessage('E-mail no válido'),
    body('password').isLength({ min: 8 }).withMessage('El Password es muy corto, mínimo 8 caracteres'),
    body('role')
        .notEmpty().withMessage('El rol es obligatorio')
        .isIn(['admin', 'vendedor', 'cliente', 'master'])
        .withMessage('El rol debe ser uno de los siguientes: admin, vendedor, cliente, master'),
    body('saldo').custom((value, { req }) => {
        if (req.body.role === 'cliente' && !value) {
            throw new Error('El saldo es obligatorio para el rol cliente');
        }
        if (req.body.role !== 'cliente' && value < 100) {
            throw new Error('El saldo debe ser al menos 100');
        }
        return true;
    }),
    body('rango').custom((value, { req }) => {
        if (req.body.role === 'cliente' && !['oro', 'plata', 'bronce'].includes(value)) {
            throw new Error('El rango para clientes debe ser oro, plata o bronce');
        }
        return true;
    }),
    handleInputErrors,
    createAccount
);

router.post('/auth/login',
    body('email')
        .isEmail()
        .withMessage('E-mail no válido'),
    body('password')
        .notEmpty()
        .withMessage('El Password es obligatorio'),
    handleInputErrors,
    login
)

router.put('/admin/balance',
    body('saldo').isNumeric().withMessage('El saldo debe ser un número'),
    handleInputErrors,
    updateAdminBalance
)

router.get('/admin/balance', getAdminBalance);

router.get('/user', authenticate, getUser)

router.get('/users/count', authenticate, getUserCounts);

router.post('/products',
    body('product_group')
        .notEmpty()
        .withMessage('El grupo de producto es obligatorio'),
    body('name')
        .notEmpty()
        .withMessage('El nombre del producto es obligatorio'),
    body('code')
        .notEmpty()
        .withMessage('El código del producto es obligatorio')
        .isLength({ min: 3 })
        .withMessage('El código debe tener al menos 3 caracteres'),
    body('type')
        .notEmpty()
        .withMessage('El tipo de producto es obligatorio'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número positivo'),
    body('special_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio especial debe ser un número positivo'),
    body('available')
        .isBoolean()
        .withMessage('El campo "available" debe ser verdadero o falso'),
    handleInputErrors,
    createProduct
);

router.get('/products', getProducts);

router.put('/products/:id',
    body('price_oro')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio de oro debe ser un número positivo'),
    body('price_plata')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio de plata debe ser un número positivo'),
    body('price_bronce')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio de bronce debe ser un número positivo'),
    body('available')
        .optional()
        .isBoolean()
        .withMessage('El campo "available" debe ser verdadero o falso'),
    handleInputErrors,
    updateProduct
);

router.post('/sales', createSale);

router.get('/sales', authenticate, getAllSales); 
router.get('/sales/user/:userId', authenticate, getUserSales);
router.get('/sales/user/:userId/date/:date', authenticate, getUserSales); 

router.get('/users/clients', getClients);

router.put('/user/balance',
    body('userId').notEmpty().withMessage('El ID del usuario es obligatorio'),
    body('amount').isNumeric().withMessage('El monto debe ser un número'),
    handleInputErrors,
    updateUserBalance
);

router.get('/transactions/:userId',
    authenticate,
    getTransactions
)

export default router;
