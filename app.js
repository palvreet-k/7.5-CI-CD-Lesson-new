const express = require('express')
const app = express()

app.use(express.json())

const menuItems = [
  { id: 1, name: 'Espresso', price: 3.50 },
  { id: 2, name: 'Cappuccino', price: 4.50 },
  { id: 3, name: 'Latte', price: 5.00 },
  { id: 4, name: 'Cold Brew', price: 4.00 },
  { id: 5, name: 'Matcha Latte', price: 5.50 },
]

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Code Bean Café API ☕' })
})

app.get('/menu', (req, res) => {
  res.json(menuItems)
})

app.get('/menu/:id', (req, res) => {
  const item = menuItems.find(i => i.id === parseInt(req.params.id))
  if (!item) return res.status(404).json({ error: 'Item not found' })
  res.json(item)
})

module.exports = app
