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
        type: Map,
        of: new mongoose.Schema({
            status: {
                type: String,
                default: 'Pending'
            },
            products: [{
                type: String
            }]
        })
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