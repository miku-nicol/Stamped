const userModel = require("./userModel")


const findByEmail = async(email) =>{
    return userModel.findOne({ email });
};



const createUser = async (data) => {
    return userModel.create({...data});
};

const findByGoogleId = async (googleId) => {
    return userModel.findOne({ googleId });
};

const createGoogleUser = async (data) => {
  return userModel.create({
    ...data,
    emailVerified: true, // Google-verified emails

  });
};

const findById = async (id) => {
    return userModel.findById(id);
};

const findByEmailWithPassword = async (email) => {
    return userModel.findOne({ email}).select('+password');
};

const findByResetToken = async (token) => {
    return userModel.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires')
};

const setResetPasswordToken = async (email, token, expiresAt) => {
    return userModel.findOneAndUpdate(
        { email },
        {
            resetPasswordToken: token,
            resetPasswordExpires: expiresAt
        },
        { returnDocument: 'after' }
    )
};

const updatePassword = async (userId, hashedPassword) => {
    return userModel.findByIdAndUpdate(
        userId,
        {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        },
       { returnDocument: 'after' }
    );
};

module.exports = { findByEmail, createUser, findByGoogleId, findById, createGoogleUser, findByEmailWithPassword, findByResetToken, setResetPasswordToken, updatePassword};