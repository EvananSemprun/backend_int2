import mongoose from 'mongoose'
import colors from 'colors'
import { lookup } from 'dns'

export const connectDB = async () =>  {
    try {
        // Conexión a la base de datos MongoDB
        const { connection } = await mongoose.connect(process.env.MONGO_URI)
        const url = `${connection.host}:${connection.port}`
        console.log(colors.cyan.bold(`MongoDB Conectado en ${url}`))

        // Obtener la IP pública del servidor
        const domain = 'top-level-production.up.railway.app'; // Aquí pones tu URL
        lookup(domain, (err, address, family) => {
            if (err) {
                console.log(colors.bgRed.white.bold(`Error al obtener la IP del servidor: ${err.message}`))
            } else {
                console.log(colors.green(`La IP del servidor ${domain} es: ${address} (IPv${family})`))
            }
        })
        
    } catch (error) {
        console.log(colors.bgRed.white.bold(error.message))
        process.exit(1)
    }
}
