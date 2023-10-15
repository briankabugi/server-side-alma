
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


// Register

const User = require('./models/user')

app.post('/register', (req, res) => {
    //Extract Parameters
    const info = req.body

    // Create New user Object
    const newUser = new User({ info })

    //Save to database
    newUser.save().then(() => {
        const token = jwt.sign({ userId: newUser._id }, 'Q&r2k6vhv$h12kl', { expiresIn: '1h' })
        res.status(200).json({ userID: newUser._id, token: token })
    }).catch((error) => {
        console.log('Could not create Account', error)
        res.status(500).json({ message: 'Could not create account' })
    })
})

// Login
app.post('/login', async (req, res) => {
    // Get the email and password from the request body
    const { phone, password } = req.body;

    // Validate the input
    try {
        const user = await User.findOne({ 'info.contact.phone': phone });
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
        res.status(200).json({ info: user.info });
    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Update User
app.put('/updateUser/:id', async (req, res) => {
    const updatedInfo = req.body; // The updated enterprise data

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            try {
                user.info = updatedInfo;

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
})

// Delete User 
app.delete('/deleteUser/:id', async (req, res) => {
    try {
        await User.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Account Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});

// Launch EnterPrise

const Enterprise = require('./models/enterprise')

app.post('/createEnterprise', async (req, res) => {
    //Extract Parameters
    const newEnterprise = req.body

    // Create New user Object
    const createdEnterprise = await new Enterprise(newEnterprise)

    //Save to database
    createdEnterprise.save().then(() => {
        res.status(200).json({ message: 'Launch Successful' })
    }).catch((error) => {
        console.log('Could not create Enterprise', error)
        res.status(500).json({ message: 'Could not create enterprise' })
    })
})

// Find Enterprise
app.get('/findEnterprise/:userId', async (req, res) => {
    try {
        // Get the user ID from the params
        const userId = req.params.userId;

        // Find the enterprises created by that user ID
        const enterprises = await Enterprise.find({ 'info.created_by': userId });

        // Send the response as JSON
        res.status(200).json(enterprises);
    } catch (error) {
        // Handle any errors
        res.status(500).json({ message: error.message });
    }
});

// Locate Enterprise
app.get('/locateEnterprise/:name', async (req, res) => {
    try {
        // Get the user ID from the params
        const name = req.params.name;

        // Find the enterprises created by that user ID
        const enterprise = await Enterprise.findOne({ 'info.name': name });

        // Send the response as JSON
        res.status(200).json(enterprise);
    } catch (err) {
        // Handle any errors
        res.status(500).send(err.message);
    }
});

// Update Enterprise Info
app.put('/updateEnterpriseInfo/:id', async (req, res) => {
    const info = req.body; // The updated enterprise data

    try {
        const enterprise = await Enterprise.findById(req.params.id);

        if (!enterprise) {
            // Return 404 error
            return res.status(404).json({ error: 'Enterprise not found' });
        } else {
            // Update the enterprise with the new data
            enterprise.info = info
        }

        // Save the updated enterprise
        await enterprise.save().then(() => {
            res.json({ message: 'Saved' });
        }).catch((error) => {
            res.status(500).json({ message: error.message })
        });;

    } catch (error) {
        console.error('Error updating enterprise:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})

// Update Enterprise Data
app.put('/updateEnterpriseData/:id', async (req, res) => {
    const { categories, images } = req.body; // The updated enterprise data
    const id = req.params.id

    try {
        const enterprise = await Enterprise.findById(id);

        if (!enterprise) {
            res.status(404).json({ error: 'Enterprise not found' });
        } else {

            enterprise.product_categories = categories
            enterprise.info.images = images
            // Update other properties as needed

            // Save the updated enterprise
            await enterprise.save().then(() => {
                res.status(200).json({ message: 'Backend Save Successful' });
            }).catch((error) => {
                res.status(500).json({ message: 'Failed to save data' })
            });
        }
    } catch (error) {
        console.error('Error updating enterprise:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

// Get Nearest Enterprises
app.get('/nearest-documents', async (req, res) => {
  const { x, y } = req.body

  // Find all documents
  const allDocs = await Enterprise.find({});

  // Calculate distances between each document's x1 and y1 values and x2 and y2 values
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
  const n = 10;
  const nearestDocs = docsWithDistances.slice(0, n);
  res.json(nearestDocs);
});

// Delete Enterprise
app.delete('/deleteEnterprise/:id', async (req, res) => {
    try {
        await Enterprise.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Enterprise Deleted Successfully' })
    } catch (err) {
        res.status(500).json({ message: 'Error on Server Side' });
    }
});



