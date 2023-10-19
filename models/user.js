const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
    info: {
        type: {},
        required: true
    },
    favorites: {
        type: {},
        default: {}
    },
    messages: {
        type: {},
        default: {}
    },
    preferences: {
        type: {},
        default: {}
    }
})

const User = mongoose.model('User', userSchema)
module.exports = User