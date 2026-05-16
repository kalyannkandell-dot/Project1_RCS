require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')

const app = express()

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth',   require('./routes/auth'))
app.use('/api/user',   require('./routes/user'))
app.use('/api/files',  require('./routes/files'))
app.use('/api/groups', require('./routes/groups'))
app.use('/api/shared', require('./routes/shared'))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Hamro Cloud backend running on port ${PORT}`)
})