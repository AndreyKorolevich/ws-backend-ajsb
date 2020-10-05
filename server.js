const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const WS = require('ws');
const User = require('./User')

const app = new Koa();

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

const router = new Router();

router.get('/index', async (ctx) => {
  ctx.response.body = 'hello';
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7080;
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws, req) => {
  ws.on('message', async (msg) => {
    const message = JSON.parse(msg);

    if(message.type === 'name') {
      const user = await User.getByName(message.nick);
      if(!user) {
        const newUser = new User(message.nick);
        await newUser.save();
        ws.send(msg);
        return
      }
      ws.send(JSON.stringify({type:'error', text: 'There`s already such a user name'}));
      return
    }
     
    // ws.send('response');
    [...wsServer.clients]
    .filter(elem => elem.readyState === WS.OPEN)
    .forEach(elem => elem.send(msg));
  });

  ws.send(JSON.stringify({type:'response', text: [...wsServer.clients].length}));
});

server.listen(port);
