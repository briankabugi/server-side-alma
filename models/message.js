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
        type: Number,
        required: true
    },
    new: {
        type: Boolean,
        default: true
    }
})

const Message = mongoose.model('Message', MessageSchema)
module.exports = Message