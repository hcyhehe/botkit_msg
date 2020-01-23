<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>strophe.js 登录连接探索</title>
    <link rel="stylesheet" href="/public/css/common.css">
    <link rel="stylesheet" href="/public/css/chat.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.10/handlebars.min.js"></script>
    <script src="https://cdn.bootcss.com/showdown/1.9.0/showdown.min.js"></script>
    <script src="/public/js/jq.min.js"></script>
    <script src="/public/js/axios.js"></script>
    <script src="/public/js/jq.cookie.js"></script>
    <script src="/public/js/jq.md5.js"></script>
    <script src="/public/js/utils.js"></script>
    <!-- 连接xmpp -->
    <script src="/public/js/flXHR.min.js"></script>
    <script src="/public/js/strophe.js"></script>
    <script src="/public/js/strophe.flxhr.js"></script>
    <script src="/public/js/socket.io.js"></script>
    <script src="/public/js/botkit.js"></script>
</head>

<body>
    <form class="login">
        <label for="username">
            <input type="text" id="username" placeholder="用户名">
        </label>
        <label for="pwd">
            <input type="password" id="pwd" placeholder="密码">
        </label>
        <button type="button" id="connect">登录</button>
    </form>

    <div class="chat">
        <!-- 用户列表 -->
        <h2>单聊会话列表</h2>
        <ul class="user-list"></ul>
        <!-- 群列表 -->
        <h2>群聊会话列表</h2>
        <ul class="group-list"></ul>

        <!-- 单聊/群聊切换 -->
        <div class="btn-box btn-switch">
            <button class="single-chat">创建新的群</button>
        </div>
        
        <!-- 当前聊天用户提示 -->
        <p class="send-to-tip"></p>

        <!-- 消息列表 -->
        <div class="show-msg"></div>

        
        <!-- 输入框 -->
        <div class="send-chat" contenteditable="true"></div>

        <div class="btn-box">
            <button class="send active">发送</button>
        </div>


        <!-- <div class="wrapper">
            <div id="message_window">
                <div class="disconnected">
                未连接... 重连中!
                </div>
                <div class="offline">
                已掉线! 重新建立连接...
                </div>
                <div class="powered_by">
                来自机器人的对话
                </div>
                <section>
                    <div id="message_list">
                        <div id="message_template">
                            <div>123123</div>       
                        </div>
                    </div>
                </section>
                <div id="message_replies">
                </div>
                <footer>
                    <form onsubmit="Botkit.send(Botkit.input.value, event)">
                        <input type="text" autocomplete="off" id="messenger_input" placeholder="说点什么好呢" value="" />
                        <button id="send_btn" type="submit">发送</button id="hello_btn">
                    </form>
                </footer>
            </div>
        </div> -->

    </div>

    <script src="/public/js/login.js"></script>
</body>

</html>