import AppHeader from "../component/Header";
export default function UserLayout({ component }) {
  return (
    
    <>
      <AppHeader />
      {component}
    </>
  );
}
