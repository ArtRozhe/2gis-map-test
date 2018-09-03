import express from 'express';
import path from 'path';
import open from 'open';
import webpack from 'webpack';
import webpackHotMiddleware from 'webpack-hot-middleware';
import webpackDevMiddleware from 'webpack-dev-middleware';
import config from '../webpack.config.dev';

const port = 3000;
const app = express();
const compiler = webpack(config);

/* eslint-disable no-console */

app.use(webpackDevMiddleware(compiler, {
    noInfo: true,
    publicPath: config.output.publicPath
}));

app.use(webpackHotMiddleware(compiler));

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '../src/index.html'));
});

app.get('/users', function(req, res) {
    // Hard coding for simplicity. Pretend this hits a real database
    res.json([
        {"id": 1,"name":"Bob"},
        {"id": 2,"name":"Tammy"},
        {"id": 3,"name":"Tina"}
    ]);
});

app.listen(port, function (err) {
    if (err) {
        console.log(err);
    } else {
        open('http://localhost:' + port);
    }
});
