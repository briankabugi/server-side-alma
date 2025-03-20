const mongoose = require('mongoose')

const EventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    images: {
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
    public: {
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
    },
    contact: {
        type: {},
        required: true
    }
})

const Event = mongoose.model('Event', EventSchema)
module.exports = Event