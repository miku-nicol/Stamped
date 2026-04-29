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
        const result = await userService.registerUser(
            firstName,
            lastName,
            email,
            password
            
        );
        return res.status(201).json({
            success: true,
            data: { accessToken: result.token,
                user: result.user
             },
            message: "User registration successful",
             

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

        const result = await userService.loginUser(
            email,
            password
        )
        return res.status(200).json({
            success: true,
            data: { accessToken: result.token,
                user: result.user
             },
            message: "Login successful",
            
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
        const { idToken, accessToken } = req.body;

        let googleId, email, firstName, lastName;

        // ✅ CASE 1: ID TOKEN (Preferred)
        if (idToken) {
            const { OAuth2Client } = require('google-auth-library');
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();

            googleId = payload.sub;
            email = payload.email;
            firstName = payload.given_name;
            lastName = payload.family_name;

        // ✅ CASE 2: ACCESS TOKEN (Flutter Web fallback)
        } else if (accessToken) {
            const axios = require("axios");

            const response = await axios.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            const data = response.data;

            googleId = data.sub;
            email = data.email;
            firstName = data.given_name;
            lastName = data.family_name;

        } else {
            return res.status(400).json({
                success: false,
                message: "idToken or accessToken is required"
            });
        }

        const result = await userService.registerGoogleUser(
            googleId,
            email,
            firstName,
            lastName
        );

        return res.status(200).json({
            success: true,
            data: { accessToken: result.token, 
                user: result.user
             },
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