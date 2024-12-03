const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    info: {
        type: {},
        required: true
    },
    locations: {
        type: [],
        required: false
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

UserSchema.index({ 'info.name': 'text' }, { name: 'username_index' });
const User = mongoose.model('User', UserSchema)
module.exports = User