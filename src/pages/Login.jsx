import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../component/PasswordInput';
import { useDarkMode } from '../hooks/useDarkMode';
import { saveUser } from '../utils/StorageUtils';

export default function Login() {
  const navigate = useNavigate();
  const inputRef = useRef();
  const [loginerror, setloginerror] = useState(false);
  const [toggleDarkMode] = useDarkMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(false);
  const [unexistingAccount, setUnexistingAccount] = useState(false)
  function InviteSwitch() {
    setInvite(!invite);
  }
  function handleClick() {
    //check if email and password are not empty and if invite is checked
    console.log((email === '' || password === '') && invite === false);
    if ((email === '' || password === '') && invite === false) {
      setloginerror(true)
      setUnexistingAccount(false)
      return;
    }else if (invite === true) {
      setloginerror(false)
      setUnexistingAccount(false)
      setEmail('');
      setPassword('');
    }
    console.log(email);
    console.log(password);
    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'login',
          data: {
            email: email,
            password: password,
          },
        })
      );
    };
    ws.onmessage = (e) => {
      console.log(e.data);
      if (e.data==='invite') {
        if (invite==false) {
          setUnexistingAccount(true)
          
          return
        }
        saveUser('guest')
        navigate('/');
      }else{
        const data = JSON.parse(e.data);
        console.log(data);
        localStorage.removeItem('user');
        localStorage.setItem('UUID', data.session_id);
        saveUser(data.utilisateur)
        
        navigate(`/profil`);
      }
      
    };
    /* console.log(inputRef.current.value);
    navigate(`/user/${inputRef.current.value}`);
    inputRef.current.value = ''; */
   
  }

  function returnToMenu() {
    navigate('/');
  }

  return (
    <>
      {loginerror &&(
        <div className='LoginError'>Certains champs sont vides !</div>
      )}
      {unexistingAccount && (
        <div className='LoginError'>Ce compte n'existe pas ou certaines informations sont érronés ! </div>
      )}
      <div className='AppMenu'>
        <input type='text' ref={inputRef} placeholder="Email" onChange={(e)=>setEmail(e.target.value)}/>
        <PasswordInput value={password} placeholder='Mot de passe' onChangeHandler={(e) => setPassword(e.target.value)} />
        <button onClick={handleClick}>Login</button>
        <span>Or</span>
        <button id='invite' name='invite' onClick={()=>{InviteSwitch();console.log(invite)}}>Connect as guest</button>
      </div>
    </>
  );
}
