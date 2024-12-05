const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    info: {
        type: {},
        required: true
    },
    preferences: {
        type: {},
        default: {}
    },
    socials: {
        type: [],
        default: []
    },
    code: {
        type: String,
        required: true
    },
    agent: {
        type: {},
        required: false
    }
})

UserSchema.index({ 'info.name': 'text' }, { name: 'username_index' });
const User = mongoose.model('User', UserSchema)
module.exports = User