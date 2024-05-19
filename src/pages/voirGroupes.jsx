import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Emoji from '../component/Emoji';
import { getUser } from '../utils/StorageUtils';
import "./_groupe.css";

export default function VoirGroupes() {
  const [confirmCreation, setconfirmCreation] = useState("");
  const [showCreationGroupe, setShowCreationGroupe] = useState(true);
  const [utilisateursSelectionnes, setUtilisateursSelectionnes] = useState([]);
  const [utilisateursReponse, setUtilisateursReponse] = useState(null);
  const [groupes, setGroupes] = useState([]);
  const [groupeAttente, setGroupeAttente] = useState([]);
  const [groupeAutoInvit, setGroupeAutoInvit] = useState([]);

  const [groupeAccepte, setGroupeAccepte] = useState([]);
  const [groupeFinal, setGroupeFinal] = useState({});

  const [confirmGroupe, setConfirmGroupe] = useState("");
  const [showDemandesExt, setShowDemandesExt] = useState(false);
  const [showInfoGroupeAttente, setShowInfoGroupeAttente] = useState(false);
  const [showInfoGroupeAutoInvit, setShowInfoGroupeAutoInvit] = useState(false);
  const [showGroupeEnCours, setShowGroupeEnCours] = useState(false);
  const [showGroupeFinal, setShowGroupeFinal] = useState(false);
  const [showBoutons, setShowBoutons] = useState(true);
  const [groupeDisplayed, setGroupeDisplayed] = useState(false);
  const [currentGroupeName, setCurrentGroupeName] = useState([]);
  const [content, setContent] = useState('');
  const [groupMessages, setGroupMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [msg, setMsg] = useState(false);
  const [msgDem, setMsgDem] = useState(false);

  const [firstMessageFetch, setFirstMessageFetch] = useState(true);
  const [events, setEvents] = useState([]);
  const [userName, setuserName] = useState(getUser());
  const [checkedIndexes, setCheckedIndexes] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [dateIssue, setDateIssue] = useState(null);
  const [iscreator, setIscreator] = useState(false);
  const navigate = useNavigate();

  const ws = new WebSocket('ws://localhost:8080/ws');
  function fetchUser(uuid){
    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'fetchUser',
        data: uuid
      }));
    }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if(data.type === 'fetchUser'){
        // console.log(data.data);
        return data.data;
      }
    }
    return null;
  }
  useEffect(() => {

    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'events:fetch',
          data: {},
        })
      );
    };

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      // console.log('messageData', data.data);
      if (data) {
        setEvents(data.data);
        // console.log(data, events);
      }
    });

    return () => {
      ws.close();
    };
  }, []); // empty dependency array ensures this only runs on first load

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleCreateOptionChange = (index, e) => {
    const newOptions = [...options];
    newOptions[index] = e.target.value;
    setOptions(newOptions);
  };

  const [newOptions, setNewOptions] = useState({});

  const handleOptionChange = (index, event, value) => {
    /*
    setNewOptions(prevOptions => ({
      ...prevOptions,
      [event.id]: {
        ...prevOptions[event.id],
        userAnswers: {
          ...prevOptions[event.id]?.userAnswers,
          [userName]: value,
        },
      },
    }));
    */

    // other code
    //events[index].userAnswers[userName] = value;
    updateUserAnswerById(event.id, value)
    //console.log(newOptions, events)
  };

  const updateUserAnswerById = (id, newValue) => {
    setEvents(prevEvents => {
      const updatedEvents = [...prevEvents];
      const eventIndex = updatedEvents.findIndex(event => event.id === id);
      if (eventIndex >= 0) {
        updatedEvents[eventIndex] = {
          ...updatedEvents[eventIndex],
          userAnswers: {
            ...updatedEvents[eventIndex].userAnswers,
            [userName]: newValue,
          },
        };
      }
      //console.log("update", events, updatedEvents, events[eventIndex].userAnswers[userName], updatedEvents[eventIndex].userAnswers[userName], newValue)
      return updatedEvents;
    });
  };

  /*
    const handleOptionChange = (index, event, value) => {
      setOptions(['', '']);
      const newOptions = ["", ""];
      newOptions[event.id-1] = value;
      events[index].userAnswers[userName] = value;
      console.log(options, newOptions)
    };
    */

  const handleAddOption = () => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() === '' || description.trim() === '' || options.some(option => option.trim() === '') || dateIssue || startDate == null || endDate == null) {
      // prevent sending empty data
      return;
    }

    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'createEvent',
          data: {
            creator: localStorage.getItem("UUID"),
            title,
            description,
            date: "",
            startDate: startDate,
            endDate: endDate,
            optionsNotif: checkedIndexes,
            groupID: groupeFinal.Id,
            options: options.filter(option => option.trim() !== ''),
          },
        })
      );
    };

    // reset state variables
    setTitle('');
    setDescription('');
    setOptions(['', '']);
    setShowBoutons(false);
    setStartDate(null);
    setEndDate(null);
    document.getElementById("start-date").value = null;
    document.getElementById("end-date").value = null;
    setTimeout(() => setShowBoutons(true), 5000); // hide buttons for 5 seconds

    // add event listener to receive the response from the server
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      //console.log("messageData", data)
      if (data && Array.isArray(data)) {
        // update the state with the fetched events
        setEvents(data);
        //console.log(data, events)
      }
    });
  }

  useEffect(() => {

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "voirGroupe",
          data: {
            utilisateur: localStorage.getItem("UUID"),
          },
        })
      );
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      // console.log("data", data)

      if (data.type === "groupes") {
        if (data.data===null){
          data.data=[]
        }
        setGroupes(data.data);
      }
    };


    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    let groupesTemp = [];
    let groupesTempAccept = [];
    let groupesTempAutoInvit = []
    if (groupes.length != undefined && groupes.length != 0 || groupes.length != null) {
      for (let i = 0; i < groupes.length; i++) {
        if (groupes[i].statut === "attente"&& groupes[i].typeDemande==="invitation") {//c la quil faut differencier les invitations
          groupesTemp.push(groupes[i]);
        }
        if (groupes[i].statut === "attente"&& groupes[i].typeDemande==="autoInvit") {//c la quil faut differencier les invitations
          groupesTempAutoInvit.push(groupes[i]);
        }
        if (groupes[i].statut === "accepte" || groupes[i].statut === "createur") {
          groupesTempAccept.push(groupes[i]);
        }
      }
      // console.log(groupesTempAutoInvit)
    }
    if (groupesTemp.length > 0) {
      setGroupeAttente(true);
    } else {
      setGroupeAttente([]);

    }
    if (groupesTempAccept.length > 0) {
      setGroupeAccepte(true);
    } else {
      setGroupeAccepte([]);

    }
    if (groupesTempAutoInvit.length > 0) {
      setGroupeAutoInvit(true);
    } else {
      setGroupeAutoInvit([]);

    }
    setGroupeAttente(groupesTemp);
    setGroupeAccepte(groupesTempAccept)
    setGroupeAutoInvit(groupesTempAutoInvit)
  }, [groupes]);
  
  const deleteGroup=()=>{
    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'group:delete',
          data: {
            username: localStorage.getItem("UUID"),
            groupID: groupeFinal.Id,
          },
        })
      );
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      // console.log("data", data)
      if (data.type=="group:delete"){
        if (data.data==="success"){
          //Restart the page without reloading
          window.location.reload(false);

        }
      }
    }
  }

  const boutonAttente = () => {
    setShowInfoGroupeAttente(true)
    setMsgDem(false)
    if (groupeAttente.length < 1) {
      setMsg(true)
     
      

    }
  }
  const boutonAutoInvit = () => {
    setShowInfoGroupeAutoInvit(true)
    setShowInfoGroupeAttente(false)
    setMsg(false)
    if (groupeAutoInvit.length < 1) {
      setMsgDem(true)
      
      

    }
 
  }
  function boutonAccepte() {
   
 
    for (let i =0;i<groupeAccepte.length;i++){
      if (groupeAccepte[i].demandesExt && groupeAccepte[i].demandesExt.length>0   ){
    // console.log(groupeAccepte[i].demandesExt)
setShowDemandesExt(true)


   }
  }
    // setGroupeAttente(false)
    // setGroupeAccepte(false)
    setShowInfoGroupeAttente(false)
    setShowInfoGroupeAutoInvit(false)

    setShowBoutons(false)
    setShowGroupeEnCours(true);

    setMsg(false)
    setMsgDem(false)

    if (groupeAccepte.length < 1) {
      setMsg(true);
      setShowGroupeEnCours(false)
      setConfirmGroupe("Vous n'appartenez a aucun groupe");
      // //crer un nouveau div qui affiche ca
    }
  }
  function removeGroupeAttente(nomGroupe) {
    setGroupeAttente(prevState => prevState.filter(groupe => groupe.nom !== nomGroupe));
  }
  function acceptDemande(nomGroupe) {
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "acceptGroupe",
          data: {
            utilisateur: localStorage.getItem("UUID"),
            nom: nomGroupe
          },
        })
      );
    };
    setShowInfoGroupeAttente(false);
    removeGroupeAttente(nomGroupe);
  };
  let ws2 = null;
  let wsIsOpen = false;

  function voir(nomGroupe) {

    const groupe = groupes.find(g => g.nom === nomGroupe);
    setGroupeFinal(groupe);
    fetchEvents()
    setShowGroupeFinal(true);
    setShowGroupeEnCours(false);
    setMsg(false);
    setGroupeDisplayed(true);
    setCurrentGroupeName(nomGroupe);

    //console.log(groupe.Id)
    if (!wsIsOpen) {
      ws2 = new WebSocket("ws://localhost:8080/ws");
      ws2.onopen = () => {
        wsIsOpen = true;
        ws2.send(
          JSON.stringify({
            type: "groupMessages:fetch",
            data: {
              groupeId: groupe.Id,
              userUUID: localStorage.getItem("UUID")
            },
          })
        );
        if (firstMessageFetch) {
          const element = document.querySelector('.groupeMessageList');
          element.scrollTop = element.scrollHeight;
          setFirstMessageFetch(false)
        }
      };
      ws2.onmessage = (e) => {
        const data = JSON.parse(e.data);
        //console.log("data", data)
        setGroupMessages(data["groupMessages"])
        setUserId(data["userId"])

      };
      ws2.onclose = () => {
        wsIsOpen = false;
      };
    } else {
      ws2.send(
        JSON.stringify({
          type: "groupMessages:fetch",
          data: {
            groupeId: groupe.Id,
            userUUID: localStorage.getItem("UUID")
          },
        })
      );
    }
    
  }


  useEffect(() => {
    if (groupeDisplayed && currentGroupeName) {
      const interval = setInterval(() => {
        voir(currentGroupeName);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [groupeDisplayed, currentGroupeName, firstMessageFetch]);

  function refusDemande(nomGroupe) {
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "refusGroupe",
          data: {
            utilisateur: localStorage.getItem("UUID"),
            nom: nomGroupe
          },
        })
      );
    };
    setShowInfoGroupeAttente(false);
    removeGroupeAttente(nomGroupe);
  };

  function sendMessage() {
    if (!content.trim()) {
      return;
    }

    const ws = new WebSocket("ws://localhost:8080/ws");
    //console.log('yo')
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "groupMessages",
          data: {
            senderId: localStorage.getItem("UUID"),
            contenu: content,
            groupeId: groupeFinal.Id,
          },
        })
      );
      setContent("");
    };
    setTimeout(() => {
      const element = document.querySelector('.groupeMessageList');
      element.scrollTop = element.scrollHeight;
    }, 500)
  }

  function handleSelectEmoji(emoji) {
    setContent((prev) => prev + emoji); // append the selected emoji to the message content
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && content.trim() !== '') {
      sendMessage();
    }
  }

  function handleProfilExt() {
    //  ProfilExt()
    localStorage.setItem('nomPourGo', groupeFinal.createur)
    navigate('/ProfilExt'); // Redirigez l'utilisateur vers la page souhaitée
  }

  function handleOptionSelect(event, eventId) {
    event.preventDefault();
    const nonEmptyOption = options.find(option => option !== "");
    //console.log("hello", events, event, eventId, options, nonEmptyOption)
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "selectOption",
          data: {
            events: events,
            groupID: groupeFinal.Id,
            user: localStorage.getItem("UUID"),
          },
        })
      );
    };
  }

  function fetchEvents() {
    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'events:fetch',
          data: {
            groupID: groupeFinal.Id
          },
        })
      );
    };
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      //console.log('messageData', data.data);
      if (data) {
        setEvents(data.data);
        //console.log(data, events);
      }
    });
    // console.log(events)

    return () => {
      ws.close();
    };
  }

  const getUserAnswer = (event, id) => {
    const eventIndex = events.findIndex(event => event.id === id);
    if (events[eventIndex] && events[eventIndex].userAnswers && events[eventIndex].userAnswers[userName]) {
      //console.log("options", events, events[eventIndex].userAnswers[userName], event.option1, events[eventIndex].userAnswers[userName] == event.option1)
      return events[eventIndex].userAnswers[userName];
    }
    return null;
  };

  const handleCheck = (index) => {
    if (checkedIndexes.includes(index)) {
      setCheckedIndexes(checkedIndexes.filter((i) => i !== index));
    } else {
      setCheckedIndexes([...checkedIndexes, index]);
    }
  };
  const handleStartDateChange = (event) => {
    const selectedDate = new Date(event.target.value);
    const currentDate = new Date();

    // Compare selected date with current date
    if (selectedDate.getTime() <= currentDate.getTime()) {
      console.log("Selected date must be higher than current date.");
      setDateIssue(true);
      return;
    }

    // Get the timezone offset of the selected date
    const timezoneOffset = selectedDate.getTimezoneOffset();

    // Adjust the selected date based on the timezone offset
    const adjustedDate = new Date(selectedDate.getTime() - (timezoneOffset * 60 * 1000));
    setDateIssue(false);
    setStartDate(adjustedDate);
    // console.log(adjustedDate);
  };

  function eventOver(date) {
    const currentDate = new Date();
    // console.log(data, currentDate, date < currentDate)
    return date < currentDate
  }

  const handleEndDateChange = (event) => {
    const newEndDate = new Date(event.target.value);
    const currentTime = new Date();
    if (newEndDate.getTime() <= currentTime.getTime()) {
      // Selected date is not valid
      console.log("Selected date is not valid");
      setDateIssue(true);
      return;
    }
    const timeDifference = Math.abs(newEndDate - startDate);
    const maxTimeDifference = 1000 * 60 * 60 * 24 * 30; // Maximum time difference is 30 days
    console.log(newEndDate - startDate, startDate, timeDifference, maxTimeDifference, timeDifference > maxTimeDifference)
    if (timeDifference > maxTimeDifference) {
      // Selected date is not valid
      console.log("Selected date is not valid");
      setDateIssue(true);
      return;
    }
    setDateIssue(false);
    const endDateFormatted = newEndDate.toISOString().slice(0, 16);
    setEndDate(endDateFormatted);
    // console.log(endDateFormatted)
  };

