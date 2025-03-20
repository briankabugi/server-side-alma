
// Initialize Backend 
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const { Binary } = require("mongodb")
const passport = require('passport')
const bcrypt = require('bcrypt');
const http = require('http')

const app = express()
const port = process.env.PORT || 3000
const cors = require('cors')
const uuid = require('uuid');
const crypto = require('crypto');

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: "10mb" }))
app.use(passport.initialize())

const jwt = require('jsonwebtoken')

// Connect to Database
mongoose.connect(
    process.env.DATABASE_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
).then(() => {
    console.log('Connected to Mongo')
}).catch((error) => {
    console.log('Error connecting to Mongo: ', error)
})

// Importing Models
const User = require('./models/user')
const Company = require('./models/company')
const Community = require('./models/community')
const Event = require('./models/event')
const Message = require('./models/message')
const Order = require('./models/order')

// Set Up Servers
const app_server = http.createServer(app)

// ImageKit Private Key
const privateKey = 'private_uiQh9bjxEMo+e0EcvmcZQh8/P2E='; //insert your own private key here

app_server.listen(port => {
    console.log('Server Listening on port ', port)
});

app.get('/auth', function (req, res) {
    const token = req.query.token || uuid.v4();
    const expire = req.query.expire || parseInt(Date.now() / 1000) + 2400;
    const privateAPIKey = `${privateKey}`;
    const signature = crypto
        .createHmac('sha1', privateAPIKey)
        .update(token + expire)
        .digest('hex');
    res.status(200);
    res.send({
        token,
        expire,
        signature,
    });
});

