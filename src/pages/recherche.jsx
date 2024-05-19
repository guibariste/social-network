import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProfilExt from "./ProfilExt";
import "./_recherche.css";

export default function Recherche() {
  const [userRecherche, setUserRecherche] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false); // mettre l'état initial de showResults à false
  const [filteredRecherche, setFilteredRecherche] = useState([]); // nouvel état pour stocker les résultats filtrés
  const [nomFinal, setnomFinal] = useState("");
  const [showProfilExt, setShowProfilExt] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws");
    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/ws");
    ws.onopen = function () {
      const message = {
        type: "recherche",
        data: {},
      };
      ws.send(JSON.stringify(message));
    };
    ws.onmessage = function (event) {
      event.preventDefault();
      const data = JSON.parse(event.data);
      setUserRecherche(data); // mettre à jour le state userRecherche avec les données reçues du WebSocket
    };
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      setShowProfilExt(false);
      const filtered = userRecherche.filter((user) => {
        return (
          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredRecherche(filtered);
      setShowResults(true);
    } else {
      setFilteredRecherche([]);
      setShowResults(false);
    }
  }, [searchTerm, userRecherche]);
  function handleMouseEnter(index) {
    const newList = [...filteredRecherche];
    newList[index].hovered = true;
    setFilteredRecherche(newList);
  }

  function handleMouseEnter(index) {
    const newList = [...filteredRecherche];
    newList[index].hovered = true;
    setFilteredRecherche(newList);
  }

  function handleMouseLeave(index) {
    const newList = [...filteredRecherche];
    newList[index].hovered = false;
    setFilteredRecherche(newList);
  }

  function handleClick(name) {
    const lastName = name.split(" ")[0];
    setSearchTerm(name);
    setShowResults(false);
    setnomFinal(name);
    localStorage.setItem("nomPourGo", lastName);
  }

  function validerRecherche() {
    setShowProfilExt(true);
  }

  function handleProfilExt() {
    //  ProfilExt()
    navigate("/ProfilExt"); // Redirigez l'utilisateur vers la page souhaitée
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
        autoFocus={true}
      />
      <button className="bouton" onClick={validerRecherche}>
        Rechercher
      </button>
      {showResults && (
        <div id="montreRecherche">
          {filteredRecherche.map((user, index) => (
            <div
              key={user.firstName + user.lastName}
              onClick={() => handleClick(`${user.firstName} ${user.lastName}`)}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={() => handleMouseLeave(index)}
              className={user.hovered ? "hovered" : ""}
            >
              <div>
                <div onClick={handleProfilExt} className="userinlist">
                  {user.firstName} {user.lastName}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
