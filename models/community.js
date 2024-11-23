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
    radius: {
        type: String,
        required: false
    },
    location: {
        type: String,
        required: false
    },
    logo: {
        type: String,
        required: true
    },
    contact: {
        type: {},
        required: true
    },
    description: {
        type: String,
        required: true
    },
    members: {
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
    }
})
 
const Community = mongoose.model('Community', CommunitySchema)
module.exports = Community