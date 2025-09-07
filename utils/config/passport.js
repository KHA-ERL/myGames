// const passport = require('passport');
// const User = require('../../models/user');
// const JwtStrategy = require('passport-jwt').Strategy;
// const ExtractJwt = require('passport-jwt').ExtractJwt

// const jwtOptions = {
//     jwtFromRequest:ExtractJwt.fromAuthHeaderAsBearerToken(),
//     secretOrKey:process.env.JWT_SECRET
// };

// passport.use(new JwtStrategy(jwtOptions,async(jwtPayload,done) => {
//     try {
//         const user = await User.findById(jwtPayload.id);
//         console.log("JWT Logged User:", user)

//         if (!user) return done(null,false);
//     } catch (error) {
//         return done(error)
//     }
// }));

// passport.serializeUser((user,done) => done(null,user.id));

// passport.deserializeUser(async (id,done) => {
//     try {
//         const user = await User.findById(id);
//         done(null,user)
//     } catch (error) {
//         done(error);
//     }
// })

// module.exports = passport