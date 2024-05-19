import ReactHtmlParser from 'html-react-parser';
import { useEffect, useState } from "react";
import { getUser } from '../utils/StorageUtils';
import ProfilExt from "./ProfilExt";
import { useNavigate } from "react-router-dom";
export default function Posts() {
    const [posts, setPosts] = useState([]);
    const [message, setMessage] = useState("");
    const [comment, setComment] = useState("");
    const [selectionDisplay, setSelectionDisplay] = useState(false)
    const [userProfil, setUserProfil] = useState({});
    const [visibility, setVisibility] = useState("public");
    const [search, setSearch] = useState("");
    const [inputValue, setInputValue] = useState('');
    const [followed, setFollowed] = useState([]);
    const [image, setImage] = useState("");
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    var connected = false
    //const username = localStorage.getItem("UUID")
    if (getUser()!=null&&getUser()!="") {
        connected = true
    }
    const nomPourGo = getUser()
    console.log("NOMGO",nomPourGo)
    const navigate = useNavigate();
    if (nomPourGo == "" || nomPourGo == null) {
        navigate("/login")
    }
    let username = ""
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const getUser = urlParams.get('user');
        const getpostid = urlParams.get('id');
        if (getUser != '' && getUser != null) {
            setSearch(getUser);
        }else if (getpostid != '' && getpostid != null) {
            setSearch(getpostid);
        }
        const ws = new WebSocket('ws://localhost:8080/ws');
        ws.onopen = () => {
            ws.send(
                JSON.stringify({
                    type: 'post:fetch',
                    data: {
                    },
                })
            );
        };
        ws.onmessage = (e) => {
            SetPostsdata(e)
        };
    }, []);
    useEffect(() => {
        
            
        const ws = new WebSocket('ws://localhost:8080/ws');
        ws.onopen = () => {
            ws.send(
                JSON.stringify({
                    type: 'profilExt',
                    data: nomPourGo,
                })
                );
                console.log("NOMPOURGO",nomPourGo)
        };
        ws.onmessage = (e) => {
            console.log("E",e.data)
            if (e==undefined||e.data==undefined){
                e={data:{followed:"",surnom:"",image:""}}
            }
            
            setUserProfil(e)
            username = nomPourGo
        };
    }, []);
    function SetPostsdata(e) {
        const data = JSON.parse(e.data);
        for (let i = 0; i < data.length; i++) {
            if (data[i].comments == null) data[i].comments = []
        }
        setPosts(data);
        console.log(data)
    }
    function handleInputChange(event) {
        setInputValue(event.target.value);
    }
    function selection() {
        if (document.getElementById("visibility").value == "selection") {
            setSelectionDisplay(true)
        } else {
            setSelectionDisplay(false)
        }
    }
    function CreatePost() {
        const ws = new WebSocket('ws://localhost:8080/ws');
        let parsedMessage = message;
        const urls = message.match(urlRegex);
        if (urls !== null) {
          urls.forEach((url) => {
            parsedMessage = parsedMessage.replace(
              url,
              `<img src="${url}" alt="${url}" />`
            );
          });
        }
      
        if (message !== "") {
          ws.onopen = () => {
            ws.send(
              JSON.stringify({
                type: 'post',
                data: {
                  message: parsedMessage,
                  image: image==undefined?"":image,
                  visibility: visibility,
                  username: localStorage.getItem("UUID"),
                },
              })
            );
            ws.onmessage = (e) => {
              SetPostsdata(e);
            };
          };
        }
      }      
    var t=0
    t.T
    function CreateComment(postId) {
        const ws = new WebSocket('ws://localhost:8080/ws');
        let parsedComment = comment;
        const urls = comment.match(urlRegex);
      
        if (urls !== null) {
          urls.forEach((url) => {
            parsedComment = parsedComment.replace(
              url,
              `<img src="${url}" alt="${url}" />`
            );
          });
        }
        if (comment !== "") {
            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        type: 'comment',
                    data: {
                        message: parsedComment,
                        postId: postId,
                        username: localStorage.getItem("UUID"),
                    },
                })
                );
                ws.onmessage = (e) => {
                    SetPostsdata(e)
                };
                
            }
        }
    }
    const GoToProfile = (username) => {
        localStorage.setItem("nomPourGo",username)
        navigate("/ProfilExt")
    }
    return (
        <>
            <h1>Posts</h1>
            <input type="text" id="search" placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value)/* ; Search(e.target.value) */ }} />
            <button id="clearsearchbutton" onClick={() => setSearch("")}>Clear Search</button>
            <div id="posts">
                {posts.map((post) => {
                    
                    if (post.username.toLowerCase().includes(search.toLowerCase()) || post.message.toLowerCase().includes(search.toLowerCase()) || post.visibility.toLowerCase().includes(search.toLowerCase())||post.id.toString()==(search)) {
                        if ((post.visibility=="private" && JSON.parse(userProfil.data).followed.includes(post.username))||post.visibility=="public"||(post.username==nomPourGo)) {
                            return (
                                <div className="post" key={post.id}>
                                    <div className="user">by <strong onClick={()=>GoToProfile(post.username)}>{post.username}</strong> in {post.visibility}</div>
                                    <div className="message">{ReactHtmlParser(post.message)}</div>
                                    <div className="image">{post.image}</div>
                                    <div className="inputcomment">
                                        <textarea type="text" id="message" placeholder="Comment" onChange={(e) => setComment(e.target.value)} />
                                        <br></br>
                                        <button id="createcommentbutton" onClick={() => CreateComment(post.id)}>Create Comment</button>
                                    </div>
                                    <hr></hr>
                                    <div className="comments">
                                        {post.comments.map((comment) => {
                                            return (
                                                <div className="comment" key={comment.id}>
                                                    <span className="commentSender">{comment.sender}</span>
                                                    <span className="commentDate">&nbsp;{comment.date}</span>
                                                    <div className="commentMessage">{ReactHtmlParser(comment.message)}</div>
                    
                                                </div>
                                            )
                                        })}
                                        </div>
                                </div>
                            )
                        }
                    }else if (search == ""){
                        return(
                            <div className="post" key={post.id}>
                                <div className="user">{post.username}</div>
                                <div className="message">{post.message}</div>
                                <div className="image">{post.image}</div>
                                <div className="visibility">{post.visibility}</div>
                            </div>
                        )
                    }
                }
                )}
            </div>
            {connected &&(
            <div id="createpost">
                <textarea type="text" id="message" placeholder="Message" onChange={(e) => setMessage(e.target.value)}/>
                <button id="createpostbutton" onClick={CreatePost}>Create Post</button>
                <br></br>
                <select id="visibility" placeholder="Visibility" onChange={(e) => { setVisibility(e.target.value); console.log(e.target.value); selection() }}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="selection">Selection</option>
                </select>
                {selectionDisplay && (
                    <div>   
                        <input onChange={handleInputChange} type="text" id="inputusername" placeholder="name"></input>
                        <button>Add <span className="y" id="spanusername">{inputValue}</span> to post visisibility</button>
                    </div>
                )}
            </div>
            )}
        </>
    )
}