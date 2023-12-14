const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
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
    },
    friends: {
        type: [],
        default: []
    }
})

const User = mongoose.model('User', UserSchema)
module.exports = User