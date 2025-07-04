import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// Dossier de base pour stocker les catégories et documents
const UPLOADS_DIR = path.join('uploads', 'documents')

// Fichier JSON pour stocker les catégories
const CATEGORIES_FILE = path.join(UPLOADS_DIR, 'categories.json')

// Charger ou initialiser les catégories persistantes
let categories = []
if (fs.existsSync(CATEGORIES_FILE)) {
  try {
    const raw = fs.readFileSync(CATEGORIES_FILE, 'utf-8')
    categories = JSON.parse(raw)
  } catch {
    categories = []
  }
} else {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2))
}

// Fonction pour sauvegarder les catégories dans le fichier
function saveCategories() {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2))
}

// Multer storage : dossier spécifique par catégorie
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.params.category
    if (!categories.includes(category)) return cb(new Error('Catégorie invalide'))

    const dir = path.join(UPLOADS_DIR, category)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    // Pour éviter conflit : champ + timestamp + extension
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + Date.now() + ext)
  }
})

// Limiter aux types autorisés (docx, pdf, txt, xls, ppt, etc.)
const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]

const uploadDocuments = multer({
  storage: documentStorage,
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Type de fichier non autorisé'))
    }
  }
})

// --- Routes ---

// Lister les catégories existantes
router.get('/categories', (req, res) => {
  res.json({ categories })
})

// Créer une nouvelle catégorie
router.post('/categories', (req, res) => {
  const { name } = req.body
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Nom de catégorie invalide' })
  }
  const sanitized = name.trim().toLowerCase().replace(/\s+/g, '-')

  if (categories.includes(sanitized)) {
    return res.status(409).json({ error: 'Catégorie déjà existante' })
  }

  categories.push(sanitized)
  saveCategories()
  res.json({ success: true, category: sanitized })
})

// Upload de documents dans une catégorie existante
router.post('/upload/:category', uploadDocuments.array('documents'), (req, res) => {
  const category = req.params.category
  if (!categories.includes(category)) return res.status(400).json({ error: 'Catégorie invalide' })

  res.json({ success: true })
})

// Lister documents d’une catégorie
router.get('/:category', (req, res) => {
  const category = req.params.category
  if (!categories.includes(category)) return res.status(400).json({ error: 'Catégorie invalide' })

  const dir = path.join(UPLOADS_DIR, category)
  if (!fs.existsSync(dir)) return res.json({ documents: [] })

  fs.readdir(dir, (err, files) => {
    if (err) return res.json({ documents: [] })

    const documents = files.map(filename => {
      const stats = fs.statSync(path.join(dir, filename))
      return {
        name: filename,
        uploadedAt: stats.birthtime,
        size: stats.size
      }
    })
    res.json({ documents })
  })
})

// Supprimer un document
router.delete('/:category/:filename', (req, res) => {
  const { category, filename } = req.params
  if (!categories.includes(category)) return res.status(400).json({ error: 'Catégorie invalide' })

  const filePath = path.join(UPLOADS_DIR, category, filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier non trouvé' })

  fs.unlink(filePath, err => {
    if (err) return res.status(500).json({ error: 'Erreur lors de la suppression' })
    res.json({ success: true })
  })
})

export default router
