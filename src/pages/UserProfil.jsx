import { useState, useEffect } from 'react';
import { getDarkMode, saveUser } from '../utils/StorageUtils';
import defaultAvatar from '../assets/Default.png';
import { useDarkMode } from '../hooks/useDarkMode';
import { useNavigate } from 'react-router-dom';

import './_userProfil.css';

export default function UserProfil() {
  const [userProfil, setUserProfil] = useState({});
  const [enEdition, setEnEdition] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [surnom, setSurnom] = useState('');
  const [email, setEmail] = useState('');
  const [anniv, setAnniv] = useState('');
  const [avatar, setAvatar] = useState('');
  const [propos, setPropos] = useState('');
  const [ispublic, setIsPublic] = useState(false);
  const [nomUtilisateur, setNomUtilisateur] = useState('field');
  const [imageError, setImageError] = useState(false);

  function modifierProfil() {
    setEnEdition(true);
  }

  function setDefaultImage(event) {
    if (!imageError) {
      setImageError(true);
      event.target.src = defaultAvatar;
    }
  }
  function handleInputChange(event, field) {
    switch (field) {
      case 'firstName':
        setPrenom(event.target.value);
        break;
      case 'lastName':
        setNom(event.target.value);
        break;
      case 'surnom':
        setSurnom(event.target.value);
        break;
      case 'email':
        setEmail(event.target.value);
        break;
      case 'anniv':
        setAnniv(event.target.value);
        break;
      case 'avatar':
        setAvatar(event.target.value);
        break;
      case 'propos':
        setPropos(event.target.value);
        break;
      case 'ispublic':
        console.log("isthingy",event.target.checked)
        setIsPublic(event.target.checked);
        break
      default:
        break;
    }
  }

  function enregistrerProfil() {
    console.log(`Enregistrer les modifications pour l'utilisateur ${userProfil.id}`);
    console.log(`Nouveau prénom: ${prenom}`);
    console.log(`Nouveau nom: ${nom}`);
    console.log(`Nouveau surnom: ${surnom}`);
    console.log(`Nouvelle adresse e-mail: ${email}`);
    console.log(`Nouvelle date de naissance: ${anniv}`);
    console.log(`Nouvel avatar: ${avatar}`);
    console.log(`Nouvelle description: ${propos}`);
    console.log(`Profil public : ${ispublic}`);
    // Envoie les données modifiées à la base de données

    setEnEdition(false); // Désactive le mode édition après la sauvegarde

  
      const ws = new WebSocket('ws://localhost:8080/ws');
      ws.onopen = function () {
        const message = {
          type: 'modifierProfil',
          data: {
            surnom: surnom,
            email: email,
            firstName: prenom,
            lastName: nom,
            anniv: anniv,
            avatar: avatar,
            propos: propos,
            ispublic: ispublic,
            utilisateur:nomUtilisateur
        },
        };
        ws.send(JSON.stringify(message));
      };
  
    

  }

  useEffect(() => {
    setNomUtilisateur(localStorage.getItem('UUID'))
    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = function () {
      const message = {
        type: 'profil',
        data: nomUtilisateur,
      };
      ws.send(JSON.stringify(message));
    };

    ws.onmessage = function (event) {
      const data = JSON.parse(event.data);
      setUserProfil(data);
      setPrenom(data.firstName || '');
      setNom(data.lastName || '');
      setSurnom(data.surnom || '');
      setEmail(data.email || '');
      setAnniv(data.anniv || '');
      setAvatar(data.avatar || '');
      setPropos(data.propos || '');
      setIsPublic(data.isPublic || false);
    };

    
  }, [nomUtilisateur]);
  const navigate = useNavigate();
  const GoToProfile = () => {
    localStorage.setItem('nomPourGo',nom)
    
    navigate('/ProfilExt');
  };
    

  return (
    <div className='userProfil'>
      <div data-field="firstName">
        Prenom :&nbsp;&nbsp;
        {enEdition ? (
          <input type="text" value={prenom} onInput={(event) => handleInputChange(event, 'firstName')} />
        ) : (
          <span>{prenom}</span>
        )}
      </div>
      <div data-field="lastName">
        Nom : &nbsp;&nbsp;
        {enEdition ? (
          <input type="text" value={nom} onInput={(event) => handleInputChange(event, 'lastName')} />
        ) : (
          <span>{nom}</span>
        )}
      </div>
      <div data-field="surnom">
        Surnom :&nbsp;&nbsp;
        {enEdition ? (
          <input type="text" value={surnom} onInput={(event) => handleInputChange(event, 'surnom')} />
        ) : (
          <span>{surnom}</span>
        )}
      </div>
      <div data-field="email">
        Email : &nbsp;&nbsp;
        {enEdition ? (
          <input type="text" value={email} onInput={(event) => handleInputChange(event, 'email')} />
        ) : (
          <span>{email}</span>
        )}
      </div>
      <div data-field="anniv">
        Né le :&nbsp;&nbsp;
        {enEdition ? (
          <input type="date" value={anniv} onInput={(event) => handleInputChange(event, 'anniv')} />
        ) : (
          <span>{anniv}</span>
        )}
      </div>
      <div data-field="avatar">
        Avatar :&nbsp;&nbsp;
        {enEdition ? (
          <input type="text" value={avatar} onInput={(event) => handleInputChange(event, 'avatar')} />
        ) : (
          <span>{avatar}</span>
        )}
      </div>
      <div data-field="propos">
        A propos de moi : &nbsp;&nbsp;
        {enEdition ? (
          <textarea value={propos} onInput={(event) => handleInputChange(event, 'propos')} />
        ) : (
          <div>{propos}</div>
        )}
      </div>
      <div data-field="ispublic">
        Profil public : &nbsp;&nbsp;
        {enEdition ? (
          <input type="checkbox" checked={ispublic} onChange={(event) => handleInputChange(event, 'ispublic')} />
        ) : (
          <div>{ispublic ? "Oui" : "Non"}</div>
        )}
      </div>
      <div id="modifierProfil"></div>
      {!enEdition ? (
        <button onClick={modifierProfil}>Modifier Profil</button>
      ) : (
        <div>
          <button onClick={enregistrerProfil}>Enregistrer</button>
          <button onClick={() => setEnEdition(false)}>Annuler</button>
        </div>
      )}
      <div id="goToProfilpost">
        <button onClick={GoToProfile}>Voir mon profil</button>
      </div>
    </div>
  );
      }
