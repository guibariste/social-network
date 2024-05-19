import React, { useState } from "react";
import "./_groupe.css";

export default function CreerGroupe() {
  const [nom, setNom] = useState("");
  const [descr, setDescr] = useState("");
  // const [nomUtilisateur, setNomUtilisateur] = useState("");
  const [utilisateursSelectionnes, setUtilisateursSelectionnes] = useState([]);
  const [utilisateursReponse, setUtilisateursReponse] = useState(null);
  const [confirmCreation, setconfirmCreation] = useState("");
  const [showCreationGroupe, setShowCreationGroupe] = useState(true);
  
  const handleNomChange = (event) => {
    setNom(event.target.value);
  };

  const handleDescrChange = (event) => {
    setDescr(event.target.value);
  };

  const handleInviterAmis = (event) => {
    event.preventDefault();

    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
      const senderUUID = localStorage.getItem('UUID');
      ws.send(
        JSON.stringify({
          type: 'friends:fetch',
          data: {
            senderId: senderUUID,
          },
        })
      );
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log(data)
      setUtilisateursReponse(data);
     
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log(utilisateursSelectionnes)
    // console.log(`Nom : ${nom}`);
    // console.log(`Prénom : ${descr}`);

    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = () => {
    

      ws.send(
        JSON.stringify({
          type: "creerGroupe",
          data: {
            nomGroupe: nom,
            descrGroupe: descr,
            createur: localStorage.getItem("UUID"),
             invites: utilisateursSelectionnes,
            
          },
        })
      );
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if(data.Accept==false){
 setShowCreationGroupe(false)
 setconfirmCreation("Un groupe de ce nom existe deja")

      }else{
        setShowCreationGroupe(false)
        setconfirmCreation("Votre groupe a ete cree avec succes")
      }
    };
  };

  const handleAnnuler = () => {
    setNom("");
    setDescr("");
    setUtilisateursSelectionnes([]);
  };

  return (
    <div id="creerGroupe">
      
      <div id="confirmCreation">{confirmCreation}</div>
     {showCreationGroupe &&(
      <form onSubmit={handleSubmit}>
        <label htmlFor="nom">Nom du groupe :</label>
        <br></br>
        <input
          type="text"
          id="nom"
          name="nom"
          value={nom}
          onChange={handleNomChange}
        /><br />
        <label htmlFor="descrGroupe">Description :</label>
        <br></br>
        <input
          type="text"
          id="descr"
          name="descr"
          value={descr}
          onChange={handleDescrChange}
        />
        <br></br>
        <button type="button" onClick={handleInviterAmis}>
          Inviter des amis
        </button>
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

        </div>
  
        <br />
        <input type="button" value="Annuler" onClick={handleAnnuler} />
        <input type="submit" value="Créer" />
      </form>
      )}
    </div>
  );
}  