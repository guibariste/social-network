import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../component/PasswordInput';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Login() {
  const navigate = useNavigate();
  const inputRef = useRef();

  const [toggleDarkMode] = useDarkMode();
  const [noerror, setNoError] = useState(true)
  const [surnom, setSurnom] = useState();
  const [email, setEmail] = useState();
  const [firstName, setFirstName] = useState();
    const [lastName, setLastName] = useState();
    const [anniv, setAnniv] = useState();
    const [avatar, setAvatar] = useState();
  const [password, setPassword] = useState();
    const [propos, setPropos] = useState();
  function IsValidToSubmit() {
    if (email==''||firstName==''||lastName==''||anniv==''||password==''){
      document.getElementById('rgstr').style.display = "none";
    } else if (email==null||firstName==null||lastName==null||anniv==null||password==null){
      document.getElementById('rgstr').style.display = "none";
    } else {
      document.getElementById('rgstr').style.display = "flex";
    }
  }
  function handleClick() {
    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'register',
            data: {
              email: email,
              firstName: firstName,
              lastName: lastName,
              surnom: surnom==undefined ? "": lastName,
              anniv: anniv,
              avatar: avatar==undefined ? "https://www.woolha.com/media/2020/03/eevee.png" : avatar,
              password: password,
              propos: propos==undefined ? "": propos,
              ispublic: true,
              followers: "",
              followed: "",
              pending: ""
            },
        }));
        console.log("surnom: "+surnom+" email: "+email+" firstName: "+firstName+" lastName: "+lastName+" anniv: "+anniv+" avatar: "+avatar+" password: "+password+" propos: "+propos+ " ispublic:"+ true+ "followers:" +[]+" followed:"+ [] + "pending" + [])
    };
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'register') {
            if (data.data === 'success') {
                navigate('/login');
            } 
            else if (data.data === 'failure') {
             setNoError(false)
          }else {
             setNoError(false)
            }
        }
    };
    console.log(inputRef.current.value);
    
    inputRef.current.value = '';
  }

  function returnToMenu() {
    navigate('/');
  }

  return (
    <>
      <div className='AppMenu'>
        <input type='text' ref={inputRef} placeholder="Surnom (optionel)" id='username' onChange={(e) => {setSurnom(e.target.value);console.log(e.target.value);IsValidToSubmit()}}/>
        <br></br>
        <input type='text' placeholder="Email" id='email' onChange={(e) => {setEmail(e.target.value);IsValidToSubmit()}}/>
        <br></br>
        <input type='text' placeholder="Prénom" id='firstName' onChange={(e) => {setFirstName(e.target.value);IsValidToSubmit()}}/>
        <br></br>
        <input type='text' placeholder="Nom" id='lastName' onChange={(e) => {setLastName(e.target.value);IsValidToSubmit()}}/>
        <br></br>
        <input type='date' placeholder="Anniv" id='anniv' onChange={(e) => {setAnniv(e.target.value);IsValidToSubmit()}}/>
        <br></br>
        <input type='text' placeholder="Propos (optionnel)" id='propos' onChange={(e) => {setPropos(e.target.value);IsValidToSubmit()}}/>
        <br></br>
        <input type='text' placeholder="Avatar link (optionnel)" id='avatar' onChange={(e) => {setAvatar(e.target.value);IsValidToSubmit()}}/>
        <PasswordInput value={password} placeholder='Mot de passe' onChangeHandler={(e) => {setPassword(e.target.value);IsValidToSubmit()}} />
      <button onClick={handleClick} id="rgstr">Register</button>
        {!noerror&&(
          <p className='RegisterError'>Cet email ou ce nom est déjà utilisé !</p>
        )}
      </div>
    </>
  );
}
