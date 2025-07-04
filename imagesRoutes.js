import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'

const router = express.Router()

const categories = ['commerce', 'sous-sol', 'cuisine', 'couloir', 'sdb', 'reserve']

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.params.category
    if (!categories.includes(category)) return cb(new Error('Catégorie invalide'))

    const dir = `uploads/${category}`
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + Date.now() + ext)
  }
})
const uploadImages = multer({ storage: imageStorage })

// Upload images pour une catégorie
router.post('/upload/:category', uploadImages.array('photos'), (req, res) => {
  const category = req.params.category
  if (!categories.includes(category)) return res.status(400).json({ error: 'Catégorie invalide' })

  res.json({ success: true })
})

// Récupérer les images d’une catégorie
router.get('/photos/:category', (req, res) => {
  const category = req.params.category
  if (!categories.includes(category)) return res.status(400).json({ error: 'Catégorie invalide' })

  const dir = path.join('uploads', category)
  if (!fs.existsSync(dir)) return res.json({ photos: [] })

  fs.readdir(dir, (err, files) => {
    if (err) return res.json({ photos: [] })
    res.json({ photos: files })
  })
})

// Supprimer une image
router.delete('/photos/:category/:filename', (req, res) => {
  const { category, filename } = req.params
  if (!categories.includes(category)) return res.status(400).json({ error: 'Catégorie invalide' })

  const filePath = path.join('uploads', category, filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier non trouvé' })

  fs.unlink(filePath, err => {
    if (err) return res.status(500).json({ error: 'Erreur lors de la suppression' })
    res.json({ success: true })
  })
})

export default router
