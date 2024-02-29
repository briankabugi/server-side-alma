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
    preferences: {
        type: {},
        default: {}
    },
    friends: {
        type: [],
        default: []
    },
    events: {
        type: [],
        default: []
    },
    code: {
        type: String,
        required: true
    }
})

const User = mongoose.model('User', UserSchema)
module.exports = User