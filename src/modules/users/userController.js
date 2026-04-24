const userService = require("./userService");
const passport = require("passport");

const register = async (req, res) =>{
    console.log("register function started")
    try{
        console.log("parsing request body")
        const { firstName, lastName, email, password,confirmPassword} = req.body;
        console.log("3. Body parsed:", { firstName, lastName, email }); 

        const missingFields = [];
        if (!firstName) missingFields.push('firstName');
        if (!lastName) missingFields.push('lastName');
        if (!email) missingFields.push('email');
        if (!password) missingFields.push('password');
         if (!confirmPassword) missingFields.push('confirmPassword'); 
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        if(password !== confirmPassword){
            return res.status(400).json({
                success: false,
                message: "Password do not match"
            })
        }
        const token = await userService.registerUser(
            firstName,
            lastName,
            email,
            password
            
        );
        return res.status(201).json({
            success: true,
            data: { accessToken: token },
            message: "User registration successful"
        });
    } catch (error) {
        console.log("Registration failed", error.message)
        if (error.message === "Email already registered") {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }

};

const login = async (req, res) => {
    try{
        const { email, password} = req.body;

        if (!email || !password){
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });

        }

        const token = await userService.loginUser(
            email,
            password
        )
        return res.status(200).json({
            success: true,
            data: { accessToken: token },
            message: "Login successful"
        })
    } catch(error){
        console.log('login failed', error.message)

        if (error.message === "Invalid email or password") {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

         if (error.message === "Please login using Google") {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })

    }
}

 
//google callback
const  googleCallback = (req, res) => {
    const { token } = req.user;

    //redirect to FE with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
}

const googleMobileAuth = async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Google token is required"
            });
        }
        
        const { OAuth2Client } = require('google-auth-library');
        const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { sub: googleId, email, given_name: firstName, family_name: lastName } = payload;
        
        const jwtToken = await userService.registerGoogleUser(
            googleId,
            email,
            firstName,
            lastName
        );
        
        return res.status(200).json({
            success: true,
            data: { accessToken: jwtToken },
            message: "Google authentication successful"
        });
    } catch (error) {
        console.error("Google mobile auth error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Google authentication failed"
        });
    }
};

// Forgot Password - Request reset link
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }
        
        const result = await userService.forgotPassword(email);
        
        return res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error("Forgot password error:", error.message);
        
        if (error.message === "This account uses Google login") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Reset Password - Actually change password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }
        
        const result = await userService.resetPassword(token, newPassword, confirmPassword);
        
        return res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error("Reset password error:", error.message);
        
        if (error.message === "Passwords do not match") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message === "Invalid or expired reset token") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message === "Password must be at least 8 characters") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Validate reset token
const validateResetToken = async (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required"
            });
        }
        
        const result = await userService.validateResetToken(token);
        
        return res.status(200).json({
            success: true,
            data: { valid: true, email: result.email }
        });
    } catch (error) {
        console.error("Validate token error:", error.message);
        
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


module.exports = { register, login, googleMobileAuth,  googleCallback, forgotPassword, resetPassword, validateResetToken};