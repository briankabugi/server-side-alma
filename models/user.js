const mongoose = require('mongoose')
const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    contact: {
        type: {},
        required: true
    },
    location: {
        type: {},
        required: true
    },
    image: {
        type: String,
        default: ''
    },
    enterprises: {
        type: [String],
        default: []
    }
})

const User = mongoose.model('User', userSchema)
module.exports = User