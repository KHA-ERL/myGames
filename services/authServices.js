// const { trusted } = require("mongoose");
// const UserModel = require("../models/user");
// const jwt = require('jsonwebtoken')

// const userSignUp = async ({name,password,email}) => {
//     try {
//         const newUser = await UserModel.create({
//             name,email,password
//         });
//         return{
//             code:201,
//             success:true,
//             message:"User signed up successfully",
//             data:{
//                 user:newUser
//             }
//         }
//     } catch (error) {
//         return{
//             code:500,
//             success:false,
//             data:null,
//             message:error.message
//         }
//     }
// }

// const userLogin = async ({email,password}) => {
//     try {
//         const user = await UserModel.findOne({email})

//         if (!user) {
//             return{
//                 code:400,
//                 success:false,
//                 data:null,
//                 message:"Invalid Credentials"
//             }
//         }

//         const validPassword = await user.isValidPassword(password)
//         if (!validPassword) {
//             return{
//                 code:400,
//                 success:false,
//                 data:null,
//                 message:"Invalid Credentials"
//             }
//         }

//         const token = jwt.sign({id:user._id,email:user.email},process.env.JWT_SECRET,{expiresIn:"1d"})
//         return{
//             code:200,
//             success:true,
//             data:{
//                 user,
//                 token
//             },
//             message:"User logged in successfully"
//         }
//     } catch (error) {
//         return{
//             code:500,
//             success:false,
//             data:null,
//             message:error.message || 'Server error'
//         }
//     }
// }

// const getAllUser = async() =>{
//     try {
//         const user = await UserModel.find({})
//         if (!user.length === 0) {
//             return{
//                 code:404,
//                 success:false,
//                 message:"No users available",
//                 data:null
//             };
//         }
//         return{
//             code:200,
//             success:true,
//             message:"User available",
//             data:{user}
//         }
//     } catch (error) {
//         return{
//             code:500,
//             success:false,
//             message:error.message || "Server error"
//         }
//     }
// }

// module.exports = {
//     userLogin,userSignUp,getAllUser
// }
