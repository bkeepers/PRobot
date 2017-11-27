// FIXME: move this to a test helper that can be used by other apps

const cacheManager = require('cache-manager')
const GitHubApi = require('github')
const {createRobot} = require('../..')

const cache = cacheManager.caching({store: 'memory'})

const app = jest.fn().mockReturnValue('test')

module.exports = {
  createRobot () {
    return createRobot({app, cache})
  }
}
