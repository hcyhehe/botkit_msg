<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>strophe.js 登录连接探索</title>
    <link rel="stylesheet" href="/public/css/common.css">
    <link rel="stylesheet" href="/public/css/chat.css">
    <script src="/public/js/jq.min.js"></script>
    <script src="/public/js/axios.js"></script>
    <script src="/public/js/jq.cookie.js"></script>
    <script src="/public/js/jq.md5.js"></script>
    <script src="/public/js/utils.js"></script>
    <!-- 连接xmpp -->
    <script src="/public/js/flXHR.min.js"></script>
    <script src="/public/js/strophe.js"></script>
    <script src="/public/js/strophe.flxhr.js"></script>
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
    </div>

    <script src="/public/js/login.js"></script>
</body>

</html>