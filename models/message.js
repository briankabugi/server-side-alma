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
    timeScore: {
        type: Number,
        required: true
    },
    content: {
        type: String,
        required: true
    }
})

const Message = mongoose.model('Message', MessageSchema)
module.exports = Message