module.exports = app => {
    const { router, controller, io } = app
    // render.
    router.get('/', controller.loginCtl.index)
    router.get('/chat', controller.chatCtl.index)

    // api.
    router.post('/notek/encrypt', controller.loginCtl.encrypt)
    router.get('/*.js', controller.loginCtl.retjs)  //解决静态文件404的问题

    // socket.io
    // io.route('botkitToServer', app.io.controller.server.botkitToServer)
    // io.of('/').route('botkitToServer', io.controller.server.botkitToServer)
}