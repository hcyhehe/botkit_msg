exports.keys = 'notek';

// 添加 view 配置.
exports.view = {
    defaultViewEngine: 'nunjucks',
    mapping: {
        '.tpl': 'nunjucks',
    },
};

// 允许跨域.
exports.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH'
};

// require
exports.middleware = [
    'httpProxy'
];

exports.cluster = {
    listen: {
      path: '',
      port: 8086,
      hostname: '0.0.0.0',
    }
}
