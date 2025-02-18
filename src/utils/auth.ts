import bcrypt from 'bcrypt'

export const hashPassword = async (password : string) => {
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(password, salt)
}

export const checkPassword = async (enteredPassword: string, hash: string) => {
    return await bcrypt.compare(enteredPassword, hash)
}

export const hashApiKeyAndSecret = async (apiKey: string, apiSecret: string) => {
    const hashedApiKey = await bcrypt.hash(apiKey, 10);
    const hashedApiSecret = await bcrypt.hash(apiSecret, 10);
    return { hashedApiKey, hashedApiSecret };
};