// const passport = require('passport')
// const {userSignUp,userLogin,getAllUser} = require('../services/authServices')

// const signUp = async (req,res) => {
//     const payload = req.body
//     const SignUpResponse = await userSignUp({
//         name:payload.name,
//         email:payload.email,
//         password:payload.password
//     })
//     res.status(SignUpResponse.code).json(SignUpResponse)
// }

// const login = (req,res,next) =>{
//     passport.authenticate(async (err,user,info) => {
//         if (err) return res.status(500).json({message:err.message})
//             if (!user) return res.status(400).json({message:info.message});

//         const payload =req.body
//         const loginResponse = await UserModel.userLogin({
//             email:payload.email,
//             password:payload.password,
//         })
//         res.status(loginResponse.code).json(loginResponse)
//     })(req,res,next);
// }

// const getAll = async (req,res) => {
//     const allUsers = await getAllUser({})
//     res.status(allUsers.code).json(allUsers)
// }

// module.exports = {
//     signUp,login,getAll
// }