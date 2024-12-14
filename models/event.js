const mongoose = require('mongoose')

const EventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    posters: {
        type: [],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    dates: {
        type: [[Date]],
        required: true
    },
    location: {
        type: {},
        required: true
    },
    organizer: {
        type: {},
        required: true
    },
    attending: {
        type: [],
        default: []
    },
    openAccess: {
        type: Boolean,
        required: true
    },
    online: {
        type: Boolean,
        required: true
    },
    link: {
        type: String,
        required: false
    },
    requests: {
        type: [],
        default: []
    },
    blacklist: {
        type: [],
        default: []
    }
})

const Event = mongoose.model('Event', EventSchema)
module.exports = Event