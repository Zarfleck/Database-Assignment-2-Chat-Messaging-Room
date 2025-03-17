const database = include('databaseConnection');

async function createUser(postData) {
	let createUserSQL = `
		INSERT INTO user
		(username, password)
		VALUES
		(:user, :passwordHash);
	`;
	let params = {
		user: postData.user,
		passwordHash: postData.hashedPassword
	}
	
	try {
		const results = await database.query(createUserSQL, params);
        console.log("Successfully created user");
		console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error inserting user");
        console.log(err);
		return false;
	}
}

async function getUsers() {
	let getUsersSQL = `
		SELECT user_id, username, password_hash
		FROM user;
	`;
	
	try {
		const results = await database.query(getUsersSQL);
        console.log("Successfully retrieved users");
		// console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error getting users");
        console.log(err);
		return false;
	}
}

async function getUser(postData) {
	let getUserSQL = `
		SELECT user_id, email, username, password_hash
		FROM user
		WHERE username = :user;
	`;
	let params = {
		user: postData.user
	}
	
	try {
		const results = await database.query(getUserSQL, params);
        console.log("Successfully found user");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error trying to find user");
        console.log(err);
		return false;
	}
}
 
async function getUserRooms(postData) {
	let getUserRoomsSQL = `
		SELECT RU.room_user_id, RU.user_id, RU.room_id, R.name, RU.last_read_message_id
		FROM room_user AS RU
		JOIN room AS R
		ON R.room_id = RU.room_id
		WHERE user_id = :id;
	`;
	let params = {
		id: postData.user_id
	}
	
	try {
		const results = await database.query(getUserRoomsSQL, params);
		console.log("Successfully found user rooms");
		// console.log(postData.user_id)
		// console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error trying to find user rooms");
		console.log(err);
		return false;
	}
}


async function getRoomMessages(postData) {
	let getRoomMessagesSQL = `
		SELECT U.username, R.user_id, M.message_id, M.sent_datetime, M.text
		FROM room_user AS R
		JOIN message AS M
		ON R.room_user_id = M.room_user_id
		JOIN user AS U
		ON U.user_id = R.user_id
		WHERE room_id = :id
		ORDER BY sent_datetime;	
	`;

	let params = {
		id: postData.room_id
	}
	
	try {
		const results = await database.query(getRoomMessagesSQL, params);
		console.log("Successfully found room messages");
		// console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error trying to find room");
		console.log(err);
		return false;
	}
}

async function updateLastMessageRead(postData) {
	let updateLastMessageReadSQL = `
		UPDATE room_user
		SET last_read_message_id = :message_id
		WHERE room_id = :room_id AND user_id = :user_id;
	`;
	let params = {
		message_id: postData.last_read_message_id,
		room_id: postData.room_id,
		user_id: postData.user_id
	}
	
	try {
		const results = await database.query(updateLastMessageReadSQL, params);
		console.log("Successfully updated last message read");
		// console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error trying to update last message read");
		console.log(err);
		return false;
	}
}


async function sendMessage(postData) {
	let sendMessageSQL = `
		INSERT INTO message
		(room_user_id, sent_datetime, text)
		VALUES
		(:room_user_id, :sent_datetime, :text);
	`;
	let params = {
		room_user_id: postData.room_user_id,
		sent_datetime: postData.sent_datetime,
		text: postData.text
	}
	
	try {
		const results = await database.query(sendMessageSQL, params);
		console.log("Successfully sent message");
		// console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error trying to send message");
		console.log(err);
		return false;
	}
}


async function createRoom(postData) {
    // SQL to insert a new room, letting the DB auto-generate the room_id
    let createRoomSQL = `
        INSERT INTO room (name, start_datetime) 
        VALUES (:name, :dateTime);
    `;

    let params = {
        name: postData.groupName,
        dateTime: postData.dateAndTime
    };

    try {
        // Execute the INSERT query
        const [result] = await database.query(createRoomSQL, params);
        
        // Retrieve the auto-generated room_id (assuming your DB supports it)
        const insertedRoomId = result.insertId;
        
        console.log("Successfully created room with ID:", insertedRoomId);
        return insertedRoomId;
    } catch (err) {
        console.log("Error trying to create room");
        console.error(err);
        return false;
    }
}