function accepterDemandeExt(demande,nom){

// console.log(demande+"accepte",nom) 
 const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'acceptDemandeExt',
          data: {
            createur : localStorage.getItem("UUID"),
            utilisateur : demande,
            nomGroupe : nom
          
          },
        })
      );
    };
removeGroupFromAccepte(nom)

}
function refuserDemandeExt(demande,nom){

  const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'refuseDemandeExt',
          data: {
            createur : localStorage.getItem("UUID"),
            utilisateur : demande,
            nomGroupe : nom
          
          },
        })
      );
    };
    removeGroupFromAccepte(nom)
  
}
const [username, setUsername] = useState("");
useEffect(() => {
  let uuid=localStorage.getItem("UUID")
  // console.log(uuid)
  const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'fetchUser',
        data: uuid
      }));
    }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // console.log(data);
      if(data.type === 'fetchUser'){
        // console.log(data.data);
        setUsername(data.data);
      }
    }
}, [username]);
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
const grpeExistantInvit = (event) => {
  event.preventDefault();
let group = groupeFinal.nom
  const ws = new WebSocket("ws://localhost:8080/ws");
  ws.onopen = () => {
    const senderUUID = localStorage.getItem('UUID');
    ws.send(
      JSON.stringify({
        type: 'invitGrpeExist',
        data: {
          senderId: senderUUID,
          nomGroupe : group
        },
      })
    );
  };
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    // console.log(data,"mtnt")
    setUtilisateursReponse(data);
   
  };
};
const handleSubmitInvit = (event) => {
  event.preventDefault();
  // console.log(utilisateursSelectionnes)
  // console.log(`Nom : ${nom}`);
  // console.log(`Prénom : ${descr}`);
let grou=groupeFinal.nom
  const ws = new WebSocket("ws://localhost:8080/ws");
  ws.onopen = () => {
  

    ws.send(
      JSON.stringify({
        type: "creerDemandeGroupe",
        data: {
          nomGroupe: grou,
         
         
           invites: utilisateursSelectionnes,
          
        },
      })
    );
  };
  // ws.onmessage = (e) => {
  //   const data = JSON.parse(e.data);
//     if(data.Accept==false){
// setShowCreationGroupe(false)
// setconfirmCreation("Une erreur s'est produite")

//     }else{
      setShowCreationGroupe(false)
      setconfirmCreation("Votre Invitation a ete envoyee")
      console.log(confirmCreation)
    // }
  };
