import { useState, useEffect,useRef } from "react";
import defaultAvatar from "../assets/Default.png";
import { getUser } from "../utils/StorageUtils";
import { useNavigate } from "react-router-dom";
import "./_userProfil.css";

export default function ProfilExt() {
  const navigate = useNavigate();
  const [userProfil, setUserProfil] = useState({});
  const [imageError, setImageError] = useState(false);
  const [following, setFollowing] = useState(false);
  const [flwrs, setFlwrs] = useState(0); // using state hook to keep track of flwrs
  const [visible, setVisible] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowed, setShowFollowed] = useState(false);
  const [FollowersList, setFollowersList] = useState([]);
  const [FollowedList, setFollowedList] = useState([]);
  const [flwed, setFlwed] = useState(0);
  const intervalcounter = useRef(0);
  if (userProfil.followers != null) {
    console.log(
      "public",
      userProfil.isPublic,
      userProfil.followers.split(",").length - 1
    );
  }

  /*  */

  function setDefaultImage(event) {
    if (!imageError) {
      setImageError(true);
      event.target.src = defaultAvatar;
    }
  }

  const nomPourGo = localStorage.getItem("nomPourGo");
  console.log(nomPourGo);

  function sendMessage1() {
    const message = {
      type: "profilExt",
      data: nomPourGo,
    };
    ws.send(JSON.stringify(message));
    console.log('-----------------',1)
  }

  function sendMessage2() {
    const message = {
      type: "isFollowing",
      data: {
        user1: getUser(),
        user2: nomPourGo,
      },
    };
    ws.send(JSON.stringify(message));
    console.log('-----------------',2)
  }

  function sendMessage3() {
    const message = {
      type: "isPending",
      data: {
        user1: getUser(),
        user2: nomPourGo,
      },
    };
    ws.send(JSON.stringify(message));
    console.log('-----------------',3)
  }
  const ws = new WebSocket("ws://localhost:8080/ws");
  useEffect(() => {

    ws.onopen = () => {
      sendMessage3();
      sendMessage1();
      sendMessage2();
    };
    ws.onmessage = function (event) {
      const data = JSON.parse(event.data);
      console.log(data, data.type, data.data, data.firstName == undefined);
      if (data.type == "isFollowing") {
        console.log("a", data.data);
        setFollowing(data.data);
      } else if (data.type == "isPending") {
        console.log("b", data.data);
        setPendingRequest(data.data);
      } else if (data.firstName != undefined) {
        console.log("c", data);
        //data.isPublic="false"
        if (userProfil.followers != null) {
          setFlwrs(userProfil.followers.split(",").length - 1 || 0);
        }
        console.log("userProfil.isPublic", data.isPublic);
        setVisible(data.isPublic);
        setUserProfil(data);
        
      }
    };

    return () => {
      ws.close();
    };
  }, [nomPourGo]);
    
    const FetchFol=()=>{
      if (
        typeof userProfil.followed === "undefined" ||
        userProfil.followed === null
      ) {
        var flwed = 0;
      } else {
        var flwed = userProfil.followed.split(",").length - 1 || 0;
        setFlwed(flwed);
        var flwrs = userProfil.followers.split(",").length - 1 || 0;
        setFlwrs(flwrs);
        if (!userProfil.isPublic && userProfil.followed.includes(getUser())) {
          setFollowing(true);
        }
        var FollowersList = userProfil.followers.split(",");
        var FollowedList = userProfil.followed.split(",");
        FollowersList.pop();
        FollowedList.pop();
        setFollowersList(FollowersList) 
        //FollowersList.pop();
        setFollowedList(FollowedList)
        //FollowedList.pop();
      }
    }
    //delay the start of FetchFol() to make sure that userProfil is not empty
    
    setInterval(() => {
      if (intervalcounter.current > 1) {
        clearInterval(this);
        console.log("interval cleared");
        return;
      }
      FetchFol()
      intervalcounter.current = intervalcounter.current + 1;
    
    //if already loaded, just call it
    if (document.readyState === "complete") {
      FetchFol()
      console.log("DOM fully loaded and parsed");
    }
    }, 1000);
 

  function followUser(user1, user2) {
    if (!userProfil.isPublic) {
      followRequest(user1, user2);
      return;
    }
    const message = {
      type: "follow",
      data: {
        user1: user1,
        user2: user2,
      },
    };
    ws.send(JSON.stringify(message));
  }

  function unfollowUser(user1, user2) {
    const message = {
      type: "unfollow",
      data: {
        user1: user1,
        user2: user2,
      },
    };
    ws.send(JSON.stringify(message));
  }
  function followRequest(user1, user2) {
    const message = {
      type: "follow:request",
      data: {
        user1: user1,
        user2: user2,
      },
    };
    ws.send(JSON.stringify(message));
  }

  function handleFollowClick() {
    const user1 = getUser();
    const user2 = userProfil.lastName;
    console.log("User 1: ", user1);
    console.log(userProfil.lastname);
    console.log("User 2: ", user2);
    // Send user1 and user2 to the server via WebSocket
    if (user1 != undefined && user1 != user2) {
      followUser(user1, user2);
      setFollowing(true);
      setFlwrs(flwrs + 1);
      console.log("flwrs", flwrs);
    } else if (user1 != user2) {
      navigate(`/login`);
    }
  }

  function handleUnfollowClick() {
    const user1 = getUser();
    const user2 = userProfil.lastName;
    console.log("User 1: ", user1);
    console.log(userProfil.lastname);
    console.log("User 2: ", user2);
    // Send user1 and user2 to the server via WebSocket
    if (user1 != undefined) {
      unfollowUser(user1, user2);
      setFollowing(false);
      setFlwrs(flwrs - 1);
      console.log("flwrs", flwrs);
    }
  }

  function handleFollowRequest() {
    const user1 = getUser();
    const user2 = userProfil.lastName;
    console.log("User 1: ", user1);
    console.log(userProfil.lastname);
    console.log("User 2: ", user2);
    // Send user1 and user2 to the server via WebSocket
    if (user1 != undefined && user1 != user2) {
      followRequest(user1, user2);
      setPendingRequest(true);
    } else if (user1 != user2) {
      navigate(`/login`);
    }
  }

  console.log("userProfil", userProfil);
  return (
    <div className="userProfil">
      <img
        id="uavatar"
        src={imageError ? defaultAvatar : userProfil.avatar}
        onError={setDefaultImage}
      ></img>
      <br></br>
      <span className="nameProfil top">@{userProfil.surnom}</span>
      <br></br>
      {console.log("following:", following)}
      {console.log(userProfil.lastName, getUser())}
      {userProfil.lastName == getUser() ? (
        <div></div>
      ) : (
        <div>
          {following ? (
            <button className="following" onClick={handleUnfollowClick}>
              Unfollow
            </button>
          ) : visible ? (
            <button className="follow" onClick={handleFollowClick}>
              Follow
            </button>
          ) : pendingRequest ? (
            <button className="pending">Demande en attente</button>
          ) : (
            <button className="followRequest" onClick={handleFollowRequest}>
              Faire une demande de follow
            </button>
          )}
        </div>
      )}
      <br></br>
      <br></br>
      <div className="ProfilInfo">
        <span className="top" onClick={() => setShowFollowers(!showFollowers)}>
          {visible || following || userProfil.lastName == getUser() ? flwrs : "??"} Followers
        </span>
        <span>&nbsp; | &nbsp;</span>
        <span className="top" onClick={() => setShowFollowed(!showFollowed)}>
          Following {visible || following || userProfil.lastName == getUser() ? flwed : "??"}
        </span>
      </div>
      <br></br>
      <span>{visible && userProfil.propos}</span>
      <br></br>
      <br></br>
      {visible || following ? (
        <a href={`/posts?user=${userProfil.lastName}`}>Voir les posts</a>
      ) : (
        <p>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-lock-fill"
            viewBox="0 0 16 16"
          >
            {" "}
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />{" "}
          </svg>
          Compte privé
        </p>
      )}
      <hr></hr>
      {showFollowers && visible && (
        <div>
          {" "}
          Followers :
          {FollowersList.map((follower, index) => (
            <div key={index}>
              <div className="followList">{follower}</div>
            </div>
          ))}
        </div>
      )}
      <hr></hr>
      {showFollowed && visible && (
        <div>
          {" "}
          Followed :
          {FollowedList.map((followed, index) => (
            <div key={index}>
              <div className="followList">{followed}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
