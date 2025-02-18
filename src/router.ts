import { Router } from 'express';
import { createAccount, updateAdminBalance, login } from './handlers';
import { handleInputErrors } from './middleware/validation'
import { body } from 'express-validator'

const router = Router();

router.get('/', (req, res) => {
    res.send('Bienvenido a la API');
});

router.post(
    '/auth/register',
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
        .isIn(['admin', 'vendedor', 'cliente'])
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

router.put(
    '/admin/balance',
    body('api_key').optional().notEmpty().withMessage('La API key es obligatoria si se incluye'),
    body('api_secret').optional().notEmpty().withMessage('El API secret es obligatorio si se incluye'),
    body('saldo').isNumeric().withMessage('El saldo debe ser un número'),
    handleInputErrors,
    updateAdminBalance
);


export default router;
