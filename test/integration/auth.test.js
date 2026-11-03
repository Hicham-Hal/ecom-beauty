import request from 'supertest'
import app from '../../app.js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { clearTestDb, closeTestDb, connectTestDb } from '../setup.js'
import { createAuthedUser } from '../helpers/helper.js'

beforeAll(connectTestDb)
afterEach(clearTestDb)
afterAll(closeTestDb)


describe('POST /register', ()=>{
    it('create a user with role of customer and returns an access token', async() => {
        const res = await request(app).post('/register').send({
            name: 'userd',
            email: 'user@gmail.com',
            password: 'hicham123'
        })
        expect(res.status).toBe(201)
        expect(res.body.accessToken).toBeDefined()
    }),

    it('create a user with role of admin and returns an access token', async() => {
        const res = await request(app).post('/register').send({
            name: 'admin',
            email: 'userb@gmail.com',
            password: 'admin123',
            role: 'admin'
        })

        expect(res.status).toBe(201)
        expect(res.body.accessToken).toBeDefined()
    }),

    it('reject with a non valid email', async() => {
        const res = await request(app).post('/register').send({
            name: 'fdfad',
            email: 'dsfafd',
            password: 'daff1234'
        })

        expect(res.status).toBe(400)
    }),

    it('reject with invalid password', async() => {
        const res = await request(app).post('/register').send({
            name: 'adfasd',
            email: 'fadsf@mail.com',
            password: 'dfsaf'
        })

        expect(res.status).toBe(400)
    })
})

describe('POST /login', () => {
    it('login the customer successfully and returns an accessToken', async() => {
        const customer = await createAuthedUser({name: 'user', email: 'user@gmail.com', password: 'user1234'})
        const res = await request(app).post('/login').send({
            email: 'user@gmail.com',
            password: 'user1234'
        })

        expect(res.status).toBe(200)
        expect(res.body.accessToken).toBeDefined()
        expect(res.body.user.role).toBe('customer')
    }),
    it('login the admin successfully and returns an accessToken', async() => {
        const admin = await createAuthedUser({name: 'user', email: 'user@gmail.com', password: 'admin123', role: 'admin'})
        const res = await request(app).post('/login').send({
            name: 'user',
            email: 'user@gmail.com',
            password: 'admin123'
        })
    
        expect(res.status).toBe(200)
        expect(res.body.accessToken).toBeDefined()
        expect(res.body.user.role).toBe('admin')
    }),
    it('reject login when email don\'t matches', async() => {
        const user = await createAuthedUser({ email: 'user@gmail.com', password: 'user1234' })
        const res =  await request(app).post('/login').send({
            name: 'user',
            email: "admin@gmail.com",
            password: 'user1234'
        })

        expect(res.status).toBe(401)
    }),
    it('reject login when password don\'t matches', async() => {
        const user = await createAuthedUser({ email: 'user@gmail.com', password: 'user1234' })
        const res = await request(app).post('/login').send({
            name: 'user',
            email: 'user@gmail.com',
            password: 'user1287'
        })
        
        expect(res.status).toBe(401)
    })
})