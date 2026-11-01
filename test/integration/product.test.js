import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTestDb, closeTestDb, connectTestDb } from "../setup.js";
import app from '../../app.js'
import request from 'supertest'
import { createAuthedUser, createProduct } from "../helpers/helper.js";
import path from 'path'


beforeAll(connectTestDb)
afterEach(clearTestDb)
afterAll(closeTestDb)


const fixturePath = path.resolve('test/fixtures/test.png')

describe('POST /add-product', () => {
    it('create a new product successfully', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })
        const res = await request(app).post('/dashboard/add-product').set('Authorization', `Bearer ${token}`)
            .field('title', 'test product')
            .field('description', 'test product description for clarity')
            .field('price', 13000)
            .field('category', 'men')
            .attach('product', fixturePath)

        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({
            title: 'test product',
            price: "13000"
        })
        expect(res.body.image).toMatch(/\/uploads\/products\//)
    }),


    it('reject adding product for no authorized user', async() => {
         const res = await request(app).post('/dashboard/add-product')
            .field('title', 'test product')
            .field('description', 'test product description for clarity')
            .field('price', 13000)
            .field('category', 'men')
            .attach('product', fixturePath)
        
        expect(res.status).toBe(401)
    }),

    it('reject adding product from a customer', async() => {
        const {token} = await createAuthedUser()
        const res = await request(app).post('/dashboard/add-product').set('Authorization', `Bearer ${token}`)
        
        expect(res.status).toBe(403)
    })
})

describe('PUT /update-product', () => {
    it('update product for admin', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })
        const createProduct = await request(app).post('/dashboard/add-product').set('Authorization', `Bearer ${token}`)
            .field('title', 'test product')
            .field('description', 'test product description for clarity')
            .field('price', 13000)
            .field('category', 'men')
            .attach('product', fixturePath)


        const res = await request(app).put(`/dashboard/product/${createProduct.body._id}`).set('Authorization', `Bearer ${token}`)
            .field('title', 'updated product')
            .field('description', 'updated product description for clarity')
            .field('price', 1000)
            .field('category', 'men')
            .field('quantity', 2)

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({
            title: 'updated product',
            price: '1000'
        })
    }),

    it('reject updating for a non admin acount', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })
        const userB = await createAuthedUser()

        const product = await request(app).put(`/dashboard/add-product`).set('Authorizaiton', `Bearer ${token}`)
            .field('title', 'test product')
            .field('description', 'test product description for clarity')
            .field('price', 13000)
            .field('category', 'men')
            .attach('product', fixturePath)

        const res = await request(app).put(`/dashboard/product/${product.body._id}`).set('Authorization', `Bearer ${userB.token}`)
            .field('title', 'updated product')
            .field('description', 'updated product description for clarity')
            .field('price', 1000)
            .field('category', 'men')
            .field('quantity', 2)

        expect(res.status).toBe(403)
    }),

    it('reject updating for a non authed user', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })

        const product = await request(app).put(`/dashboard/add-product`).set('Authorizaiton', `Bearer ${token}`)
            .field('title', 'test product')
            .field('description', 'test product description for clarity')
            .field('price', 13000)
            .field('category', 'men')
            .attach('product', fixturePath)

        const res = await request(app).put(`/dashboard/product/${product.body._id}`)
            .field('title', 'updated product')
            .field('description', 'updated product description for clarity')
            .field('price', 1000)
            .field('category', 'men')
            .field('quantity', 2)

        expect(res.status).toBe(401)
    })
})


describe('DELETE /delete-product', () => {
    it('delete product for admin account', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })

        const product = await request(app).post(`/dashboard/add-product`).set('Authorization', `Bearer ${token}`)
            .field('title', 'test product')
            .field('description', 'test product description for clarity')
            .field('price', 13000)
            .field('category', 'men')
            .attach('product', fixturePath)

        const res = await request(app).delete(`/dashboard/product/${product.body._id}`).set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(204)
    }),

    it('reject when a non admin account calls the api', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })
        const userB = await createAuthedUser()

        const product = await request(app).post(`/dashboard/add-product`).set('Authorization', `Bearer ${token}`)
            .field('title', 'test product')
            .field('description', 'test product description for clarity')
            .field('price', 13000)
            .field('category', 'men')
            .attach('product', fixturePath)

        const res = await request(app).delete(`/dashboard/product/${product.body._id}`).set('Authorization', `Bearer ${userB.token}`)

        expect(res.status).toBe(403)
    }),

    it('reject when trying to delete without credentials', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })

        const product = await request(app).post(`/dashboard/add-product`).set('Authorization', `Bearer ${token}`)
            .field('title', 'test product')
            .field('description', 'test product description for clarity')
            .field('price', 13000)
            .field('category', 'men')
            .attach('product', fixturePath)

        const res = await request(app).delete(`/dashboard/product/${product.body._id}`)

        expect(res.status).toBe(401)
    })
})

