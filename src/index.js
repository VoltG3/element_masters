import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Provider } from 'react-redux'
import { ThemeProvider } from 'styled-components'
import store from './store'
import theme from './styles/theme'
import GlobalStyles from './styles/GlobalStyles'
import './i18n/i18n'
import './index.css'
import App from './App'
import Home from "./sections/chapters/home"
import Game from "./sections/chapters/game"
import {Editor} from "./sections/chapters/editor/Editor"
import Crystals from "./sections/chapters/crystals"
import Repository from "./sections/chapters/repository"

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <Provider store={store}>
        <ThemeProvider theme={theme}>
            <GlobalStyles />
            <BrowserRouter basename={process.env.PUBLIC_URL}>
                <Routes>

                <Route path="/" element={<App />}>
                    <Route index element={<Home />} />
                    <Route path="game" element={<Game />} />
                    <Route path="editor" element={<Editor />} />
                    <Route path="crystals" element={<Crystals />} />
                    <Route path="repository" element={<Repository />} />
                </Route>

                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    </Provider>
)
