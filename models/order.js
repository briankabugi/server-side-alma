const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
    buyer: {
        type: {},
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    enterprises: {
        type: Object,
        required: true
    },
    stage: {
        type: Number,
        default: 1
    },
    agent: {
        type: String,
        required: false
    },
    location: {
        type: {},
        required: true
    }
})

const Order = mongoose.model('Order', OrderSchema)
module.exports = Order