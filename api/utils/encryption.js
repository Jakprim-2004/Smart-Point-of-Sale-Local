const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

const encryptPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        throw new Error('Error encrypting password');
    }
};

const comparePassword = async (plainPassword, hashedPassword) => {
    try {
        //  bcrypt.compare เพื่อเปรียบเทียบรหัสผ่าน
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};

module.exports = {
    encryptPassword,
    comparePassword
};
