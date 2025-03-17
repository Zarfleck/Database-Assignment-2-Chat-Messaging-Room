require('./utils');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 12;
const bodyParser = require('body-parser');

const database = include('databaseConnection');
const db_utils = include('database/db_utils');
const db_users = include('database/users.js');
const success = db_utils.printMySQLVersion();

const port = process.env.PORT || 3000;

const expireTime = 60*60*1000; //expires after 1 hour (hours * minutes * seconds * millis)


/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;


app.use(express.static('public')); 
app.use(express.urlencoded({extended: false}));
app.set('view engine', 'ejs');


var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@assignment-2.qqx99.mongodb.net/?retryWrites=true&w=majority&appName=Assignment-2`,
    crypto: {
		secret: mongodb_session_secret
	}
})


app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true,
    cookie: {
        maxAge: expireTime
    }
}
));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

console.log("invalid password");
function sessionValidation(req, res, next) {
    console.log(req.session.authenticated)
	if (!req.session.authenticated) {
		req.session.destroy();
		res.redirect('/login');
		return;
	}
	else {
		next();
        
	}
}

app.get('/', async (req,res) => {
    // Still need to implenemt the number of unread messages SQL query

    console.log(req.session.username)
    user_rooms = await db_users.getUserRooms({user_id: req.session.user_id});

    res.render("index.ejs", {authenticated: req.session.authenticated, username: req.session.username, users_rooms: user_rooms});
});
 
app.get('/room/:room_id', sessionValidation, async (req,res) => {
    var id = req.params.room_id;
    req.session.room_id = id;
    console.log(id);

    user_rooms = await db_users.getUserRooms({user_id: req.session.user_id});

    
    var current_room = user_rooms.find(room => room.room_id == id);
    console.log(current_room);

    var last_read_message = current_room.last_read_message_id;

    req.session.user_room_id = current_room.room_user_id;
    req.session.current_room_name = current_room.name;

    console.log("Last Read Message: ");
    console.log(last_read_message);


    var roomMessages = await db_users.getRoomMessages({room_id: id});
    // console.log(roomMessages);

    var messageEmojiReactions = await db_users.getMessageEmojiReactions({room_id: id});
    console.log(messageEmojiReactions);
    // console.log(req.session.user_id)

    res.render("room", {messages: roomMessages, auth_user_id: req.session.user_id, last_read_message: last_read_message, room_name: current_room.name, messageEmojiReactions: messageEmojiReactions});

    if(roomMessages.length-1 >= 0) {
        await db_users.updateLastMessageRead({user_id: req.session.user_id, room_id: id, last_read_message_id: roomMessages[roomMessages.length-1].message_id});
    }
}); 
 
app.post('/react', async (req, res) => {
    const { message_id, emoji_id, remove } = req.body;
    const userId = req.session.user_id;

    var messageEmojiReactions = await db_users.getMessageEmojiReactions({room_id: req.session.room_id});

    const existingReactionIndex = messageEmojiReactions.findIndex(r =>
        r.message_id === parseInt(message_id) &&
        r.emoji_id === parseInt(emoji_id) &&
        r.user_id === userId
    );

    if (remove) {
        // Remove the reaction if it exists
        if (existingReactionIndex !== -1) {
            var success = await db_users.removeReaction({message_id: message_id, emoji_id: emoji_id, user_id: userId});
            if (success) {
                return res.json({ success: true });
            } else {
                return res.json({ success: false, message: "Failed to remove reaction." });
            }
        }
        return res.json({ success: false, message: "Reaction not found." });

    } else {
        // Add the reaction if it doesn't exist
        if (existingReactionIndex === -1) {
            var success = await db_users.addReaction({message_id: message_id, emoji_id: emoji_id, user_id: userId});
            if (success) {
                return res.json({ success: true });
            } else {
                return res.json({ success: false, message: "Failed to add reaction." });
            }
        }
        return res.json({ success: false, message: "Already reacted." });
    }
});


app.post("/sendMessage", async (req, res) => {
    var message = req.body.message;
    var user_room_id = req.session.user_room_id;
    const d = new Date();
    let currentDateAndTime = d.toISOString().slice(0, 19).replace('T', ' ');
    console.log(user_room_id);

    var success = await db_users.sendMessage({room_user_id: user_room_id, text: message, sent_datetime: currentDateAndTime});
    if (success) {
        res.redirect(`/room/${req.session.room_id}`);
    }
    else {
        res.render("errorMessage", {error: "Failed to send message."} );
    }
});


app.get('/createNewGroup', sessionValidation, async (req,res) => {
    users = await db_users.getUsers();
    res.render("createNewGroup.ejs", {all_users: users});   
});


app.post("/createNewGroup", async (req, res) => {
    var group_name = req.body.group_name;
    var users = req.body.users;

    var user_id = req.session.user_id;

    console.log(group_name);
    console.log(users);

    const d = new Date();
    let currentDateAndTime = d.toISOString().slice(0, 19).replace('T', ' ');

    var roomId = await db_users.createRoom({groupName: group_name, dateAndTime: currentDateAndTime});

    var success = false;
    if(users.constructor === Array) {
        users.forEach(async (user) => {
            success = await db_users.addUserToRoom({user_id: user, room_id: roomId});
        });
    } else {
        success = await db_users.addUserToRoom({user_id: users, room_id: roomId});
    }
    

    if (success) {
        res.redirect("/");
    }
    else {
        res.render("errorMessage", {error: "Failed to create room."} );
    }
});


app.get('/addUsersToCurrentRoom', sessionValidation, async (req,res) => {
    var user_id = req.session.user_id;
    var room_id = req.session.room_id;
    var roomUsers = await db_users.getUsersInRoom({room_id: room_id});
    var allUsers = await db_users.getUsers();


    var usersNotInRoom = allUsers.filter(user => 
        !roomUsers[0].some(roomUser => roomUser.username === user.username)
    );
    
    res.render("addUserToGroup.ejs", {usersInRoom: roomUsers[0], roomName: req.session.current_room_name, usersNotInRoom: usersNotInRoom});
});


app.post("/addUsersToCurrentRoom", async (req, res) => {
    var addedUsers = req.body.addedUsers;
    var room_id = req.session.room_id;

    var success = false;
    console.log(addedUsers);
    if(addedUsers.constructor === Array) {
        console.log("Many users");
        addedUsers.forEach(async (user) => {
            success = await db_users.addUserToRoom({user_id: user, room_id: room_id});
        });
    } else {
        success = await db_users.addUserToRoom({user_id: addedUsers, room_id: room_id});
    }
    

    if (success) {
        res.redirect(`/room/${room_id}`);
    }
    else {
        res.render("errorMessage", {error: "Failed to add user to room."} );
    }
});



app.get('/createUser', (req,res) => {
    res.render("createUser");
});


app.post('/submitUser', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;
    var hashedPassword = bcrypt.hashSync(password, saltRounds);

    // console.log(hashedPassword);
    var success = await db_users.createUser({ user: username, hashedPassword: hashedPassword });
    if (success) {
        var results = await db_users.getUsers();
        res.render("submitUser",{users:results});
    }
    else {
        res.render("errorMessage", {error: "Failed to create user."} );
    }
});



app.get('/login', (req,res) => {
    res.render("login");
});


app.post('/loggingin', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;

    var results = await db_users.getUser({ user: username, hashedPassword: password });
    if (results) {
        if (results.length == 1) { //there should only be 1 user in the db that matches
            if (bcrypt.compareSync(password, results[0].password_hash)) {
                req.session.authenticated = true;
                console.log(req.session.authenticated)
                req.session.username = username;
                req.session.user_id = results[0].user_id;
                req.session.cookie.maxAge = expireTime;
                res.redirect('/');
                return;
            }
            else {            }
        }
        else {
            console.log('invalid number of users matched: '+results.length+" (expected 1).");
            res.redirect('/login');
            return;            
        }
    }

    console.log('user not found');
    //user and password combination not found
    res.redirect("/login");
});




app.get('/api', (req,res) => {
	var user = req.session.user;
    var user_type = req.session.user_type;
	console.log("api hit ");
	var jsonResponse = {
		success: false,
		data: null,
		date: new Date()
	};
	
	if (!isValidSession(req)) {
		jsonResponse.success = false;
		res.status(401);  //401 == bad user
		res.json(jsonResponse);
		return;
	}
	if (typeof id === 'undefined') {
		jsonResponse.success = true;
		if (user_type === "admin") {
			jsonResponse.data = ["A","B","C","D"];
		}
		else {
			jsonResponse.data = ["A","B"];
		}
	}
	else {
		if (!isAdmin(req)) {
			jsonResponse.success = false;
			res.status(403);  //403 == good user, but, user should not have access
			res.json(jsonResponse);
			return;
		}
		jsonResponse.success = true;
		jsonResponse.data = [id + " - details"];
	}
	res.json(jsonResponse);
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
})

// 404 catch route
app.get("*", (req, res) => {
    res.status(404);
    res.render("404");
})


app.use(express.static(__dirname + "/public"));

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 




