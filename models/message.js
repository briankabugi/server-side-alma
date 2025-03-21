const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
    sender: {
        type: Object,
        required: true
    },
    receiver: {
        type: Object,
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
        required: true
    },
    content_type: {
        type: String,
        required: true
    }
})

const Message = mongoose.model('Message', MessageSchema)
module.exports = Message