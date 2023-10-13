
// Initialize Backend
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const OpenAI = require('openai')

const app = express()
const port = process.env.PORT
const cors = require('cors')
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: "10mb" }))
app.use(passport.initialize())


const jwt = require('jsonwebtoken')

// Connect to Database
mongoose.connect(
    'mongodb+srv://corporationlighthouse:JUQfQlkkVeSAOOWF@cluster0.mojqd5l.mongodb.net/',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
).then(() => {
    console.log('Connected to Mongo')
}).catch((error) => {
    console.log('Error connecting to Mongo: ', error)
})

// Listen for port
app.listen(port, () => {
    console.log('Server running on port: ', port)
})


// Registration Endpoint

const User = require('./models/user')

app.post('/register', (req, res) => {
    //Extract Parameters
    const { info } = req.body

    // Create New user Object
    const newUser = new User({ info })

    //Save to database
    newUser.save().then(() => {
        const token = jwt.sign({ userId: newUser._id }, 'Q&r2k6vhv$h12kl', { expiresIn: '1h' })
        res.status(200).json({ userID:  newUser._id, token: token })
    }).catch((error) => {
        console.log('Could not create Account', error)
        res.status(500).json({ message: 'Could not create account' })
    })
})

// Login Endpoint
app.post('/login', async (req, res) => {
    // Get the email and password from the request body
    const { phone, password } = req.body;

    // Validate the input
    try {
        const user = await User.findOne({ 'info.contact.phone1': phone });
        if (user) {
            if (user.info.password === password) { 
                const token = jwt.sign({ userId: user._id }, 'Q&r2k6vhv$h12kl', { expiresIn: '1h' })
                res.status(200).json({ id: 1, userID: user._id, token: token, info: user.info, messages: user.messages, enterprises: user.enterprises, preferences: user.preferences })
            } else {
                res.status(200).json({ id: 2, message: `Invalid Password for ${user.info.name}` })
            }
        } else {
            res.status(200).json({ id: 3, message: 'User Not Found' })
        }
    } catch (error) {
        // Handle any database errors
        res.status(500).json({ message: 'Server error' });
    }
});

// Find User
app.get('/findUser/:userId', async (req, res) => {
    try {
        // Get the user ID from the params
        const userId = req.params.userId;

        // Find the enterprises created by that user ID
        const user = await User.findOne({ _id: userId });

        // Send the response as JSON
        res.status(200).json({ info: user.info});
    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Update User
app.put('/updateUser/:id', async (req, res) => {
    const { name, image, email, phone } = req.body; // The updated enterprise data

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            user.name = name;
            user.image = image;
            user.phone = phone;
            user.email = email
        }

        // Save the updated enterprise
        await user.save();

        return res.status(200).json({})
    } catch (error) {
        console.error('Error updating user', error);
        return res.status(500).json({ error: 'We were unable to update your details at the moment' });
    } 2354
})

// Delete User 
app.delete('/deleteUser/:id', async (req, res) => {
    try {
        await User.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Goodbye. See you again soon' });
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});

// Launch EnterPrise Endpoint

const Enterprise = require('./models/enterprise')

app.post('/createEnterprise', async (req, res) => {
    //Extract Parameters
    const newEnterprise = req.body

    // Create New user Object
    const createdEnterprise = await new Enterprise(newEnterprise)
    
    //Save to database
    createdEnterprise.save().then(() => {
        res.status(200).json({ message: 'Your Enterprise was created successfully' })
    }).catch((error) => {
        console.log('Could not create Enterprise', error)
        res.status(500).json({ message: 'Could not create enterprise' })
    })
})

// Find Enterprise Endpoint
app.get('/findEnterprise/:userId', async (req, res) => {
    try {
        // Get the user ID from the params
        const userId = req.params.userId;

        // Find the enterprises created by that user ID
        const enterprises = await Enterprise.find({ createdBy: userId });

        // Send the response as JSON
        res.status(200).json(enterprises);
    } catch (error) {
        // Handle any errors
        res.status(500).json({message: error.message});
    }
});

// Locate Enterprise Endpoint 
app.get('/locateEnterprise/:name', async (req, res) => {
    try {
        // Get the user ID from the params
        const name = req.params.name;

        // Find the enterprises created by that user ID
        const enterprise = await Enterprise.findOne({ name: name });

        // Send the response as JSON
        res.status(200).json(enterprise);
    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Update Enterprise Info
app.put('/updateEnterpriseInfo', async (req, res) => {
    const { id, name, category, email, phone, placeholder, location, longitude, latitude } = req.body; // The updated enterprise data

    try {
        const enterprise = await Enterprise.findById(id);

        if (!enterprise) {
            return res.status(404).json({ error: 'Enterprise not found' });
        }

        // Update the enterprise with the new data
        enterprise.name = name;
        enterprise.category = category;
        enterprise.email = email;
        enterprise.phone = phone
        enterprise.placeholder = placeholder
        enterprise.location = location
        enterprise.longitude = longitude
        enterprise.latitude = latitude
        // Update other properties as needed
        // Save the updated enterprise
        await enterprise.save().then(()=>{
            res.json({ message: 'Info Updated' });
        }).catch((error)=>{
            res.status(500).json({message: 'Failed to update info'})
        });;

    } catch (error) {
        console.error('Error updating enterprise:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})

// Update Product Info
app.put('/updateEnterpriseData/:id', async (req, res) => {
    const {categories, images} = req.body; // The updated enterprise data
    const id = req.params.id

    try {
        const enterprise = await Enterprise.findById(id);

        if (!enterprise) {
            res.status(404).json({ error: 'Enterprise not found' });
        } else {

            enterprise.categories = categories
            enterprise.images = images
            // Update other properties as needed

            // Save the updated enterprise
            await enterprise.save().then(()=>{
                res.status(200).json({ message: 'Backend Save Successful' });
            }).catch((error)=>{
                res.status(500).json({message: 'Failed to save data'})
            });
        }
    } catch (error) {
        console.error('Error updating enterprise:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

// Delete User
app.delete('/deleteEnterprise/:id', async (req, res) => {
    try {
        await Enterprise.deleteOne({ _id: req.params.id });
        res.status(200).json({})
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});

// Assistant Endpoint 
const openai = new OpenAI({ apiKey: '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' })

app.post('/assistant', async (req, res) => {
    await openai.completions.create({
        model: "text-davinci-003",
        prompt: req.body.prompt,
        max_tokens: 7,
        temperature: 0
    }).then((data) => {
        res.status(200).json({ message: data.data.choices[0] })
    }).catch((error) => {
        res.status(400).json({ message: "Request Failed" })
    })
})




