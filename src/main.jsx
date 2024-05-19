import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './pages/App';
import Login from './pages/Login';
import Register from './pages/Register';
import Posts from './pages/Posts';
import Message from './pages/Message';
import Group from './pages/Group';
import Settings from './pages/Settings';
import './index.css';
import UserProfil from './pages/UserProfil';
import UserLayout from './layout/UserLayout';
import ProfilExt from './pages/ProfilExt';
import Recherche from './pages/recherche';
import CreerGroupe from './pages/creerGroupe';
import VoirGroupes from './pages/voirGroupes';
import RechercheGroupes from './pages/rechercheGroupes';
const myRouter = createBrowserRouter([
  {
    path: '/',
    element: <UserLayout component={<App />} />,
  },
  {
    path: '/profil',
    element: <UserLayout component={<UserProfil />} />,
  },
  {
    path: '/login',
    element: <UserLayout component={<Login />} />,
  },
  {
    path: '/register',
    element: <UserLayout component={<Register />} />,
  },
  {
    path: '/posts',
    element: <UserLayout component={<Posts />} />,
  },
  {
    path: '/message',
    element: <UserLayout component={<Message />} />,
  },
  {
    path: '/group',
    element: <UserLayout component={<Group />} />,
  },
  {
    path: '/creerGroupe',
    element: <UserLayout component={<CreerGroupe />} />,
  },
  {
    path: '/voirGroupes',
    element: <UserLayout component={<VoirGroupes/>} />,
  },
  {
    path: '/rechercheGroupe',
    element: <UserLayout component={<RechercheGroupes/>} />,
  },
  {
    path: '/settings',
    element: <UserLayout component={<Settings />} />,
  },
  {
    path: '/ProfilExt',
    element: <UserLayout component={<ProfilExt/>} />,
  }, 
    {
    path: '/recherche',
    element: <UserLayout component={<Recherche/>} />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <RouterProvider router={myRouter} />

  //<React.StrictMode>

  //</React.StrictMode>,
);