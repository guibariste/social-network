import AppHeader  from "../component/Header"
import { useNavigate } from 'react-router-dom';
import "./_app.css"
function App() {
  const navigate = useNavigate();

  function navig(way) {
      navigate(way);
  }
  return (
    <div className="AccueilMenu">
      <h1>Bienvenue sur GuibarNetwork, pourquoi ne pas commencer par créer un
        <button onClick={() => navig('/posts')} className='ButtonHeader'>Posts</button> ?
        <br></br>
        <br></br>
        Rejoignez notre communauté de créateur ! 
      </h1>
    </div>

  );
}

export default App;
