 const passport = require('passport');
 const GoogleStrategy = require('passport-google-oauth20').Strategy;
 const userService = require('./userService');


 const configure = () => {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const { id: googleId, emails, name } = profile;
            const email = emails[0].value;
            const firstName = name.givenName;
            const lastName = name.familyName;

            const token = await userService.registerGoogleUser(
                googleId,
                email,
                firstName,
                lastName
            );

            return done(null, { token, user: { email, firstName, lastName }});
        } catch (error){
            return done(error, null);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

 }

 module.exports = { configure };