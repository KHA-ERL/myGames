const mongoose = require('mongoose')

async function connectToMongoDb(mongo_url) {
    await mongoose.connect(mongo_url)

    await mongoose.connection.on('connected',() => {
        console.log("Connected to MongoDB successfully")
    })

    await mongoose.connection.on('error',(err) =>{
        console.error('Error connecting to MongoDB',err)
    })
}
module.exports = {connectToMongoDb}