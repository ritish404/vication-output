const express = require('express');
const axios = require('axios');
const expAsyncHandler = require('express-async-handler');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const url = "https://api.segmind.com/v1/try-on-diffusion";

function imageFileToBase64(imagePath) {
    const imageData = fs.readFileSync(path.resolve(imagePath));
    return Buffer.from(imageData).toString('base64');
}

router.post('/', expAsyncHandler(async (req, res) => {
    const { location, Ocassion, date, gender } = req.body;

    if (!OPENWEATHER_API_KEY) {
        return res.status(500).json({ error: 'OPENWEATHER_API_KEY is missing in the environment.' });
    }

    if (!process.env.GEMINI_KEY) {
        return res.status(500).json({ error: 'GEMINI_KEY is missing in the environment.' });
    }

    let weatherData;

    try {
        const geoResponse = await axios.get(
            `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${OPENWEATHER_API_KEY}`
        );
        if (geoResponse.data.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }

        const { lat, lon } = geoResponse.data[0];

        const weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
        );

        weatherData = weatherResponse.data;
    } catch (err) {
        return res.status(500).json({ err: err.message || err });
    }

    let searchQuery;
    let recommendationMode = 'ai';

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(
            `Suggest a concise clothing search phrase for a ${gender || 'unisex'} outfit. ` +
            `Consider occasion "${Ocassion}", destination "${location}", temperature ${weatherData.main.temp}°C, ` +
            `and weather "${weatherData.weather[0].description}". Return only the search phrase.`
        );
        searchQuery = result.response.text().trim();
    } catch (error) {
        if (error.status !== 429) {
            throw error;
        }

        console.warn('Gemini quota exceeded; using a weather-based outfit search instead.');
        const temperature = weatherData.main.temp;
        const temperatureStyle = temperature <= 15
            ? 'warm layered'
            : temperature >= 27
                ? 'lightweight breathable'
                : 'comfortable';
        searchQuery = [
            gender,
            Ocassion,
            weatherData.weather[0].description,
            temperatureStyle,
            'outfit',
            location
        ].filter(Boolean).join(' ');
        recommendationMode = 'weather-based';
    }

    if (!process.env.UNWRANGLE_API_KEY) {
        return res.status(500).json({ error: 'UNWRANGLE_API_KEY is missing in the server environment.' });
    }

    try {
        const params = new URLSearchParams({
            platform: 'amazon_search',
            search: searchQuery,
            country_code: 'us',
            page: '1',
            api_key: process.env.UNWRANGLE_API_KEY
        });
        const resp = await axios.get(`https://data.unwrangle.com/api/getter/?${params}`);

        const thumbnails = (resp.data?.results || []).slice(0, 10).map(item => ({
            asin: item.asin,
            thumbnail: item.thumbnail
        }));

        return res.send({ status: 200, payload: { thumbnails, weatherData, recommendationMode } });
    } catch (error) {
        console.error('Amazon search fetch failed:', error.response ? error.response.data : error.message);
        if (error.response?.status === 429) {
            return res.status(503).json({
                error: 'The product search service is temporarily rate-limited. Please wait a minute and try again.'
            });
        }
        return res.status(502).json({ error: 'Failed to fetch outfit suggestions from the product search service.' });
    }
}));

router.post('/try-on', expAsyncHandler(async (req, res) => {
    const api_key = process.env.MODEL_KEY;
    const { model_image, cloth_image } = req.body;

    if (!api_key) {
        return res.status(500).json({ error: 'MODEL_KEY is missing in the environment.' });
    }

    if (!model_image || !cloth_image) {
        return res.status(400).json({ error: 'model_image and cloth_image are required.' });
    }

    const modelImageBase64 = imageFileToBase64(model_image);
    const clothImageBase64 = imageFileToBase64(cloth_image);

    const data = {
        model_image: modelImageBase64,
        cloth_image: clothImageBase64,
        category: "Upper body",
        num_inference_steps: 35,
        guidance_scale: 2,
        seed: 12467,
        base64: true
    };

    try {
        const response = await axios.post(url, data, { headers: { 'x-api-key': api_key } });
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
}));

module.exports = router;



