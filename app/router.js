module.exports = app => {
    const { router, controller } = app;
    // render.
    router.get('/', controller.loginCtl.index);
    router.get('/chat', controller.chatCtl.index);

    // api.
    router.post('/notek/encrypt', controller.loginCtl.encrypt);
};