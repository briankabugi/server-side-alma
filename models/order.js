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
            }],
            code: {
                type: String,
                required: false
            }
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
    codes: {
        type: Map,
        of: new mongoose.Schema({
            source: {
                type: String,
                required: true
            },
            recipient: [{
                type: String,
                required: true
            }],
            value: {
                type: String,
                required: true
            },
            scanned: {
                type: Boolean,
                default: false
            }
        }),
        required: false
    },
    bids: {
        type: [],
        required: false
    },
    location: {
        type: {},
        required: true
    },
    disputes: {
       type: Map,
        of: new mongoose.Schema({
            source: {
                type: String,
                required: true
            },
            recipient: [{
                type: String,
                required: true
            }],
            cause: {
                type: String,
                required: true
            },
            solution: {
                type: String,
                required: true
            }
        }),
        required: false
    }
})

const Order = mongoose.model('Order', OrderSchema)
module.exports = Order