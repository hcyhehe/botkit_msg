module.exports = app => {
    const { router, controller, io } = app;
    // render.
    router.get('/', controller.loginCtl.index);
    router.get('/chat', controller.chatCtl.index);

    // api.
    router.post('/notek/encrypt', controller.loginCtl.encrypt);

    // socket.io
    io.of('/').route('botkitToServer', io.controller.server.botkitToServer)
}