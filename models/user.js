const mongoose = require('mongoose')
const userSchema = mongoose.Schema({
    info: {
        type: {},
        required: true
    },
    enterprises: {
        type: [String],
        default: []
    },
    favorites: {
        type: {},
        default: {}
    },
    messages: {
        type: [],
        default: []
    }
})

const User = mongoose.model('User', userSchema)
module.exports = User