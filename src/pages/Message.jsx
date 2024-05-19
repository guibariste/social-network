import { useEffect, useRef, useState } from "react";
import Emoji from "../component/Emoji";
import "./_message.css";

export default function Message() {
  const [messages, setMessages] = useState([]);
  const [receiver, setReceiver] = useState("");
  const [sender, setSender] = useState(localStorage.getItem("UUID"));
  const [content, setContent] = useState("");
  const [users, setUsers] = useState([]);
  const [receiverUser, setReceiverUser] = useState(null); // Store the entire user object
  const [userId, setUserId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8080/ws");

    ws.current.onopen = () => {
      const senderUUID = localStorage.getItem("UUID");
      ws.current.send(
        JSON.stringify({
          type: "friends:fetch",
          data: {
            sender: sender,
            senderId: senderUUID,
          },
        })
      );
      ws.current.send(
        JSON.stringify({
          type: "messages:fetch",
          data: localStorage.getItem("UUID"),
        })
      );
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      let myObject = {};
      console.log(data, data.length, Object.keys(data).length);
      if (data.userId !== undefined) {
        setUserId(data.userId);
      }
      if (data.length > 0 && data[0].content === undefined) {
        setUsers(data);
      } else if (data.messages == undefined && data.length > 0) {
        myObject = {
          messages: data,
          userId: userId,
        };
      }
      if (Object.keys(data).length > 1 && data.messages != undefined) {
        setMessages(data);
      } else if (
        Object.keys(myObject).length > 1 &&
        myObject.messages != undefined
      ) {
        setMessages(myObject);
      }
    };

    const fetchMessages = () => {
      ws.current.send(
        JSON.stringify({
          type: "messages:fetch",
          data: localStorage.getItem("UUID"),
        })
      );
    };

    const interval = setInterval(fetchMessages, 5000);

    return () => {
      ws.current.close();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setReceiver("");
    setReceiverUser(null);
    setConversation([]);
  }, [users]);

  useEffect(() => {
    /* Selects the first user of the list */
    if (users.length > 0) {
      const firstUser = users[0];
      setReceiver(firstUser.id);
      setReceiverUser({ ...firstUser, id: firstUser.id });
    }
    setTimeout(() => {
      const element = document.getElementById("conversation");
      element.scrollTop = element.scrollHeight;
    }, 100);
  }, [users]);

  useEffect(() => {
    let filteredMessages = [];
    if (Object.values(messages)[0] != null) {
      filteredMessages = Object.values(messages)[0].filter(
        (message) =>
          (message.receiver_id == receiver && message.sender_id == userId) ||
          (message.receiver_id == userId && message.sender_id == receiver)
      );
    }
    setConversation(filteredMessages);
  }, [users, receiver, sender, messages]);

  function sendMessage() {
    const senderUUID = localStorage.getItem("UUID");
    ws.current.send(
      JSON.stringify({
        type: "messages",
        data: {
          receiver: receiver,
          sender: sender,
          senderId: senderUUID,
          receiverId: receiverUser.id, // add receiverId to the data object
          content: content,
        },
      })
    );
    setContent("");
    setTimeout(() => {
      const element = document.getElementById("conversation");
      element.scrollTop = element.scrollHeight;
    }, 100);
  }

  function handleSelect(user_id) {
    setReceiver(user_id);
    const selectedUser = users.find((user) => user.id === user_id);
    setReceiverUser_id({ ...selectedUser, id: user_id }); // add the id field
  }

  function handleSelectButton(user_id) {
    setReceiver(user_id);
    const selectedUser = users.find((user) => user.id === user_id);
    setReceiverUser({ ...selectedUser, id: user_id });
    setTimeout(() => {
      const element = document.getElementById("conversation");
      element.scrollTop = element.scrollHeight;
    }, 100);
  }

  function handleSelectEmoji(emoji) {
    setContent((prev) => prev + emoji); // append the selected emoji to the message content
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && content.trim() !== "") {
      sendMessage();
    }
  }

  const EMOJIS = [
    "😀",
    "😁",
    "😂",
    "🤣",
    "😃",
    "😄",
    "😅",
    "😆",
    "😉",
    "😊",
    "😋",
    "😎",
    "😍",
    "😘",
    "😗",
    "😙",
    "😚",
    "🙂",
    "🤗",
    "🤔",
    "🤨",
    "😐",
    "😑",
    "😶",
    "🙄",
    "😏",
    "😣",
    "😥",
    "😮",
    "🤐",
    "😯",
    "😪",
    "😫",
    "😴",
    "😌",
    "🤤",
    "😷",
    "🤒",
    "🤕",
    "🤢",
    "🤮",
    "🥵",
    "🥶",
    "🥴",
    "😵",
    "🤯",
    "🤬",
    "😡",
    "😠",
    "🤪",
    "🥳",
  ];
  return (
    <>
      <h1>Message</h1>
      <div id="message">
        <div id="messageUserList">
          {users.map((user) => (
            <button
              key={user.id}
              className="messageUser"
              onClick={() => handleSelectButton(user.id)}
            >
              {user.firstName} {user.lastName}
            </button>
          ))}
        </div>
        <div className="messageSender">
          <input
            type="text"
            id="messageInput"
            className="emoticons"
            placeholder={
              receiverUser &&
              `Envoyer un message à ${receiverUser.firstName} ${receiverUser.lastName}`
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Emoji onSelect={handleSelectEmoji} />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
      {userId && receiverUser && (
        <>
          <h2 className="text">
            {" "}
            Conversation with {receiverUser.firstName} {receiverUser.lastName}
          </h2>
          <div id="conversation">
            {conversation.length > 0 ? (
              conversation.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.sender_id === userId
                      ? "message-sent"
                      : "message-received"
                  }
                >
                  <p className="messagedate">{message.date}</p>
                  <p>
                    {console.log(message.content, message.content.split(""),EMOJIS.includes(message.content))}
                    {message.content.split("").map((char, index) => {
                      console.log(char, EMOJIS.includes(char));
                      if (EMOJIS.includes(char+message.content[index+1])&&index%2==0) {
                        return (
                          <span key={index} className="emoticons">
                            {char+message.content[index+1]}
                          </span>
                        );
                      } else if (index%2==0) {
                        return char;
                      }
                    })}
                  </p>
                </div>
              ))
            ) : (
              <p className="noMessage">No messages with this user yet</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
//get the ascii value of 😯
//console.log("😯".charCodeAt(0))
