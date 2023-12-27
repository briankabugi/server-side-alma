const mongoose = require('mongoose')

const CompanySchema = new mongoose.Schema({
    info: {
        type: {},
        required: true
    },
	employees: {
        type: [],
        default: []
    },
    customers: {
        type: [],
        default: []
    },
    product_categories : {
        type: [],
        default: []
    },
    sales: {
        type: [],
        default: []
    },
    messages: {
        type: [],
        default: []
    },
    reviews: {
        type: [],
        default: []
    },
    statistics: {
        type : {},
        default: {}
    },
    communities: {
        type: [],
        default: []
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

const Company = mongoose.model('Company', CompanySchema)
module.exports = Company