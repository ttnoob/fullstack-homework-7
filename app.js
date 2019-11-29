const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/userManager', {useNewUrlParser: true});

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function() {
    console.log('connected');
})

let Schema = mongoose.Schema;

let classSchema = new Schema({
    className: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    }
})

let Class = mongoose.model('Class', classSchema);

let userSchema = new Schema({
    email: {
        type: String,
        validate: {
            validator: function(v) {
                return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(v);
            },
            message: props => `Email invalid`
        },
        required: [true, 'Email address is required']
    }, 
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    dob: {
        type: String
    },
    phoneNum: {
        type: String
    },
    _class: [{
        type: Schema.Types.ObjectId,
        ref: 'Class'
    }]
})

let User = mongoose.model('User', userSchema);
// {username: 'adminngu', password: '123123', class: 'web 33'}


// query user, class with and without params
app.get('/user', (req, res) => {
    let users;
    if (req.query.name) {
        users = User.find({
            name: req.query.name
        })
    } else {
        users = User.find()
    }
    if (req.query.className) {
        console.log(1);
        users.populate({
            path: '_class',
            match: {
                className: req.query.className
            }
        }).exec((err, data) => {
            let result = data.filter((value, index, array) => {
                return value._class.length > 0 ? value : null
            })

            console.log(result)
            if (result.length <= 0) {
                res.json({
                    message: "user not found",
                    sucesss: false
                })
                return;
            }
            if (err) {
                res.json({
                    message: err,
                    sucesss: false
                })
            } else {
                res.json({
                    message: 'user found',
                    data: data,
                    sucesss: true
                })
            }
        });
    } else {
        console.log(2);
        users.populate('_class')
        .exec((err, data) => {
            // console.log(data)
            if (data.length <= 0) {
                res.json({
                    message: "user not found",
                    sucesss: false
                })
                return;
            }
            if (err) {
                res.json({
                    message: err,
                    sucesss: false
                })
            } else {
                res.json({
                    message: 'user found',
                    data: data,
                    sucesss: true
                })
            }
        });
    }
})

app.get('/class', (req, res) => {
    let classes;
    if (req.query.className) {
        classes = Class.find({
            name: req.query.className
        })
    } else {
        classes = Class.find()
    }
    classes.exec((err, data) => {
        if (data.length <= 0) {
            res.json({
                message: "class not found",
                sucesss: false
            })
            return;
        }
        if (err) {
            res.json({
                message: err,
                sucesss: false
            })
        } else {
            res.json({
                message: 'class found',
                data: data,
                sucesss: true
            })
        }
    });
})

async function getUser(req, res, next) {
    try {
        user = await User.findById(req.params.id).populate('_class')
        if (user == null) {
            return res.status(404).json({ message: 'Cant find user'})
        }
    } catch(err){
        return res.status(500).json({ message: err.message })
    }
  
    res.user = user
    next()
}

async function getClass(req, res, next) {
    try {
        oneClass = await Class.findById(req.params.id).populate('_class')
        if (oneClass == null) {
            return res.status(404).json({ message: 'Cant find class'})
        }
    } catch(err){
        return res.status(500).json({ message: err.message })
    }
  
    res.oneClass = oneClass
    next()
}
  

// query single user, class
app.get('/user/:id', getUser, (req, res) => {
    res.json(res.user);
})

app.post('/user', (req, res) => {
    const newUser = new User(req.body);
    newUser.save((err, data) => {
        if (err) {
            res.json({
                message: err,
                sucesss: false
            })
        } else {
            res.json({
                message: err,
                sucesss: true
            })
        }
    })
})

app.post('/class', (req, res) => {
    const newClass = new Class(req.body);
    newClass.save((err, data) => {
        if (err) {
            res.json({
                message: err,
                sucesss: false
            })
        } else {
            res.json({
                message: "class created",
                sucesss: true
            })
        }
    })
})

app.delete('/user/:id', getUser, (req, res) => {
    try {
        res.user.remove()
        res.json({ message: 'deleted this user' })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

app.delete('/class/:id', getClass, (req, res) => {
    try {
        res.oneClass.remove()
        res.json({ message: 'deleted this class' })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

app.put('/user/:id', getUser, async (req, res) => {
    if (!req.params.id) {
        res.json({
            message: 'empty Id',
            success: false
        })
        return;
    }
    for (const property in req.body) {
        if (req.body[property] != null) {
            res.user[property] = req.body[property]
        } else {
            res.status(400).json({ message: err.message })
            return;
        }
    }
    try {
        const updatedUser = await res.user.save()
        res.json(updatedUser)
    } catch {
        res.status(400).json({ message: err.message })
    }
})

app.put('/class/:id', getClass, async (req, res) => {
    if (!req.params.id) {
        res.json({
            message: 'empty Id',
            success: false
        })
        return;
    }
    for (const property in req.body) {
        if (req.body[property] != null) {
            res.oneClass[property] = req.body[property]
        } else {
            res.status(400).json({ message: err.message })
            return;
        }
    }
    try {
        const updatedClass = await res.oneClass.save()
        res.json(updatedClass)
    } catch {
        res.status(400).json({ message: err.message })
    }
})

app.listen(3000, function() {
    console.log('server listening on port 3000');
})