// Register User
app.post('/register', async (req, res) => {
    //Extract Parameters
    const userData = req.body
    const code = userData.code

    // Hash the password
    const hashedCode = await bcrypt.hash(code, 10);

    // Create New user Object
    const newUser = new User({ info: userData.info, code: hashedCode })

    //Save to database
    newUser.save().then(() => {
        const token = jwt.sign({ userID: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
        res.status(200).json({ userID: newUser._id, token: token })
    }).catch((error) => {
        console.log('Could not create Account', error)
        res.status(500).json({ message: 'Could not create account' })
    })
});

// Login
app.post('/login', async (req, res) => {
    // Get the email and password from the request body
    const { phone, code } = req.body;

    // Validate the input
    try {
        const user = await User.findOne({ 'info.contact.phone': phone });
        if (user) {
            bcrypt.compare(code, user.code).then(verified => {
                if (verified) {
                    const token = jwt.sign({ userID: user._id }, 'Q&r2k6vhv$h12kl', { expiresIn: '1h' })
                    res.status(200).json({ userID: user._id, token: token, info: user.info, preferences: user.preferences, agent: user.agent })
                } else {
                    res.status(500).json({ message: 'Check password and try again' })
                }
            });
        } else {
            res.status(500).json({ message: 'User Not Found' })
        }
    } catch (error) {
        // Handle any database errors
        res.status(500).json({ message: 'Internal Server error' });
    }
});

// Fetch All Users
app.get('/fetchUsers', async (req, res) => {
    try {
        const users = await User.find({}).select('info')
        res.status(200).json({ users: users })
    } catch (error) {
        res.status(500).message('Internal Server Error')
    }
});

// Search Users by UserName
app.post('/searchUsername', async (req, res) => {
    const { searchTerm, limit } = req.body;
    const limitNumber = Number.isInteger(limit) && limit > 0 ? limit : 10;

    try {
        // Perform a text search using the search term
        const results = await User.find({
            $text: { $search: searchTerm } // This will automatically use the 'text' index
        }).sort({ score: { $meta: 'textScore' } }).limit(limitNumber).select('info');

        res.json(results); // Send the results as JSON
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Nearest Users
app.get('/nearbyUsers', async (req, res) => {
    const { x, y, limit } = req.query;

    try {
        // Find all documents
        const allUsers = await User.find()
            .select('_id info');

        // Calculate distances
        const usersWithDistances = allUsers.map(user => {
            const { latitude, longitude } = user.info.location;
            const R = 6371; // Radius of the Earth in kilometers
            const dLat = (x - latitude) * Math.PI / 180;
            const dLon = (y - longitude) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return { ...user.toObject(), distance };
        });

        // Sort documents by their calculated distances in ascending order
        usersWithDistances.sort((a, b) => a.distance - b.distance);

        // Return the top n documents
        const nearbyUsers = usersWithDistances.slice(0, parseInt(limit));
        res.status(200).json({ nearbyUsers: nearbyUsers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update agent
app.put('/updateAgent/:id', async (req, res) => {
    const agentData = req.body; // The updated Company data

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            try {
                user.agent = agentData;

                // Save the updated User
                await user.save();

                res.status(200).json({ message: 'Saved' })
            } catch (error) {
                res.status(500).json({ error: error.message })
            }

        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Get nearest agents
app.post('/nearbyAgents', async (req, res) => {
    const { x, y, limit, payload } = req.body;

    try {
        const allAgents = await User.find({
            "agent": { $exists: true, $ne: null }
        }).select('_id info agent');

        // Calculate distances
        const agentsWithDistances = allAgents.map(agent => {
            // Skip if 'agent' or 'payload' is missing
            if (!agent.agent || typeof agent.agent.payload === 'undefined') {
                console.error(error.message)
                res.status(500).json({ error: error.message });
                return null;
            }

            const { latitude = 0, longitude = 0 } = agent.info.location || {}; // Fallback to 0 if location is missing
            const R = 6371; // Radius of the Earth in kilometers
            const dLat = (Number(x) - latitude) * Math.PI / 180;
            const dLon = (Number(y) - longitude) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            return { ...agent.toObject(), distance };
        }).filter(agent => agent !== null); // Filter out agents without valid payload

        // Sort documents by their calculated distances in ascending order
        agentsWithDistances.sort((a, b) => a.distance - b.distance);

        // Return the top n documents
        const nearbyAgents = agentsWithDistances.slice(0, parseInt(limit));
        res.status(200).json({ nearbyAgents: nearbyAgents });
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ error: error.message });
    }
});

// Fetch Agent Data
app.get('/fetchAgent', async (req, res) => {
    const { id, x, y } = req.query; // Get parameters from query string

    // Input validation for x, y
    if (isNaN(x) || isNaN(y)) {
        return res.status(400).json({ error: "Invalid coordinates provided." });
    }

    try {
        const agent = await User.findOne({
            "_id": id,
            "agent": { $exists: true, $ne: null }
        }).select('_id info agent');

        if (!agent || !agent.agent || typeof agent.agent.payload === 'undefined') {
            console.error("Agent or payload missing:", agent);
            return res.status(500).json({ error: "Agent data or payload is missing." });
        }

        const { latitude = 0, longitude = 0 } = agent.info.location || {}; // Fallback to 0 if location is missing
        const R = 6371; // Radius of the Earth in kilometers

        const parsedLat = Number(x);
        const parsedLon = Number(y);

        const dLat = (parsedLat - latitude) * Math.PI / 180;
        const dLon = (parsedLon - longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(latitude * Math.PI / 180) * Math.cos(parsedLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const agentData = { ...agent.toObject(), distance };

        return res.status(200).json({ agentData });
    } catch (error) {
        console.error("Error fetching agent data:", error);
        return res.status(500).json({ error: error.message });
    }
});

// Find Single Entity
app.get('/findEntity', async (req, res) => {
    const { id, isUser, productIDs } = req.query;

    try {
        let entity;

        // Find the entity based on user or company
        entity = isUser === 'true' ? await User.findById(id) : await Company.findById(id);

        if (entity) {
            // If productIDs are provided, filter the products accordingly
            if (productIDs) {
                const filteredCategories = {};

                // Iterate over product categories, subcategories, and products
                for (const category of entity.product_categories) {
                    const { name: categoryName, subCategories } = category;

                    // For each subcategory, we map it to a structure and filter based on product IDs
                    for (const subCategory of subCategories) {
                        const { name: subCategoryName, products } = subCategory;

                        // Filter products that match the provided product IDs
                        const filteredProducts = products.filter(product =>
                            productIDs.includes(product.id)
                        );

                        // If there are matching products, add them to the filtered categories
                        if (filteredProducts.length > 0) {
                            if (!filteredCategories[categoryName]) {
                                filteredCategories[categoryName] = {};
                            }
                            filteredCategories[categoryName][subCategoryName] = filteredProducts;
                        }
                    }
                }

                // Send the response with filtered products
                return res.status(200).json({ info: entity.info, products: filteredCategories });
            }

            // If no product IDs are provided, send the response with only entity info
            return res.status(200).json({ info: entity.info });
        }

        console.log('Entity not found');
        res.status(404).json({ message: 'Entity not found' });
    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Find Multiple Entities
app.post('/findEntities', async (req, res) => {
    const { entities } = req.body;

    if (!entities || !Array.isArray(entities)) {
        return res.status(400).json({ message: 'Invalid or missing entities array' });
    }

    try {
        const userIds = entities.filter(entity => entity.user).map(entity => entity.id);
        const companyIds = entities.filter(entity => !entity.user).map(entity => entity.id);

        const results = [];

        let users = [];
        if (userIds.length > 0) {
            users = await User.find({ _id: { $in: userIds } }).lean();
        }

        let companies = [];
        if (companyIds.length > 0) {
            companies = await Company.find({ _id: { $in: companyIds } }).lean();
        }

        const userMap = users.reduce((map, user) => {
            map[user._id] = user;
            return map;
        }, {});

        const companyMap = companies.reduce((map, company) => {
            map[company._id] = company;
            return map;
        }, {});

        entities.forEach(entity => {
            let entityData = null;
            if (entity.user) {
                entityData = userMap[entity.id];
            } else {
                entityData = companyMap[entity.id];
            }

            if (entityData) {
                results.push({
                    id: entity.id,
                    user: entity.user,
                    info: entityData.info,
                });
            } else {
                results.push({
                    id: entity.id,
                    user: entity.user,
                    message: 'Entity not found',
                });
            }
        });

        res.status(200).json({ results });

    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// Update User Info
app.put('/updateUserInfo/:id', async (req, res) => {
    const updatedInfo = req.body; // The updated User data

    try {
        // Using findByIdAndUpdate with $set to update specific fields
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { info: updatedInfo } }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            res.status(200).json({ message: 'User info updated' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//Update Locations
app.put('/updateUserLocations/:id', async (req, res) => {
    const locations = req.body; // The updated Company data

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            try {
                user.locations = locations;

                // Save the updated User
                await user.save();

                res.status(200).json({ message: 'Saved' })
            } catch (error) {
                res.status(500).json({ error: error.message })
            }

        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Update User
app.put('/updatePreferences', async (req, res) => {
    const { id, state, preferences } = req.query;
    try {
        const entity = state ? await User.findById(id) : Company.findById(id)

        if (!entity) {
            return res.status(404).json({ message: 'User / Company not found' });
        } else {
            try {
                entity.preferences = preferences;

                // Save the updated User
                await entity.save();

                res.status(200).json({ message: 'Saved' })
            } catch (error) {
                res.status(500).json({ error: error.message })
            }
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Adding Friends
app.put('/addFriends', async (req, res) => {
    const id1 = req.body.id1;
    const id2 = req.body.id2;
    const state1 = req.body.state1
    const state2 = req.body.state2

    try {
        // Fetching entities
        const entity1 = state1 ? await User.findById(id1) : await Company.findById(id1);
        const entity2 = state2 ? await User.findById(id2) : await Company.findById(id2);

        if (!entity1 || !entity2) {
            return res.status(404).send({ message: 'User / Company not found' });
        }

        // Update friends field
        entity1.friends.push(id2);
        entity2.friends.push(id1);

        // Save the updated users
        await entity1.save();
        await entity2.save();

        res.send({ message: 'Success' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// Removing Friends
app.put('/removeFriends', async (req, res) => {
    const id1 = req.body.id1;
    const id2 = req.body.id2;
    const state1 = req.body.state1
    const state2 = req.body.state2

    try {
        // Fetching entities
        const entity1 = state1 ? await User.findById(id1) : await Company.findById(id1);
        const entity2 = state2 ? await User.findById(id2) : await Company.findById(id2);

        if (!entity1 || !entity2) {
            return res.status(404).send({ message: 'User / Company not found' });
        }

        // Update friends field
        const index1 = entity1.friends.indexOf(id2);
        const index2 = entity2.friends.indexOf(id1);
        if (index1 !== -1) {
            entity1.friends.splice(index1, 1);
        }
        if (index2 !== -1) {
            entity2.friends.splice(index2, 1);
        }

        // Save the updated users
        await entity1.save();
        await entity2.save();

        res.send({ message: 'Success' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// Delete Agent
app.delete('/deleteAgent/:id', async (req, res) => {
    const userID = req.params.id
    try {
        await User.updateOne({ _id: userID }, { $unset: { agent: "" } });
        res.status(200).json({ message: 'Agent Account Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error Deleting Agent Account' });
    }
});

// Delete User 
app.delete('/deleteUser/:id', async (req, res) => {
    try {
        await User.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Account Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});

// Launch Company
app.post('/createCompany', async (req, res) => {
    try {
        // Extract Parameters
        const newCompany = req.body;

        newCompany.code = await bcrypt.hash(newCompany.code, 5);

        // Create New Company Object
        const createdCompany = new Company(newCompany);

        // Save to database
        await createdCompany.save();

        res.status(200).json({ message: 'Launch Successful' });
    } catch (error) {
        console.log('Could not create Company', error);
        res.status(500).json({ message: error.message });
    }
});

// Find Company
app.get('/findCompanies/:userId', async (req, res) => {
    try {
        // Get the user ID from the params
        const userId = req.params.userId;

        // Find the Companies created by that user ID
        const companies = await Company.find({ 'info.created_by': userId })
            .select('_id info friends preferences product_categories reviews statistics communities events');

        // Send the response as JSON
        res.status(200).json({ companies: companies });
    } catch (error) {
        // Handle any errors
        res.status(500).json({ message: error.message });
    }
});

// Update Company Info
app.put('/updateCompanyInfo/:id', async (req, res) => {
    const info = req.body; // The updated Company data
    const updateFields = {};

    // Iterate through the fields in the new data and add them to the update object
    for (const key in info) {
        if (info.hasOwnProperty(key)) {
            updateFields[`info.${key}`] = info[key];
        }
    }

    try {
        // Use findByIdAndUpdate with $set for efficient partial updates
        const updatedCompany = await Company.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields }, // Update only the specified fields
        );

        if (!updatedCompany) {
            // Return 404 error if the company was not found
            return res.status(404).json({ error: 'Company not found' });
        }

        // Return a success response
        res.json({ message: 'Info Updated' });
    } catch (error) {
        console.error('Error Updating Info:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update Company Data
app.put('/updateCompanyData/:id', async (req, res) => {
    const updatedData = req.body;
    const id = req.params.id;

    try {
        const updateFields = Object.keys(updatedData).reduce((acc, key) => {
            const value = updatedData[key];
            const parts = key.split('.');
            const lastPart = parts[parts.length - 1];

            if (value === null) {
                // If the value is null, we need to delete the key (or array element)
                if (Number(lastPart) >= 0) {
                    // It's an array index, so use $pull to remove the element
                    const path = parts.slice(0, -1).join('.');
                    acc[path] = acc[path] || { $pull: {} };
                    acc[path].$pull = { [lastPart]: 1 };  // Correctly remove element at index
                } else {
                    // It's a key in an object, so use $unset to delete the key
                    acc[key] = "";  // This will be interpreted as $unset by MongoDB
                }
            } else {
                // If the value is not null, use $set to update the key
                acc[key] = value;  // This will be interpreted as $set by MongoDB
            }

            return acc;
        }, {});

        const updatedCompany = await Company.findByIdAndUpdate(
            id,
            updateFields
        );

        if (!updatedCompany) {
            // Return 404 error if the company was not found
            return res.status(404).json({ error: 'Company not found' });
        }

        // Return a success response with the updated company data
        res.status(200).json({ message: 'Data Updated' });
    } catch (error) {
        console.error('Error Updating Data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Fetch Company Data
app.get('/fetchProducts/:id', async (req, res) => {
    const id = req.params.id

    try {
        const company = await Company.findById(id).select('product_categories');

        if (!company) {
            res.status(404).json({ error: 'Company not found' });
        } else {
            const productCategories = company.product_categories
            res.status(200).json({ categories: productCategories })
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Popular Companies
app.get('/popularCompanies', (req, res) => {
    const { x, y, limit } = req.query;

    // Query the database for the 10 most popular documents based on popularity
    Company.find()
        .select('_id info reviews statistics communities')
        .sort({ 'statistics.popularity': -1 })
        .limit(parseInt(limit))
        .then(documents => {
            const documentsWithDistances = documents.map(doc => {
                const { latitude, longitude } = doc.info.location;
                const R = 6371; // Radius of the Earth in kilometers
                const dLat = (parseFloat(x) - latitude) * Math.PI / 180;
                const dLon = (parseFloat(y) - longitude) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;
                return { ...doc.toObject(), distance };
            });
            res.status(200).json(documentsWithDistances);
        })
        .catch(error => {
            console.error('Error Fetching Popular',error.message)
            res.status(500).json({ error: error.message });
        });
});

// Get Nearest Companies
app.get('/nearbyCompanies', async (req, res) => {
    const { filter, x, y, limit } = req.query;

    let query = {};

    if (filter && filter.length > 0) {
        query._id = { $nin: filter };
    }

    try {
        // Find all documents
        const allDocs = await Company.find(query)
            .select('_id info reviews statistics communities');

        // Calculate distances
        const docsWithDistances = allDocs.map(doc => {
            const { latitude, longitude } = doc.info.location;
            const R = 6371; // Radius of the Earth in kilometers
            const dLat = (x - latitude) * Math.PI / 180;
            const dLon = (y - longitude) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return { ...doc.toObject(), distance };
        });

        // Sort documents by their calculated distances in ascending order
        docsWithDistances.sort((a, b) => a.distance - b.distance);

        // Return the top n documents
        const nearestDocs = docsWithDistances.slice(0, limit);
        res.json(nearestDocs);
    } catch (error) {
        console.error('Error Fetching Nearby',error.message)
        res.status(500).json({ error: error.message });
    }
});

// Delete Company
app.delete('/deleteCompany/:id', async (req, res) => {
    try {
        await Company.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Company Deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});

// Create Community
app.post('/createCommunity', async (req, res) => {
    //Extract Parameters
    const newCommunity = req.body

    try {
        // Create New user Object
        const createdCommunity = new Community(newCommunity)

        //Save to database
        await createdCommunity.save().then(() => {
            res.status(200).json({ message: 'Community Created' })
        }).catch((error) => {
            res.status(500).json({ error: error.message })
            console.error(error.message)
        })
    } catch (error) {
        response.status(500).json({ message: error.message })
        console.error(error.message)
    }
});

// Find Community
app.get('/findCommunity/:id', async (req, res) => {
    try {
        const community = await Community.findById(req.params.id)
        if (community) {
            res.status(200).json({ community: community })
        } else {
            res.status(400).message('Community Not Found')
        }
    } catch (error) {
        res.status(500).message('Internal Server Error')
    }
});

// Fetch Communities
app.get('/fetchCommunities', async (req, res) => {
    const { x, y, limit } = req.query;

    try {
        // Find all documents
        const AreaDocs = await Community.find({ 'global': false });
        const GlobalDocs = await Community.find({ 'global': true });

        // Calculate distances
        const AreaDocsWithDistances = AreaDocs.map(doc => {
            const { latitude, longitude } = doc.location; // Accessing the location directly as a dictionary
            const R = 6371;
            const dLat = (latitude - x) * Math.PI / 180; // Corrected latitude - x
            const dLon = (longitude - y) * Math.PI / 180; // Corrected longitude - y
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return { ...doc.toObject(), average_distance: distance };
        });

        // Sort documents by their calculated distances in ascending order
        const SortedAreaDocs = AreaDocsWithDistances.sort((a, b) => a.average_distance - b.average_distance);
        const SortedGlobalDocs = GlobalDocs.sort((a, b) => b.popularity - a.popularity);

        // Return the top n documents
        const nearestByArea = SortedAreaDocs.slice(0, limit);
        const nearestByPopularity = SortedGlobalDocs.slice(0, limit);

        // Shuffle Results
        const communities = nearestByArea.concat(nearestByPopularity);
        res.status(200).json(communities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manage Community Members
app.post('/updateCommunityMembers', async (req, res) => {
    const { communityID, actionID, user, action } = req.body;

    try {
        // Find the community by ID
        const community = await Community.findById(communityID);
        if (!community) {
            return res.status(404).json({ message: 'Community not found' });
        }

        // Check if the requester is in the blacklist
        const isBlacklisted = community.blacklist.some(
            blacklistEntry => blacklistEntry.id === actionID && blacklistEntry.user === user
        );

        // Handle different actions
        switch (action) {
            case 'request':
                if (isBlacklisted) {
                    return res.status(403).json({ message: 'Sorry. We cannot add you to this community' });
                }
                // Add the requester to the requests list
                const requestExists = community.requests.some(
                    request => request.id === actionID
                );
                if (requestExists) {
                    return res.status(400).json({ message: 'It appears you already requested to join this community' });
                }

                community.requests.push({ id: actionID, user });
                break;

            case 'deny':
                // Remove the requester from the requests list
                community.requests = community.requests.filter(
                    request => request.id !== actionID
                );
                break;

            case 'accept':
                // Check if the requester is in the requests list
                const requestIndex = community.requests.findIndex(
                    request => request.id === actionID
                );
                if (requestIndex === -1) {
                    return res.status(400).json({ message: 'Please ask the user/company to send a request first' });
                }

                // Add the requester to the members list
                const acceptedRequest = community.requests.splice(requestIndex, 1)[0];
                community.members.push({ id: actionID, user: acceptedRequest.user });
                break;

            case 'remove':
                // Remove the requester from the members list
                const memberIndex = community.members.findIndex(
                    member => member.id === actionID
                );
                if (memberIndex === -1) {
                    return res.status(400).json({ message: 'User/Company not found in members' });
                }

                // Remove the member from the members list
                community.members.splice(memberIndex, 1);
                break;
            case 'addBlacklist':
                if (isBlacklisted) {
                    return res.status(400).json({ message: user ? 'User already in blacklist' : 'Company already in blacklist' });
                }

                community.blacklist.push({ id: actionID, user });
                break;

            case 'removeBlacklist':
                if (!isBlacklisted) {
                    return res.status(400).json({ message: user ? 'User not in blacklist' : 'Company not in blacklist' });
                }
                // Remove the requester from the blacklist
                community.blacklist = community.blacklist.filter(
                    blacklistEntry => blacklistEntry.id !== actionID || blacklistEntry.user !== user
                );
                break;

            default:
                return res.status(400).json({ message: 'Invalid action' });
        }

        // Save the updated community document
        await community.save();

        return res.status(200).json({ message: 'Request processed successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});


// Delete Community
app.delete('/deleteCommunity', async (req, res) => {
    const { communityID } = req.body;

    // Validate that communityId is provided
    if (!communityID) {
        return res.status(400).json({ error: 'communityID is required' });
    }

    // Check if the provided ID is a valid MongoDB ObjectId format (even if it's a string)
    if (!mongoose.Types.ObjectId.isValid(communityID)) {
        return res.status(400).json({ error: 'Invalid communityID format' });
    }

    try {
        // Find and delete the community by ID
        const community = await Community.findByIdAndDelete(communityID);

        // If the community is not found
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        // Respond with success message
        res.status(200).json({ message: 'Community deleted successfully' });
    } catch (err) {
        console.error(err);
        // Handle server errors
        res.status(500).json({ error: 'An error occurred while deleting the community' });
    }
});

// Update Community
app.put('/updateCommunityInfo', async (req, res) => {
    const { updatedInfo } = req.body; // The updated Company data

    try {
        await Community.updateOne(
            { _id: updatedInfo._id },
            { $set: updatedInfo }
        ).then(
            res.status(200).json({ message: 'Community Updated' })
        ).catch(
            (error) => res.status(500).json({ error: error.message })
        )
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
});

// Create Event
app.post('/createEvent', async (req, res) => {
    //Extract Parameters
    const newEvent = req.body

    try {
        // Create New user Object
        const createdEvent = await new Event(newEvent)

        //Save to database
        createdEvent.save().then(() => {
            res.status(200).json({ message: 'Event Created' })
        }).catch((error) => {
            res.status(500).json({ message: error.message })
            console.error(error.message)
        })
    } catch (error) {
        response.status(500).json({ message: error.message })
        console.error(error.message)
    }
});

app.get('/findEvent/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (event) {
            return res.status(200).json(event);
        } else {
            return res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Fetch Events
app.get('/fetchEvents', async (req, res) => {
    const { x, y, limit } = req.query;
    try {
        // Find all documents
        const Events = await Event.find();

        // Calculate distances
        const EventsWithDistances = Events.map(doc => {
            const { latitude, longitude } = doc.location;
            const R = 6371;
            const dLat = (latitude - x) * Math.PI / 180; // Corrected latitude - x
            const dLon = (longitude - y) * Math.PI / 180; // Corrected longitude - y
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(x * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return { ...doc.toObject(), distance };
        });

        const SortedEvents = EventsWithDistances.sort((a, b) => a.distance - b.distance);
        const nearbyEvents = SortedEvents.slice(0, limit)

        res.status(200).json(nearbyEvents)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
});

// Update Community
app.put('/updateEventInfo/:id', async (req, res) => {
    const { updatedInfo } = req.body; // The updated Company data

    try {
        await Event.updateOne(
            { _id: req.params.id },
            { $set: updatedInfo }
        ).then(
            res.status(200).json({ message: 'Event Updated' })
        ).catch(
            (error) => res.status(500).json({ error: error.message })
        )
    } catch (error) {
        console.error('Error Updating Event; ', error.message)
        res.status(500).json({ error: error.message })
    }
});

// Manage Community Members
app.post('/updateEventList', async (req, res) => {
    const { eventID, actionID, user, action } = req.body;

    try {
        // Find the community by ID
        const event = await Event.findById(eventID);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if the requester is in the blacklist
        const isBlacklisted = event.blacklist.some(
            blacklistEntry => blacklistEntry.id === actionID && blacklistEntry.user === user
        );

        // Handle different actions
        switch (action) {
            case 'request':
                if (isBlacklisted) {
                    return res.status(403).json({ message: 'Sorry. We cannot add you to this event' });
                }
                // Add the requester to the requests list
                const requestExists = event.requests.some(
                    request => request.id === actionID
                );
                if (requestExists) {
                    return res.status(400).json({ message: 'It appears you already requested to attend this event' });
                }

                event.requests.push({ id: actionID, user });
                break;

            case 'deny':
                // Remove the requester from the requests list
                event.requests = event.requests.filter(
                    request => request.id !== actionID
                );
                break;

            case 'accept':
                // Check if the requester is in the requests list
                const requestIndex = event.requests.findIndex(
                    request => request.id === actionID
                );
                if (requestIndex === -1) {
                    return res.status(400).json({ message: 'Please ask the user/company to send a request first' });
                }

                // Add the requester to the members list
                const acceptedRequest = event.requests.splice(requestIndex, 1)[0];
                event.attending.push({ id: actionID, user: acceptedRequest.user });
                break;

            case 'remove':
                // Remove the requester from the members list
                const attenderIndex = event.attending.findIndex(
                    attender => attender.id === actionID
                );
                if (attenderIndex === -1) {
                    return res.status(400).json({ message: 'User/Company not found in attending list' });
                }

                // Remove the member from the members list
                event.attending.splice(attenderIndex, 1);
                break;
            case 'addBlacklist':
                if (isBlacklisted) {
                    return res.status(400).json({ message: user ? 'User already in blacklist' : 'Company already in blacklist' });
                }

                event.blacklist.push({ id: actionID, user });
                break;

            case 'removeBlacklist':
                if (!isBlacklisted) {
                    return res.status(400).json({ message: user ? 'User not in blacklist' : 'Company not in blacklist' });
                }
                // Remove the requester from the blacklist
                event.blacklist = event.blacklist.filter(
                    blacklistEntry => blacklistEntry.id !== actionID || blacklistEntry.user !== user
                );
                break;

            default:
                return res.status(400).json({ message: 'Invalid action' });
        }

        // Save the updated community document
        await event.save();

        return res.status(200).json({ message: 'Request processed successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Delete Event
app.delete('/deleteEvent', async (req, res) => {
    const { eventID } = req.body
    try {
        await Event.deleteOne({ _id: eventID });
        res.status(200).json({ message: 'Event Deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});

// Search Functionality
app.get('/search', async (req, res) => {
    try {
        const { query, CompanyLimit, productLimit, userLimit } = req.query;

        // Perform the search query for Companies
        const companies = await Company.find({
            $or: [
                { 'info.name': { $regex: query, $options: 'i' } },
                { 'info.category': { $regex: query, $options: 'i' } },
            ],
        }).select('_id info reviews statistics communities').limit(Number(CompanyLimit));

        // Perform the search query for products using aggregation
        const products = await Company.aggregate([
            { $unwind: '$product_categories' },
            { $unwind: '$product_categories.subCategories' },
            { $unwind: '$product_categories.subCategories.products' },
            { $match: { 'product_categories.subCategories.products.name': { $regex: query, $options: 'i' } } },
            {
                $group: {
                    _id: null,
                    products: { $push: '$product_categories.subCategories.products' },
                },
            },
            {
                $project: {
                    _id: 0,
                    products: 1,
                },
            },
        ]);

        // Perform the search query for users
        const users = await User.find({
            $or: [
                { 'info.name': { $regex: query, $options: 'i' } }
            ],
        }).select('_id info').limit(Number(userLimit));

        let productResponse = [];
        if (products.length > 0) {
            productResponse = products[0].products.slice(0, Number(productLimit));
        }

        res.status(200).json({ companies: companies, products: productResponse, users: users });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Fetch User Messages
app.get('/fetchMessages', async (req, res) => {
    try {
        const { id } = req.query;

        // Fetch all messages sent or received by the user
        const messages = await Message.find({
            $or: [{ 'sender.id': id }, { 'receiver.id': id }]
        });

        res.status(200).json({ messages: messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Message
app.post('/addMessage', async (req, res) => {
    const { sender, receiver, content, createdAt, content_type } = req.body;

    const newMessage = new Message({
        sender,
        receiver,
        content,
        createdAt,
        new: true,
        content_type
    });

    try {
        await newMessage.save();
        res.status(200).json({ message: 'Message Sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/openMessage/:id', async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { $unset: { new: '' } }
        );

        if (!message) {
            res.status(404).send({ message: 'Message not found' });
        }

        res.status(200).send({ message: message })
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

app.post('/unreadMessages', async (req, res) => {
    try {
        const ids = req.body.ids;
        const messages = await Message.find({
            new: true,
            'receiver.id': { $in: ids }
        });

        const result = ids.map(id => {
            const userMessages = messages.filter(msg => msg.receiver.id === id);
            const chats = new Set(userMessages.map(msg => msg.sender.id));
            if (chats.size > 0) {
                return {
                    id: id,
                    chats: chats.size,
                    messages: userMessages.length
                };
            } else {
                return {}
            }
        });

        res.status(200).json({ result: result });
    } catch (error) {
        console.error('Error fetching unread messages:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Create Order
app.post('/createOrder', async (req, res) => {
    //Extract Parameters
    const newOrder = req.body

    try {
        // Create New user Object
        const createdOrder = await new Order(newOrder)

        //Save to database
        createdOrder.save().then(() => {
            res.status(200).json({ message: 'Order Created' })
        }).catch((error) => {
            res.status(500).json({ message: error.message })
            console.error(error.message)
        })
    } catch (error) {
        response.status(500).json({ message: error.message })
        console.error(error.message)
    }
});

app.post('/updateOrder', async (req, res) => {
    const { orderID, updatedOrder } = req.body
    try {
        await Order.updateOne(
            { _id: orderID },
            { $set: updatedOrder }
        ).then(
            res.status(200).json({ message: 'Order Updated' })
        ).catch(
            (error) => res.status(500).json({ error: error.message })
        )
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
});

// Fetch Orders
app.get('/fetchOrders', async (req, res) => {
    const ids = req.query.ids; // Retrieve the ids from query parameters

    try {
        const conditions = [
            { buyer: { $in: ids } },
            ...ids.map(id => ({ [`enterprises.${id}`]: { $exists: true } }))
        ];

        const orders = await Order.find({ $or: conditions });

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Fetch Agent Orders
app.get('/fetchAgentOrders', async (req, res) => {
    const id = req.query.id; // Retrieve the ids from query parameters

    try {

        const orders = await Order.find({ 'agent': id });

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Manage Order Status
app.post('/updateOrderStatus', async (req, res) => {
    const { orderID, enterpriseID, newStatus } = req.body;

    const statuses = ['Pending', 'Packaging', 'Ready To Deliver', 'Waiting For Pickup', 'In Delivery', 'Completed', 'Cancelled'];

    if (!orderID || !newStatus) {
        return res.status(504).json({ message: 'Insufficient Parameters' });
    }

    try {
        // Find the order by ID
        const order = await Order.findById(orderID);

        if (!order) {
            console.error('Order not Found');
            return res.status(404).json({ message: 'Order not found' });
        }

        if (enterpriseID) {
            if (typeof enterpriseID === 'string') {
                const enterprise = order.enterprises.get(enterpriseID);
                if (!enterprise) {
                    console.error('Enterprise not Found');
                    return res.status(404).json({ message: 'Enterprise not found' });
                }
                enterprise.status = newStatus;
            } else if (Array.isArray(enterpriseID)) {
                for (const id of enterpriseID) {
                    console.log('Received ID; ', enterpriseID)
                    console.log('Loop ID; ', id)
                    console.log('Enterprise Keys; ', order.enterprises.keys())
                    const enterprise = order.enterprises.get(id);
                    if (!enterprise) {
                        console.error('Enterprise not Found');
                        return res.status(404).json({ message: 'Enterprise not found' });
                    }
                    enterprise.status = newStatus;
                }
            }
        } else {
            order.status = newStatus;
        }

        console.log('Order Status 1; ', order.status)

        // Compute Overall Status
        let floatingIndex = 6;
        const currentIndex = statuses.findIndex((item) => item === order.status);
        order.enterprises.forEach((entity) => {
            console.log('Our Entity: ', entity);
            console.log('Our Status: ', entity.status);

            const index = statuses.indexOf(entity.status);
            if (index < floatingIndex) {
                floatingIndex = index;
            }
        });

        console.log('#OUT Our Floating Index; ', floatingIndex)
        console.log('#OUT Our Current Index; ', currentIndex)

        if (floatingIndex > currentIndex) {
            console.log('#IN Our Floating Index; ', floatingIndex)
            console.log('#IN Our Current Index; ', currentIndex)
            if (floatingIndex === 2) {
                for (const key of order.enterprises.keys()) {
                    console.log('Second Entity Key; ', key)
                    order.enterprises.get(key).status = 'Waiting For Pickup';
                }
                order.status = 'Waiting For Pickup';
            } else {
                order.status = statuses[floatingIndex];
            }
        }

        console.log('Order Status 2; ', order.status)

        // Save the updated order
        await order.save();

        return res.status(200).json({ message: 'Order Status Updated' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Update Order
app.put('/cancelOrder/:id', async (req, res) => {

    const { orderID, enterpriseID } = req.body

    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        } else {
            try {
                order.status = 'Cancelled'

                // Save the updated User
                await order.save();

                res.status(200).json({ message: 'Order Cancelled' })
            } catch (error) {
                res.status(500).json({ error: error.message })
            }
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Delete Order
app.delete('/deleteOrder', async (req, res) => {
    const { orderID } = req.body
    try {
        await Order.deleteOne({ _id: orderID });
        res.status(200).json({ message: 'Order Deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});




