let express = require("express");
let app = express();
let port = process.env.PORT || 5000;
let bodyParser = require('body-parser')
const mongoose = require("mongoose");
let Bcrypt = require("bcrypt-inzi");
let useragent = require('express-useragent');

app.use(useragent.express());

// parse application/json
app.use(bodyParser.json())

//////////////////////////////////////////////////////////////////////////////////////// 
//////////////////////// DB connections
let dbURI = "mongodb+srv://dbuser:dbpassword@cluster0.oh80q.mongodb.net/User-Authentication-System?retryWrites=true&w=majority"

mongoose.connect(dbURI);

// mongoose.set('useNewUrlParser', true);
// mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

mongoose.connection.on('connected', function () { //connected
    console.log("Mongoose is connected");
});

/////////////////////////// DB Models

var userSchema = mongoose.Schema({
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
var users = mongoose.model("users", userSchema);

var sessionSchema = mongoose.Schema({
    token: { type: String },
    expire: { type: String }
})
var sessions = mongoose.model("sessions", sessionSchema)

//////////////////////////////////////////////////////////////////////////////////////// 

// let users = [
//     // { userName: "Muhammad Salif", password: 123456 }
// ]
// console.log("Users array", users)

// let sessions = [
//     // { id: 2, token: "sdfrwerfew54er2rfwerwrw", expire: 1607424594798 },
//     // { id: 2, token: "sdfrwerfew54er2rfwerwrw", expire: 1607424594798 },
// ]

app.get("/", (req, res) => {
    res.send("Hello world")
})

app.post("/signup", (req, res) => {
    if (!req.body || !req.body.userName || !req.body.password) {
        res.send("Information is missing")
        console.log("Information is missing")
        return;
    }
    Bcrypt.stringToHash(JSON.stringify(req.body.password))
        .then(passwordHash => {
            // // Mongo
            users.create({
                // id: Math.ceil(Math.random() * 100),
                userName: req.body.userName,
                password: passwordHash
            }).then(() => {
                res.send("Successfully signed up")
                console.log('Successfully sign up')
            }).catch(() => {
                res.send("Sign Up Error")
                console.log('Sign Up Error')
            })
            // // Local
            // users.push({
            // id: Math.ceil(Math.random() * 100),
            //     userName: req.body.userName,
            //     password: passwordHash
            // })
            // res.send("SignUp Successfully")
            // console.log("User Signup successfully :", req.body.userName)
        })
})

app.post("/login", (req, res) => {

    if (!req.body || !req.body.userName || !req.body.password) {
        res.send("Username or password is Missing")
        return
    }
    console.log("Req.body.username", req.body.userName)
    console.log("Req.body.password", req.body.password)

    users.find({ userName: req.body.userName })
        .then((currentUser) => {
            currentUser = currentUser[0]
            console.log("current user", currentUser)
            console.log("Current user password hash from db", currentUser.password)

            if (currentUser) {
                Bcrypt.varifyHash(JSON.stringify(req.body.password), currentUser.password)
                    .then(passwordVerified => {
                        console.log('password verified ', passwordVerified)

                        if (passwordVerified) {
                            let tokenData = {
                                ip: req.socket.remoteAddress,
                                browserName: req.useragent.browser
                            };
                            console.log("Token daTa 1", JSON.stringify(tokenData))

                            Bcrypt.stringToHash(JSON.stringify(tokenData))
                                .then(token => {
                                    sessions.create({
                                        token: token,
                                        expire: new Date().getTime() + (1000 * 60)
                                    }).then(() => {
                                        console.log("Users sessions", sessions)
                                        res.json({ "token": token })
                                    })

                                    // Local
                                    // sessions.push({
                                    //     id: currentUser._id,
                                    //     token: token,
                                    //     expire: new Date().getTime() + (1000 * 60)
                                    // })
                                    // console.log("Users sessions", sessions)
                                    // res.json({ "token": token })

                                })
                        } else {
                            res.send("Password in invalid")
                            console.log("Password is invalid");
                        }
                    }).catch(e => {
                        console.log("error: ", e)
                    })
            } else {
                res.send("Invalid username or password || user not found")
            }
        })
    // Local storage user filtering
    // let currentUser = users.filter((eachUser) => eachUser.userName === req.body.userName)[0];
    // console.log("Current user", currentUser)

})

app.get("/profile", (req, res) => {
    if (!req.query.token) {
        res.send("token is Missing")
    }
    // Local
    // let session = sessions.filter((eachSession) => eachSession.token === req.query.token)[0]
    // console.log("Sessions", sessions)
    // console.log("Current session", session)
    sessions.find({ token: req.query.token })
        .then((session) => {
            session = session[0]
            console.log("Indivisual session", session)

            if (new Date().getTime() > session.expire) {
                res.status(401).send("Token expired")
            }
            Bcrypt.validateHash(req.query.token)
                .then(isValidTokenHash => {
                    console.log(isValidTokenHash)
                    if (isValidTokenHash) {
                        console.log("hash is valid")

                        let tokenData = {
                            ip: req.socket.remoteAddress,
                            browserName: req.useragent.browser
                        };

                        // console.log("Token daTa 2", JSON.stringify(tokenData))
                        Bcrypt.varifyHash(JSON.stringify(tokenData), session.token)
                            .then(hashVerified => {
                                if (hashVerified) {

                                    res.send("Welcome to profile")

                                } else {
                                    res.send("Hash is invalid")
                                    console.log("hash is not valid");
                                }
                            }).catch(e => {
                                console.log("error: ", e)
                            })
                    } else {
                        res.send("Not valid token")
                        console.log("hash is invalid")
                    }
                })
        })
}
)

app.get("/dashboard", (req, res) => {
    if (!req.query.token) {
        res.send("token is Missing")
    }

    // Local storage
    // let session = sessions.filter((eachSession) => eachSession.token === req.query.token)[0]
    // console.log("Sessions", sessions)
    // console.log("Current session", session)

    sessions.find({ token: req.query.token })
        .then((session) => {
            session = session[0]
            if (new Date().getTime() > session.expire) {
                res.status(401).send("Token expired")
            }
            Bcrypt.validateHash(req.query.token)
                .then(isValidTokenHash => {
                    console.log(isValidTokenHash)
                    if (isValidTokenHash) {
                        console.log("hash is valid")

                        let tokenData = {
                            ip: req.socket.remoteAddress,
                            browserName: req.useragent.browser
                        };

                        // console.log("Token daTa 2", JSON.stringify(tokenData))

                        Bcrypt.varifyHash(JSON.stringify(tokenData), session.token)
                            .then(hashVerified => {
                                if (hashVerified) {

                                    res.send("Welcome to Dashboard")

                                } else {
                                    res.send("Hash is invalid")
                                    console.log("hash is not valid");
                                }
                            }).catch(e => {
                                console.log("error: ", e)
                            })
                    } else {
                        res.send("Not valid token")
                        console.log("hash is invalid")
                    }
                })
        })
}
)

app.listen(port, () => {
    console.log("Server is running at port ", port)
})