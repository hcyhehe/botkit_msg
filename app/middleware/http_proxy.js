const k2c = require('koa2-connect');
const httpProxy = require('http-proxy-middleware');

const proxyMap = {
    '/package': {
        url: ['baseaddess', 'javaurl']
    },
    '/py/search': {
        url: ['ability', 'searchurl']
    },
    '/newapi': {
        url: ['baseaddess', 'httpurl']
    },
    '/api': {
        url: ['baseaddess', 'httpurl']
    },
    '/file': {
        url: ['baseaddess', 'fileurl']
    }
}

const proxyMiddleware = () => {
    return async (ctx, next) => {
        for (var proxyKey in proxyMap) {
            if (ctx.url.startsWith(proxyKey)) {
                ctx.respond = false
                const { body } = ctx.request
                const contentType = ctx.request.header['content-type']
                const defaultOpt = {}

                if (proxyMap[proxyKey].pathRewrite) {
                    defaultOpt.pathRewrite = {
                        pathRewrite: {
                            [proxyMap.proxyKey.pathRewrite]: proxyKey
                        }
                    }
                }

                await k2c(httpProxy(proxyKey, Object.assign({
                    target: 'https://dev.fsll.tech:8443',
                    changeOrigin: true,
                    onProxyReq: (proxyReq) => {
                        if (body && contentType.indexOf('application/json') > -1) {
                            const bodyData = JSON.stringify(body)

                            proxyReq.setHeader('Content-Type', 'application/json')
                            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
                            proxyReq.write(bodyData)
                        }
                        else if (body && contentType.indexOf('application/x-www-form-urlencoded') > -1) {
                            const bodyData = Object.keys(body).map(key => `${key}=${body[key]}`).join('&')

                            proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded')
                            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
                            proxyReq.write(bodyData)
                        }
                    }
                }, defaultOpt)))(ctx, next)
            }
        }

        await next()
    }
}

module.exports = proxyMiddleware