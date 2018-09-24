import { exec } from 'child_process'
import { Request, Response } from 'express'
import { Application } from '../application'
import { Thingerator } from '../thingerator'

// use glitch env to get correct domain welcome message
// https://glitch.com/help/project/
const domain = process.env.PROJECT_DOMAIN || `http://localhost:${process.env.PORT || 3000}`
const welcomeMessage = `\nWelcome to Probot! Go to ${domain} to get started.\n`

export = async (app: Application, setup: Thingerator = new Thingerator()) => {
  app.log.info(welcomeMessage)

  if (process.env.NODE_ENV !== 'production' && !process.env.PROJECT_DOMAIN) {
    await setup.createWebhookChannel()
  }

  const route = app.route()

  route.get('/probot', async (req, res) => {
    const protocols = req.headers['x-forwarded-proto'] || req.protocol
    const protocol = typeof protocols === 'string' ? protocols.split(',')[0] : protocols[0]
    const host = req.headers['x-forwarded-host'] || req.get('host')
    const baseUrl = `${protocol}://${host}`

    const pkg = setup.pkg
    const manifest = setup.getManifest(pkg, baseUrl)
    const createAppUrl = setup.createAppUrl
    // Pass the manifest to be POST'd
    res.render('setup.hbs', { pkg, createAppUrl, manifest })
  })

  route.get('/probot/setup', async (req: Request, res: Response) => {
    const { code } = req.query
    const response = await setup.createAppFromCode(code)

    if (process.env.PROJECT_DOMAIN) {
      exec('refresh', (err, stdout, stderr) => {
        if (err) {
          app.log.error(err, stderr)
        }
      })
    }

    // Programmatically detect if users are running app with nodemon?
    // if not
    // app.log.info(`We noticed you weren't using nodemon! Be sure to restart your app, since your .env has been updated.`)
    res.redirect(`${response.data.html_url}/installations/new`)
  })

  route.get('/probot/success', async (req, res) => {
    res.render('success.hbs')
  })

  route.get('/', (req, res, next) => res.redirect('/probot'))
}
