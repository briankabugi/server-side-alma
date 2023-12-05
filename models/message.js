const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    content: {
        type: String,
        required: true
    }
}, { timestamps: true })

const Message = mongoose.model('Message', MessageSchema)
module.exports = Message