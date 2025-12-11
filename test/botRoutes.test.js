import chai from 'chai';
import chaiHttp from 'chai-http';
import express from 'express';
import mongoose from 'mongoose';
import http from 'http';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const chaiCommonJs = require('chai');
const chaiHttpCommonJs = require('chai-http');

chaiCommonJs.use(chaiHttpCommonJs);
const { expect } = chaiCommonJs;

// Since the server is an esm module without default export, create a test app with routes mounted
import botRoutes from '../src/routes/botRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/bot', botRoutes);

let server;
let token = '';
let conversationId = '';

describe('Bot API Routes', () => {
  before((done) => {
    // Start server before tests
    server = http.createServer(app).listen(4005, async () => {
      // Login to get JWT token
      try {
        const res = await chaiCommonJs.request(server)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'testpassword' }); // Replace with valid test user credentials

        token = res.body.token;
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  after((done) => {
    mongoose.disconnect();
    server.close(done);
  });

  it('should create or get conversation', (done) => {
    chaiCommonJs.request(server)
      .post('/api/bot/conversation')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 'dummyUserId' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('_id');
        conversationId = res.body._id;
        done();
      });
  });

  it('should send message to bot and receive reply', (done) => {
    chaiCommonJs.request(server)
      .post('/api/bot/message')
      .set('Authorization', `Bearer ${token}`)
      .send({ conversationId, text: 'Hello bot' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('reply');
        done();
      });
  });

  it('should get conversation message history', (done) => {
    chaiCommonJs.request(server)
      .get(`/api/bot/conversation/${conversationId}`)
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('array');
        done();
      });
  });
});
