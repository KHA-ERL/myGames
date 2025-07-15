const express = require('express');
const { signUp, login, getAll } = require('../controllers/authController');

const router = express.Router()

router.post("/signup",signUp)
router.post("/login",login)
router.get("/all",getAll)

module.exports = router;