// export default function UserProfil() {
 
 
//  function modifierProfil(){





  
//  }
 
 
//   const [userProfil, setUserProfil] = useState({});
//   const [nomUtilisateur, setNomUtilisateur] = useState('field'); // Déclare la variable nomUtilisateur

//   useEffect(() => {
//     const ws = new WebSocket('ws://localhost:8080/ws');
//     ws.onopen = function () {
//       const message = {
//         type: 'profil',
//         data: nomUtilisateur, // Il faudra mettre l'utilisateur concerne quand la session sera faite
//       };
//       ws.send(JSON.stringify(message));
//     };

//     ws.onmessage = function (event) {
//       const data = JSON.parse(event.data);
//       setUserProfil(data);
//     };

//     return () => {
//       ws.close();
//     };
//   }, [nomUtilisateur]); // Utilise la variable nomUtilisateur comme dépendance de l'effet

//   return (
//     <div className='userProfil'>
//       {/* <input
//         type='text'
//         value={nomUtilisateur}
//         onChange={(e) => setNomUtilisateur(e.target.value)} // Met à jour la variable nomUtilisateur à chaque changement de saisie de l'utilisateur
//       /> */}
//       <br />
//       Prenom :&nbsp;&nbsp; {userProfil.firstName} <br />
//       Nom : &nbsp;&nbsp;{userProfil.lastName} <br />
//       Surnom :&nbsp;&nbsp;{userProfil.surnom}
//       <br />
//       Email : &nbsp;&nbsp;{userProfil.email}
//       <br />
//       Né le :&nbsp;&nbsp;{userProfil.anniv}
//       <br />
//       Avatar :&nbsp;&nbsp;{userProfil.avatar}
//       <br />
//       A propos de moi : &nbsp;&nbsp;{userProfil.propos}
//       <br />
    
//       <div id="modifierProfil"></div>
//       <input type= "button" value="ModifierProfil" onClick={modifierProfil}></input>
//     </div>
    
//   );
// }
