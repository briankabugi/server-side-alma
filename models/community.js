const mongoose = require('mongoose')

const CommunitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    openAccess: {
        type: Boolean,
        required: true
    },
    global: {
        type: Boolean,
        required: true
    },
    location: {
        type: {},
        required: true
    },
    logo: {
        type: String,
        required: true
    },
    contact: {
        type: {},
        required: false
    },
    description: {
        type: String,
        required: true
    },
    members: {
        type: [],
        default: []
    },
    blacklist: {
        type: [],
        default: []
    },
    requests: {
        type: [],
        default: []
    },
    blacklist: {
        type: [],
        default: []
    },
    superAdmin:{
        type: String,
        required: true
    },
    admin: {
        type: String,
        required: false
    },
    images: {
        type: [],
        default: []
    },
    messages:{
        type: [],
        default: []
    },
    createdAt: {
        type: String,
        required: true
    },
    popularity: {
        type: Number,
        default: 0
    }
})

const Community = mongoose.model('Community', CommunitySchema)
module.exports = Community