describe('GET /get-products', () => {
    it('get all products for admin', async() => {
        const user = await createAuthedUser({ role: 'admin' })
        const products = await createProduct(user.token, fixturePath, 5)
        const res = await request(app).get('/dashboard/products').set('Authorization', `Bearer ${user.token}`)

        expect(res.status).toBe(200)
        expect(res.body.length).toBe(5)
        expect(res.body).toBeDefined()
    }),

    it('reject for non admin accounts', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })
        const userB = await createAuthedUser()
        const products = await createProduct(token, fixturePath, 3)

        const res = await request(app).get('/dashboard/products').set('Authorization', `Bearer ${userB.token}`)

        expect(res.status).toBe(403)
    }),

    it('reject for non authenticated users', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })

        const products = await createProduct(token, fixturePath, 3)

        const res = await request(app).get('/dashboard/products')

        expect(res.status).toBe(401)
    })
})

describe('GET /get-orders', () => {
    it('get orders for admin', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })

        const res = await request(app).get('/dashboard/orders').set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toBeDefined()
    }),

    it('reject getting orders for non admin acounts', async() => {
        const {token} = await createAuthedUser()

        const res = await request(app).get('/dashboard/orders').set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(403)
    }),

    it('reject getting orders for non authenticated user', async() => {
        const res = await request(app).get('/dashboard/orders')

        expect(res.status).toBe(401)
    })
})

describe('PUT /order/:id', () => {
    it('update an order status successfully', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })
        const product = await createProduct(token, fixturePath, 2)
        const user = await createAuthedUser()
        const productId = product._id
        const addToCart = await request(app).post('/addToCart').set('Authorization', `Bearer ${user.token}`).send({
            productId,
            quantity: 1
        })

        const order = await request(app).post('/checkout').set('Authorization', `Bearer ${user.token}`).send({
            shippingAddress:{
                street: 'fs',
                city: 'fdsfa',
                state: 'fdsfa',
                postalCode: '16234',
                country: 'algeria'
            },
            paymentMethod: 'cod'
        })
        const id = order.body.newOrder._id

        const res = await request(app).put(`/dashboard/order/${id}`).set('Authorization', `Bearer ${token}`).send({
            orderStatus: 'processing'
        })

        expect(res.status).toBe(200)
        expect(res.body)
        expect(res.body.orderStatus).toBe('processing')
    }),
    it('reject updating an order status for non admin account', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })
        const product = await createProduct(token, fixturePath, 1)
        const user = await createAuthedUser()
        const productId = product._id
        const addToCart = await request(app).post('/addToCart').set('Authorization', `Bearer ${user.token}`).send({
            productId,
            quantity: 1
        })

        const order = await request(app).post('/checkout').set('Authorization', `Bearer ${user.token}`).send({
            shippingAddress:{
                street: 'fs',
                city: 'fdsfa',
                state: 'fdsfa',
                postalCode: '16234',
                country: 'algeria'
            },
            paymentMethod: 'cod'
        })
        const id = order.body.newOrder._id

        const res = await request(app).put(`/dashboard/order/${id}`).set('Authorization', `Bearer ${user.token}`).send({
            orderStatus: 'processing'
        })

        expect(res.status).toBe(403)
    }),

    it('reject updating an order status for a non valid orderId', async() => {
        const {token} = await createAuthedUser({ role: 'admin' })
        const product = await createProduct(token, fixturePath, 2)
        const user = await createAuthedUser()
        const productId = product._id
        const addToCart = await request(app).post('/addToCart').set('Authorization', `Bearer ${user.token}`).send({
            productId,
            quantity: 1
        })

        const order = await request(app).post('/checkout').set('Authorization', `Bearer ${user.token}`).send({
            shippingAddress:{
                street: 'fs',
                city: 'fdsfa',
                state: 'fdsfa',
                postalCode: '16234',
                country: 'algeria'
            },
            paymentMethod: 'cod'
        })

        const res = await request(app).put(`/dashboard/order/${productId}`).set('Authorization', `Bearer ${user.token}`).send({
            orderStatus: 'processing'
        })

        expect(res.status).toBe(403)
    })
})