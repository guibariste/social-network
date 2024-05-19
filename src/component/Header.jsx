import { useNavigate } from "react-router-dom";
import { getUser, resetLocalStorage } from "../utils/StorageUtils";
import { useEffect, useState } from "react";
import React from "react";

export default function AppHeader() {
  const navigate = useNavigate();
  var connected = false;
  console.log("h", getUser());
  if (getUser() != null && getUser() != "") {
    connected = true;
  }
  function navig(way) {
    navigate(way);
  }
  function disconnect() {
    resetLocalStorage();
    navig("/");
  }
  const [showGroupeOptions, setShowGroupeOptions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  function acceptDemandegroupe(nomGroupe) {
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "acceptGroupe",
          data: {
            utilisateur: localStorage.getItem("UUID"),
            nom: nomGroupe,
          },
        })
      );
    };
  }
  function refusDemandegroupe(nomGroupe) {
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "refusGroupe",
          data: {
            utilisateur: localStorage.getItem("UUID"),
            nom: nomGroupe,
          },
        })
      );
    };
  }
  function followUser(user1, user2) {
    const ws = new WebSocket("ws://localhost:8080/ws");
    const message = {
      type: "follow",
      data: {
        user1: user1,
        user2: user2,
      },
    };
    ws.onopen = () => {
      ws.send(JSON.stringify(message));
    };
  }
  const toggleGroupeOptions = () => {
    setShowGroupeOptions(!showGroupeOptions);
  };
  const RemoveNotification = (id) => {
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "notif:delete",
          data: {
            id: id,
          },
        })
      );
      ws.send(
        JSON.stringify({
          type: "notif:fetch",
          data: localStorage.getItem("UUID"),
        })
      );
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setNotifications(data);
      console.log(data);
    };
  };
  const toggleNotifications = () => {
    const ws = new WebSocket("ws://localhost:8080/ws");
    //setShowNotifications(!showNotifications);
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "notif:fetch",
          data: localStorage.getItem("UUID"),
        })
      );
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data == null || data.length === 0) {
        setShowNotifications(!showNotifications);
        setNotifications([]);
      } else {
        setNotifications(data);
        console.log(data);
        setShowNotifications(!showNotifications);
      }
    };
  };
  const InitDarkMode = () => {
    let darkMode = localStorage.getItem("dark_mode");
    if (darkMode === null) {
      localStorage.setItem("dark_mode", "false");
      darkMode = "false";
    }
    if (darkMode === "true") {
      document.querySelector("html").style.filter = "invert(0)";
    } else {
      document.querySelector("html").style.filter = "invert(1)";
    }
    //edit stylesheet
    let stylesheets = document.styleSheets;
    let stylesheet = Array.from(stylesheets).filter((stylesheet) =>
      stylesheet.ownerNode.attributes[1].nodeValue.includes("message")
    );
    console.log(stylesheet);
    //get the class emoticons
    let emoticons = Array.from(stylesheet[0].cssRules).filter((rule) =>
      rule.selectorText.includes("emoticons")
    );
    console.log(emoticons);
    //get the filter property
    let filter = emoticons[0].style.filter;
    console.log(filter);
    //invert the filter
    if (darkMode === "false") {
      emoticons[0].style.filter = "invert(1)";
    } else {
      emoticons[0].style.filter = "invert(0)";
    }
  };
  useEffect(() => {
    InitDarkMode();
  }, []);
  return (
    <div className="AppHeader">
      <ol className="ListHeader">
        <li onClick={() => navig("/")} className="ButtonHeader">
          Accueil
        </li>
        {connected && (
          <React.Fragment>
            <li onClick={() => navig("/posts")} className="ButtonHeader">
              Posts
            </li>
            <li onClick={() => navig("/message")} className="ButtonHeader">
              Message
            </li>
            <li onClick={() => navig("/profil")} className="ButtonHeader">
              MonProfil
            </li>
            <li
              onMouseEnter={toggleGroupeOptions}
              onMouseLeave={toggleGroupeOptions}
              className="ButtonHeader"
            >
              <span onClick={() => navig("/voirGroupes")}>Groupe</span>
              {showGroupeOptions && (
                <ol className="GroupeOptions">
                  <li
                    onClick={() => navig("/rechercheGroupe")}
                    className="ButtonHeader"
                  >
                    rechercher un groupe
                  </li>

                  <li
                    onClick={() => navig("/creerGroupe")}
                    className="ButtonHeader"
                  >
                    Créer groupe
                  </li>
                  <li
                    onClick={() => navig("/voirGroupes")}
                    className="ButtonHeader"
                  >
                    Voir groupes
                  </li>
                </ol>
              )}
            </li>
          </React.Fragment>
        )}
        <li onClick={() => navig("/settings")} className="ButtonHeader">
          Parametres
        </li>
        <li onClick={() => navig("/recherche")} className="ButtonHeader">
          Recherche
        </li>
      </ol>
      {connected ? (
        <ol className="ListHeaderConnexion">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            onClick={toggleNotifications}
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-bell"
            viewBox="0 0 16 16"
          >
            {" "}
            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z" />{" "}
          </svg>
          <li className="ButtonHeader">{getUser()}</li>
          <li className="ButtonHeader" onClick={() => disconnect()}>
            Disconnect
          </li>
          {showNotifications &&
            notifications != null &&
            notifications.map((notif) => {
              if (notif.type == "invitGroupe") {
                return (
                  <p key={notif.id} className={`notification ${notif.type}`}>
                    {notif.sender} {notif.type}
                    <button
                      onClick={() => {
                        acceptDemandegroupe(notif.groupid);
                        RemoveNotification(notif.id);
                      }}
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => {
                        refusDemandegroupe(notif.groupid);
                        RemoveNotification(notif.id);
                      }}
                    >
                      Refuser
                    </button>
                  </p>
                );
              } else if (notif.type == "follow") {
                return (
                  <p key={notif.id} className={`notification ${notif.type}`}>
                    {notif.sender} {notif.type}
                    <button
                      onClick={() => {
                        followUser(notif.sender, notif.receiver);
                        RemoveNotification(notif.id);
                      }}
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => {
                        RemoveNotification(notif.id);
                      }}
                    >
                      Ignorer
                    </button>
                  </p>
                );
              } else if (notif.type == "comment") {
                return (
                  <p key={notif.id} className={`notification ${notif.type}`}>
                    {notif.sender} {notif.type}
                    <button
                      onClick={() => {
                        navigate("/posts?id=" + notif.groupid);
                        RemoveNotification(notif.id);
                        window.location.reload();
                      }}
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => {
                        RemoveNotification(notif.id);
                      }}
                    >
                      Ignorer
                    </button>
                  </p>
                );
              } else if (notif.type == "message") {
                return (
                  <p key={notif.id} className={`notification `}>
                    {notif.sender} {notif.type}
                    <button
                      onClick={() => {
                        navigate("/message");
                        RemoveNotification(notif.id);
                      }}
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => {
                        RemoveNotification(notif.id);
                      }}
                    >
                      Ignorer
                    </button>
                  </p>
                );
              }
            })}
          {console.log(
            showNotifications,
            notifications == null,
            Array.isArray(notifications)
          )}
          {showNotifications &&
            (notifications == null || Array.isArray(notifications)) && (
              <p className="notification">Vous n'avez pas de notifications</p>
            )}
        </ol>
      ) : (
        <ol className="ListHeaderConnexion">
          <li onClick={() => navig("/login")} className="ButtonHeader">
            Connexion
          </li>
          <li onClick={() => navig("/register")} className="ButtonHeader">
            Inscription
          </li>
          {showNotifications &&
            notifications.map((notif) => {
              return <p className="notification">{notif.type}</p>;
            })}
        </ol>
      )}
    </div>
  );
}
