const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto")
const userRepository = require("./userRepository");
const emailService = require("../../services/emailService")


const registerUser = async (firstName, lastName, email, password) => {
    const existingUser = await userRepository.findByEmail(email);

    if(existingUser) {
        throw new Error("Email already registered");
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await userRepository.createUser({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        provider: 'local'
    });

    const token = jwt.sign(
        { userId: user._id, email: user.email,
            firstName: user.firstName, lastName: user.lastName
         },
        process.env.JWT_SECRET,
        { expiresIn: "2d" }
    );
    return {
        token: token,
        user: {
            firstName: user.firstName,
            lastName: user.lastName,
            initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
        }
    }

}

const registerGoogleUser = async (googleId, email, firstName, lastName) => {
    let user = await userRepository.findByGoogleId(googleId);
    if(user) {
        const token = jwt.sign(
            { userId: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
            process.env.JWT_SECRET,
            { expiresIn: "2d" }
        );
        return {
            token,
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
            }
        };
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser && !existingUser.googleId) {
        existingUser.googleId = googleId;
        existingUser.provider = 'google'; // Update provider
        existingUser.emailVerified = true; // Google emails are verified
        await existingUser.save();
        user = existingUser;
    } else {

    user = await userRepository.createGoogleUser({
        googleId,
        email,
        firstName,
        lastName,
        provider: 'google'
    });
    }

    const token = jwt.sign(
        { userId: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        process.env.JWT_SECRET,
        { expiresIn: "2d" }
    )

    return {
        token,
        user: {
            firstName: user.firstName,
            lastName: user.lastName,
            initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
        }
    };
}

const loginUser = async (email, password) => {
    const user = await userRepository.findByEmailWithPassword(email);

    if (!user) {
        throw new Error("Invalid email or password");

    }
    if (user.provider === 'google' && !user.password){
        throw new Error("Please login using Google");
        }
    

    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch) {
        throw new Error("Invalid email or password");
    }
    const token = jwt.sign(
        { userId: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        process.env.JWT_SECRET,
        { expiresIn: "2d"}
    )
    return {
        token: token,
        user: {
            firstName: user.firstName,
            lastName: user.lastName,
            initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
        }
    };
};

const forgotPassword = async (email) => {
    const user = await userRepository.findByEmail(email);

    if(!user){
        return { success: true, message: "If your email is registered, you will receive a reset link"};
    }

    //check if user is a google user
    if (user.provider === 'google' && !user.password) {
        throw new Error("This account uses Google login. Please sign in with Google.");
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1800000) // 30 min

    //Hash the token before storing (for security)
    const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

        // Save token to database
    await userRepository.setResetPasswordToken(email, hashedToken, resetTokenExpiry);
    
    // Send email with reset link
    await emailService.sendPasswordResetEmail(email, resetToken, user.firstName);
    
    
    return { success: true, message: "Password reset link sent to your email" };

}

const resetPassword = async (token, newPassword, confirmPassword) => {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
    }
    
    // Hash the incoming token
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    // Find user with valid token
    const user = await userRepository.findByResetToken(hashedToken);
    
    if (!user) {
        throw new Error("Invalid or expired reset token");
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password and clear reset fields
    await userRepository.updatePassword(user._id, hashedPassword);
    
    // Send success email
    await emailService.sendPasswordResetSuccessEmail(user.email, user.firstName);
    
    return { success: true, message: "Password has been reset successfully" };
};

// Validate reset token (for frontend to check if token is valid)
const validateResetToken = async (token) => {
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    const user = await userRepository.findByResetToken(hashedToken);
    
    if (!user) {
        throw new Error("Invalid or expired reset token");
    }
    
    return { valid: true, email: user.email };
};



module.exports = { registerUser, loginUser, registerGoogleUser, forgotPassword, resetPassword, validateResetToken }