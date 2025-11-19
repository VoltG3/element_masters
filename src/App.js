import { Outlet, Link } from "react-router-dom"

function App() {
  return (
    <>
        <nav style={{ display: "flex", gap: "20px" }}>
            <Link to="/">Home</Link>
            <Link to="/game">Game</Link>
            <Link to="/editor">Editor</Link>
        </nav>

        <Outlet />
    </>
  )
}

export default App
