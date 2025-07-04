import express from 'express'
import cors from 'cors'
import imagesRoutes from './imagesRoutes.js'  // adapte le chemin si besoin
import documentsRoutes from './documentsRoutes.js' // adapte le chemin

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))
app.use('/documents', documentsRoutes)

app.use('/', imagesRoutes)

const PORT = 3000
app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur http://localhost:${PORT}`)
})