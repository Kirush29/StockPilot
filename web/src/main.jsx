import React from 'react'
import ReactDOM from 'react-dom/client'
// Styles first: global.css declares the cascade-layer order that tailwind.css and the pages rely on.
import './shared/theme/global.css'
import './shared/theme/tailwind.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
