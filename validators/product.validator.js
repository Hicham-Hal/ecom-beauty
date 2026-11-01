import { body, param } from "express-validator";

export const addProductValidator = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 4 }).withMessage('Title must contain at least 4 characters'),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 20, max: 300 }).withMessage('Description must contain between 20 to 300 characters'),
    body('price')
        .trim()
        .notEmpty().withMessage('Price is required')
        .isNumeric().withMessage('Price must be a number'),
    body('category')
        .trim()
        .notEmpty().withMessage('Categroy is required')
    
]

export const updateProductValidator = [
    body('title')
        .trim()
        .isLength({ min: 4 }).withMessage('Title must contain at least 4 characters'),
    body('description')
        .trim()
        .isLength({ min: 20, max: 300 }).withMessage('Description must contain between 20 to 300 characters'),
    body('price')
        .trim()
        .isNumeric().withMessage('Price must be a number'),
]

export const deleteProductValidator = [
    param('id')
        .isMongoId().withMessage('Id must be a mongoId')
]