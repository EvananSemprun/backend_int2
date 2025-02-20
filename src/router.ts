import { Router } from 'express';
import { createAccount, updateAdminBalance, login, getAdminBalance, getUser, getUserCounts, createProduct, getProducts, updateProduct } from './handlers';
import { handleInputErrors } from './middleware/validation'
import { body } from 'express-validator'
import { authenticate } from './middleware/auth';

const router = Router();

router.get('/', (req, res) => {
    res.send('Bienvenido a la API');
});

router.post('/auth/register',
    body('handle')
        .notEmpty()
        .withMessage('El handle no puede ir vacío'),
    body('name')
        .notEmpty()
        .withMessage('El Nombre no puede ir vacío'),
    body('email')
        .isEmail()
        .withMessage('E-mail no válido'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('El Password es muy corto, mínimo 8 caracteres'),
    body('role')
        .notEmpty()
        .withMessage('El rol es obligatorio')
        .isIn(['admin', 'vendedor', 'cliente','master'])
        .withMessage('El rol debe ser uno de los siguientes: admin, vendedor, cliente'),
    body('saldo').custom((value, { req }) => {
        if (req.body.role === 'cliente' && !value) {
            throw new Error('El saldo es obligatorio para el rol cliente');
        }
        if (req.body.role !== 'cliente' && value < 100) {
            throw new Error('El saldo debe ser al menos 100');
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
    body('api_key').optional().notEmpty().withMessage('La API key es obligatoria si se incluye'),
    body('api_secret').optional().notEmpty().withMessage('El API secret es obligatorio si se incluye'),
    body('saldo').isNumeric().withMessage('El saldo debe ser un número'),
    handleInputErrors,
    updateAdminBalance
);

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
    body('product_group')
        .optional()
        .notEmpty()
        .withMessage('El grupo de producto no puede estar vacío'),
    body('name')
        .optional()
        .notEmpty()
        .withMessage('El nombre del producto no puede estar vacío'),
    body('code')
        .optional()
        .notEmpty()
        .withMessage('El código del producto no puede estar vacío')
        .isLength({ min: 3 })
        .withMessage('El código debe tener al menos 3 caracteres'),
    body('type')
        .optional()
        .notEmpty()
        .withMessage('El tipo de producto no puede estar vacío'),
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número positivo'),
    body('special_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio especial debe ser un número positivo'),
    body('available')
        .optional()
        .isBoolean()
        .withMessage('El campo "available" debe ser verdadero o falso'),
    handleInputErrors,
    updateProduct
);
export default router;
