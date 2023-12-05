const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true
    },
    receiver: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    },
    updatedAt: {
        type: Date,
        required: false
    }
})

const Message = mongoose.model('Message', MessageSchema)
module.exports = Message