async function addUserToRoom(postData) {

	let getRoomUserCount = `
		SELECT count(*)
		FROM room_user;
	`;

	let params = {
		name: postData.name
	}

	let JoinRoomSQL = `
		INSERT INTO room_user
		(room_user_id, user_id, room_id, last_read_message_id)
		VALUES
		(:nextRoomUserID, :user_id, :room_id, :lastReadMessageId);
	`;
	
	
	try {
		const roomUserCount = await database.query(getRoomUserCount, params);

		let nextRoomUserId = roomUserCount[0] + 1;
		
		let params2 = {
			user_id: postData.user_id,
			room_id: postData.room_id,
			roomUserId: nextRoomUserId,
			lastReadMessageId: 0
		}

		const results = await database.query(JoinRoomSQL, params2);
		console.log("Successfully joined room");
		// console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error trying to join room");
		console.log(err);
		return false;
	}
}

async function getUsersInRoom(postData) {
	let getUsersInRoomSQL = `
		SELECT U.username
		FROM room_user AS RU
		JOIN user AS U
		ON U.user_id = RU.user_id
		WHERE room_id = :id;
	`;
	let params = {
		id: postData.room_id
	}
	
	try {
		const results = await database.query(getUsersInRoomSQL, params);
		console.log("Successfully found users in room");
		// console.log(results[0]);
		return results;
	}
	catch(err) {
		console.log("Error trying to find users in room");
		console.log(err);
		return false;
	}
}

async function getMessageEmojiReactions(postData) {
	let getMessageEmojiReactionsSQL = `
		SELECT M.message_id, E.emoji_id, E.image, ER.user_id
		FROM message AS M
		JOIN reacted_messages AS ER
		ON M.message_id = ER.message_id
		JOIN emoji AS E
		ON E.emoji_id = ER.emoji_id
		JOIN room_user AS RU
		ON M.room_user_id = RU.room_user_id
		WHERE room_id = :id;
	`;
	let params = {
		id: postData.room_id
	}
	
	try {
		const results = await database.query(getMessageEmojiReactionsSQL, params);
		console.log("Successfully found message emoji reactions");
		// console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error trying to find message emoji reactions");
		console.log(err);
		return false;
	}
}


async function removeReaction(postData) {
	let removeReactionSQL = `
		DELETE FROM reacted_messages
		WHERE message_id = :message_id AND user_id = :user_id AND emoji_id = :emoji_id;
	`;
	let params = {
		message_id: postData.message_id,
		user_id: postData.user_id,
		emoji_id: postData.emoji_id
	}
	
	try {
		const results = await database.query(removeReactionSQL, params);
		console.log("Successfully removed reaction");
		// console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error trying to remove reaction");
		console.log(err);
		return false;
	}
}

async function addReaction(postData) {
	let addReactionSQL = `
		INSERT INTO reacted_messages
		(message_id, emoji_id, user_id)
		VALUES
		(:message_id, :emoji_id, :user_id);
	`;
	let params = {
		message_id: postData.message_id,
		emoji_id: postData.emoji_id,
		user_id: postData.user_id
	}
	
	try {
		const results = await database.query(addReactionSQL, params);
		console.log("Successfully added reaction");
		// console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error trying to add reaction");
		console.log(err);
		return false;
	}
};


module.exports = {createUser, getUsers, getUser, getUserRooms, getRoomMessages, 
	updateLastMessageRead, sendMessage, createRoom, addUserToRoom, getUsersInRoom, getMessageEmojiReactions, 
	removeReaction, addReaction};