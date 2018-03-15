const bunyan = require('bunyan')

module.exports = {
  repository: repository => repository.full_name,
  event: event => {
    if (typeof event !== 'object' || !event.payload) {
      return event
    }

    let name = event.name
    if (event.payload && event.payload.action) {
      name = `${name}.${event.payload.action}`
    }

    return {
      id: event.id,
      name: name,
      repository: event.payload.repository && event.payload.repository.full_name,
      installation: event.payload.installation && event.payload.installation.id
    }
  },
  installation: installation => {
    if (installation.account) {
      return installation.account.login
    } else {
      return installation
    }
  },

  err: error => Object.assign(bunyan.stdSerializers.err(error), {event: error.event}),

  req: bunyan.stdSerializers.req,

  // Same as buyan's standard serializers, but gets headers as an object
  // instead of a string.
  // https://github.com/trentm/node-bunyan/blob/fe31b83e42d9c7f784e83fdcc528a7c76e0dacae/lib/bunyan.js#L1105-L1113
  res (res) {
    if (!res || !res.statusCode) {
      return res
    } else {
      return {
        duration: res.duration,
        statusCode: res.statusCode,
        headers: res.getHeaders()
      }
    }
  }
}
