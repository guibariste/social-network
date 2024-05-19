import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfilExt from './ProfilExt';
import "./_recherche.css"


export default function RechercheGroupe() {
  const [selectedGroupe, setSelectedGroupe] = useState({});
  const [groupeRecherche, setGroupeRecherche] = useState([]);
   const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false); // mettre l'état initial de showResults à false
   const [filteredRecherche, setFilteredRecherche] = useState([]); // nouvel état pour stocker les résultats filtrés
   const [nomFinal,setnomFinal] = useState("");
  const [showGroupe, setShowGroupe] = useState(false);
 
  // const navigate = useNavigate();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/ws');
    return () => {
      ws.close();
    };
  }, []);
   
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = function () {
      const message = {
        type: "rechercheGroupe",
        data: {
          chercheur : localStorage.getItem('UUID'),

        }
      };
      ws.send(JSON.stringify(message));
    };
    ws.onmessage = function (event) {
      event.preventDefault()
      const data = JSON.parse(event.data);
      console.log(data)
      setGroupeRecherche(data); // mettre à jour le state userRecherche avec les données reçues du WebSocket
    }
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      // setShowProfilExt(false)
      const filtered = groupeRecherche.filter((user) => {
        return (
          user.nom.toLowerCase().includes(searchTerm.toLowerCase())
          
      
        );
      });
      setFilteredRecherche(filtered);
      setShowResults(true);
    } else {
      setFilteredRecherche([]);
      setShowResults(false);
    }
  }, [searchTerm, groupeRecherche]);
  

  function handleClick(name) {
    setSearchTerm(name);
   
   
    const groupe = groupeRecherche.find((groupe) => groupe.nom === name);
    if (groupe) {
      // console.log(groupe.description); // afficher la description correspondante
      setSelectedGroupe(groupe)
    }
    setShowResults(false);
  }
  
function validerRecherche(){
 setShowGroupe(true)
//  console.log(selectedGroupe.description)

}

function envoyerDemande() {
 
  
  const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'demandeGroupeExt',
          data: {
           demandeur : localStorage.getItem('UUID'),
            receveur : selectedGroupe.createur,
            nomGroupe : selectedGroupe.nom,
            statut : "autoInvit"
          },
        })
      );
    };
    ws.onmessage = (e) => {
      console.log(e.data);
      if (e.data==='impossible') {
       console.log("vous ne pouvez pas vous inviter vous meme")
      }else{
        const data = JSON.parse(e.data);
        console.log(data);
       
      }
      
    };
}
  function affRecherche(event) {
    const value = event.target.value;
    setSearchTerm(value);
    setShowResults(false); // mettre l'état de showResults à false lorsque la valeur de la barre de recherche change
  }

  return (
    <div id="divRecherche">
      <input
        type="text"
        id="barreRecherche"
    
        onChange={affRecherche}
         value={searchTerm}
        
      />
      <button className="bouton" onClick={validerRecherche}>
        Rechercher
      </button>
  
      {showResults && (
        <div id="montreRecherche">
          {filteredRecherche.map((user, index) => (
            <div
              key={user.nom}

              onClick={() => handleClick(`${user.nom}`)}
              // onMouseEnter={() => handleMouseEnter(index)}
              // onMouseLeave={() => handleMouseLeave(index)}
              // className={user.hovered ? "hovered" : ""}
            >
              <div>
                {user.nom} 
              </div>
            </div>
          ))}
        </div>
      )}



{showGroupe && (
  <div>
  <br/><br/>
   Nom : {selectedGroupe.nom} <br/>
   Description :{selectedGroupe.description}
   <br/>Createur :{selectedGroupe.createur}
   <button onClick={envoyerDemande} className='ButtonHeader'>Envoyer demande</button>
  </div>
)}
    </div>
  );
          }