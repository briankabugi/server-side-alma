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
    }
})

const Messages = mongoose.model('Messages', MessageSchema)
module.exports = Messages