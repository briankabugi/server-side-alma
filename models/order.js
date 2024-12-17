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
    status: {
        type: String,
        default: 'Pending'
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