// const mongoose = require('mongoose')
// const bcrypt = require('bcrypt')

// const UserSchema = mongoose.Schema(
//     {
//         username:{
//             type:String,
//             required:[true,"Please enter your name"]
//         },
//         email:{
//             type:String,
//             required:[true,"Please enter your email"]
//         },
//         password:{
//             type:String,
//             required:[true,"Please enter your password"]
//         },
//         createdAt:{
//             type:Date,
//             default:Date.now()
//         },
//         updated:{
//           type:Date,
//           default:Date.now()  
//         }
//     }
// );

// UserSchema.pre(
//     'save',
//     async function (next) {
//         const user = this;
//         if (!this.isModified(password)) return next()

//         const hash = await bcrypt.hash(this.password,10)
//         this.password = hash;
//         next()    
//     }
// )

// UserSchema.methods.isValidPassword = async function (password) {
//     const user = this;
//     const compare = await bcrypt.compare(password,user.password)
//     return compare
// }

// const User = mongoose.model("users",UserSchema)

// module.exports = User