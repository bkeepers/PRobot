const express = require('express')
const responseTime = require('response-time')
const path = require('path')

module.exports = function (webhook) {
  const app = express()
  app.set('x-powered-by', false)

  app.use(responseTime())

  app.use('/probot/static/', express.static(path.join(__dirname, '..', 'static')))
  app.use(webhook)
  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, '..', 'views'))

  app.get('/ping', (req, res) => res.end('PONG'))

  return app
}