// };

const handleAnnuler = () => {
 
  setUtilisateursSelectionnes([]);
  setShowCreationGroupe(false)
};
  return (
    <div>
      {showBoutons && (
        <div>
          {groupeAttente && (

            <button id="boutAttente" onClick={boutonAttente}>
              Voir les Invitations
            </button>

          )}
           {groupeAutoInvit && (

<button id="boutAutoInvit" onClick={boutonAutoInvit}>
  Voir mes demandes
</button>

)}
          {groupeAccepte && (
            <button id="boutGroupe" onClick={boutonAccepte}>
              Voir les groupes
            </button>
          
          
          
          
          )}

         
        </div>
      )}
      {showInfoGroupeAttente && (
        <div>
          <ul>
            {groupeAttente.map((groupe) => (
              <li key={groupe.nom}>
                <h3>{groupe.nom}</h3>
                <p>Description : {groupe.description}</p>
                <p>Créé par : {groupe.createur}</p>
                <button onClick={() => acceptDemande(groupe.nom)}>Accepter</button>
                <button onClick={() => refusDemande(groupe.nom)}>Refuser</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {showInfoGroupeAutoInvit && (
        <div>
          <ul>
            {groupeAutoInvit.map((groupe) => (
              <li key={groupe.nom}>
                <h3>{groupe.nom}</h3>
                <p>Description : {groupe.description}</p>
                <p>Créé par : {groupe.createur}</p>
               EN ATTENTE D'APPROBATION
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && (
        <div id="confirmGroupe">pas de invit
        </div>
      )}
        {msgDem && (
        <div id="confirmGroupe">pas de demandes
        </div>
      )}
      {showGroupeEnCours && (
        <div id="groupeEncours">
 {showDemandesExt && (
           <div id="demandesExt">   
           Demandes d'ajout dans votre groupe :
{ groupeAccepte && groupeAccepte.map((groupe) => (
  <div key={groupe.nom}>
    {groupe.demandesExt && groupe.demandesExt.map((demande) => (
      <div key={demande}>
        <span>{demande}</span>
        <button onClick={() => accepterDemandeExt(demande,groupe.nom)}>Accepter</button>
        <button onClick={() => refuserDemandeExt(demande,groupe.nom)}>Refuser</button>
        Nom du groupe : {groupe.nom}
      </div>
    ))}
  </div>
))}
          
         </div>
//faire les boutons de demandes ext ici



          )}
          {/* faire une liste des groupes en cours pour enfin devoiler le groupe */}
          <ul>
            {groupeAccepte.map((groupe) => (
              <li key={groupe.nom}>
                <h3>{groupe.nom}</h3>
                <p>Description : {groupe.description}</p>
                <p>Créé par : {groupe.createur}</p>
                <button onClick={() => voir(groupe.nom)}>Voir</button>

              </li>
            ))}
          </ul>
        </div>

      )}
      {showGroupeFinal && (
        <div className="groupe">
          <div className="groupe-info">

            <h2>Id: {groupeFinal.Id}</h2>

            <h1>{groupeFinal.nom}</h1>
            <p><span className="bold">Description : </span>{groupeFinal.description}</p>
            <p><span className="bold">Créateur : </span><span className="blue pointer" onClick={handleProfilExt}>{groupeFinal.createur}</span></p>
<div id="boutInvitExist">
<button onClick={grpeExistantInvit}>Inviter des personnes</button>
<div id="confirmCreation">{confirmCreation}</div>
{showCreationGroupe &&(
<div>

     
          <ul>
  {utilisateursReponse &&
    utilisateursReponse.map((utilisateur) => (
      <li key={utilisateur.id}>
        <label>
          <input
            type="checkbox"
            value={utilisateur.id}
            checked={utilisateursSelectionnes.includes(utilisateur.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setUtilisateursSelectionnes([
                  ...utilisateursSelectionnes,
                  utilisateur.id,
                  // utilisateur.lastName
                ]);
              } else {
                setUtilisateursSelectionnes(
                  utilisateursSelectionnes.filter(
                    (id) => id !== utilisateur.id
                  )
                );
              }
            }}
          />
          {utilisateur.lastName} {utilisateur.firstName}
        </label>
      </li>
    ))}
</ul>
<button onClick={handleSubmitInvit}>Inviter</button> 
        <button onClick={handleAnnuler}>Annuler</button>
        </div>
)}
       
          
</div>

            {groupeFinal.createur==username&&(
              <button onClick={deleteGroup}>Supprimer le groupe</button>
              )}
          </div>
          <div className="eventCreatorDiv">
            <h1>Créer un nouvel événement :</h1>
            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="title">Titre :</label>
                <br></br>
                <input
                  type="text"
                  id="title"
                  placeholder="titre"
                  value={title}
                  onChange={handleTitleChange}
                />
              </div>
              <div>
                <label htmlFor="description">Description :</label>
                <br></br>
                <textarea
                  id="description"
                  value={description}
                  placeholder="description"
                  onChange={handleDescriptionChange}
                ></textarea>
              </div>
              <div>
                <label htmlFor="options">Options :</label>
                {options.map((option, index) => (
                  <div key={index}>
                    <input
                      type="text"
                      value={option}
                      placeholder={"option " + (index + 1)}
                      onChange={(e) => handleCreateOptionChange(index, e)}
                    />
                    <input
                      type="checkbox"
                      onChange={() => handleCheck(index)}
                      checked={checkedIndexes.includes(index)}
                    />
                    <p>Cette option enverra une notification</p>
                    {index > 1 && (
                      <button type="button" onClick={() => handleRemoveOption(index)}>
                        Supprimer
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={handleAddOption}>
                  Ajouter une option
                </button>
                <br></br>
                <form>
                  <label htmlFor="start-date">Date de début:</label>
                  <input type="datetime-local" id="start-date" name="start-date" onChange={handleStartDateChange}></input>
                  <br />
                  <label htmlFor="end-date">Date de fin:</label>
                  <input type="datetime-local" id="end-date" name="end-date" onChange={handleEndDateChange}></input>
                  <br />
                  <p>Note: Les événements peuvent durer un mois maximum</p>
                  {dateIssue &&
                    <p className="red">Erreur: Veuillez vérifier les dates entrées</p>
                  }
                </form>
              </div>
              <button type="submit">Créer l'événement</button>
            </form>
          </div>
          <div>
            <h1>Group Events</h1>
            <ul>
              {events && events.map(event => {
                const endDate = new Date(event.endDate);
                const currentDate = new Date();
                if (currentDate > endDate) {
                  return null; // skip rendering the event if the current date is after the end date
                }
                return (
                  <li key={event.id} className="eventLi">
                    <h2>{event.title}</h2>
                    <p>{event.description}</p>
                    <p>Creator: {event.creator}</p>
                    <p>Date: {event.date}</p>
                    <p>Début de l'event: {event.startDate}</p>
                    <p>Fin de l'event: {event.endDate}</p>
                    <form onSubmit={(e) => { handleOptionSelect(e, event.id) }}>
                      <p>Options:</p>
                      {event.option1 &&
                        <div>
                          <input
                            type="radio"
                            id="option1"
                            name="option"
                            value={event.option1}
                            checked={getUserAnswer(event, event.id) === event.option1}
                            onChange={() => handleOptionChange(0, event, event.option1)}
                          />
                          <label htmlFor="option1">{event.option1}</label>
                          <br></br>
                          {event.optionsNotif.includes(0) && <span>Note: Tu recevras une notification</span>}
                        </div>
                      }
                      {event.option2 &&
                        <div>
                          <input
                            type="radio"
                            id="option2"
                            name="option"
                            value={event.option2}
                            checked={getUserAnswer(event, event.id) === event.option2}
                            onChange={() => handleOptionChange(1, event, event.option2)}
                          />
                          <label htmlFor="option2">{event.option2}</label>
                          <br></br>
                          {event.optionsNotif.includes(1) && <span>Note: Tu recevras une notification</span>}
                        </div>
                      }
                      {event.option3 &&
                        <div>
                          <input
                            type="radio"
                            id="option3"
                            name="option"
                            value={event.option3}
                            checked={getUserAnswer(event, event.id) === event.option3}
                            onChange={() => handleOptionChange(2, event, event.option3)}
                          />
                          <label htmlFor="option3">{event.option3}</label>
                          <br></br>
                          {event.optionsNotif.includes(2) && <span>Note: Tu recevras une notification</span>}
                        </div>
                      }
                      {event.option4 &&
                        <div>
                          <input
                            type="radio"
                            id="option4"
                            name="option"
                            value={event.option4}
                            checked={getUserAnswer(event, event.id) === event.option4}
                            onChange={() => handleOptionChange(3, event, event.option4)}
                          />
                          <label htmlFor="option4">{event.option4}</label>
                          <br></br>
                          {event.optionsNotif.includes(3) && <span>Note: Tu recevras une notification</span>}
                        </div>
                      }
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="groupe-content">
            <div className="groupe-messages">
              {groupMessages && (
                <div>
                  <p>Messages de groupe:</p>
                  <ul className="groupeMessageList">
                    {groupMessages.map((message) => (
                      <li className={
                        message.sender_id == userId ? 'message sent' : 'message received'
                      } key={message.id}><span className="groupsender">{message.sender}</span>&emsp;{message.date}<br></br>{message.content.split("").map((char, index) => {
                        // console.log(char, EMOJIS.includes(char));
                        if (EMOJIS.includes(char+message.content[index+1])&&index%2==0) {
                          return (
                            <span key={index} className="emoticons">
                              {char+message.content[index+1]}
                            </span>
                          );
                        } else if (index%2==0) {
                          return char;
                        }
                      })}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="groupe-input">
                <input
                  type="text"
                  id="messageInput"
                  placeholder="Écrire un message"
                  className="emoticons"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Emoji onSelect={handleSelectEmoji} />
                <button onClick={sendMessage}>Envoyer</button>
              </div>
            </div>

            <div className="groupe-modo">

            </div>
            <div className="groupe-invites">
              <div >
                <h2>Moderateur :</h2>
                <ul>

                  <li id="createur" className="pointer" onClick={handleProfilExt}>
                    {groupeFinal.createur}
                  </li>

                </ul>
              </div>
              <h2>Invités :</h2>
              <ul>
                {groupeFinal.invites && groupeFinal.invites.map((invite, index) => (
                  <li key={index}>{invite}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}  