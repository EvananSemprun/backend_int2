import { Router } from 'express';
import { createAccount,login } from './handlers';
import { handleInputErrors } from './middleware/validation'
import { body } from 'express-validator'

const router = Router();

router.get('/', (req, res) => {
    res.send('Bienvenido a la API');
});

router.post('/auth/register',
    body('handle')
        .notEmpty()
        .withMessage('El handle no puede ir vacio'),
    body('name')
        .notEmpty()
        .withMessage('El Nombre no puede ir vacio'),
    body('email')
        .isEmail()
        .withMessage('E-mail no válido'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('El Password es muy corto, mínimo 8 caracteres'),
    handleInputErrors,
    createAccount
)
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
export default router;
