// const BASE_URL = 'https://dev.fsll.tech:8443';
const BASE_WEBSOCKET_URL = 'wss://dev.fsll.tech:8443/websocket/';

// strophe连接xmpp服务器句柄 操作xml数据使用.
let connection;

/** xmpp服务器连接状态 **/
// status contains:
// ERROR: 0,            错误
// CONNECTING: 1,       连接中
// CONNFAIL: 2,         连接失败
// AUTHENTICATING: 3,   认证中
// AUTHFAIL: 4,         认证失败
// CONNECTED: 5,        已连接
// DISCONNECTED: 6,     已断开连接
// DISCONNECTING: 7,    断开连接中
// ATTACHED: 8,         附加
// REDIRECT: 9,         重定向
// CONNTIMEOUT: 10      连接超时

const onConnect = status => {
    switch (status) {
        case Strophe.Status.ERROR:
            $('#msg').append('<p>错误</p>');
            break;

        case Strophe.Status.CONNECTING:
            $('#msg').append('<p>正在连接xmpp服务器</p>');
            break;
        
        case Strophe.Status.AUTHENTICATING:
            $('#msg').append('<p>正在登录</p>');
            break;

        case Strophe.Status.AUTHFAIL:
            $('#msg').append('<p>登录失败</p>');
            break;

        case Strophe.Status.DISCONNECTING:
            $('#msg').append('<p>正在断开连接</p>');
            break;

        case Strophe.Status.CONNTIMEOUT:
            $('#msg').append('<p>连接超时</p>');
            break;

        case Strophe.Status.DISCONNECTED:
            $('#msg').append('<p>连接断开</p>');
            break;

        case Strophe.Status.CONNECTED:
            $('#msg').append('<p>登录成功</p>');

            connection.addHandler(msg => {
                const info = msg.getAttribute('from').split('@');
                $('#msg').append(`<p>hello, ${info[0]}, you are connected to ${info[1]}</p>`);
            }, null, 'presence', 'notify', null, null);
            break;
    }
};

// click the button to start connecting to the xmpp server.
document.querySelector('#connect').addEventListener('click', () => {
    // $.ajax('https://dev.fsll.tech:8443/startalk_nav');


    connection = new Strophe.Connection(BASE_WEBSOCKET_URL);
    // connect params:
    // username: test01@dev.fsll.tech
    // password: 暂时从react项目每次动态生成. 还未抽离鉴权相关代码.
    connection.connect('test02@dev.fsll.tech', 'inYcpiSG8EUAiOF6EDYA2ZDRbNmkYRTSCM6awRJeIDGrR03LRTz4JcWIp1XQwo2HdODPzay6qg8UoU3XDJ44kwhNkq3UOv5dw+WOaYzpEIRQ0lwn2vOqmpMmh9qQad/6n0JUbmPk++TOhILWDcJ2r8H0X64t1wXToTi7N8lw3Ug=', onConnect);
});