require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend NutriScan es alcanzable', time: new Date().toISOString() });
});

// Gemini Config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.post('/api/analyze-food', upload.single('image'), async (req, res) => {
  console.log('--- Nueva solicitud recibida ---');
  try {
    if (!req.file) {
      console.error('Error: No se subió ninguna imagen');
      return res.status(400).json({ error: 'No image uploaded' });
    }
    console.log('Imagen subida:', req.file.path);
    console.log('Descripción recibida:', req.body.description || 'Ninguna');

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY || API_KEY === "") {
      console.warn('GEMINI_API_KEY no configurada. Usando datos simulados.');
      return res.json({
        foods: [
          { name: 'Platillo Simulado (No hay API Key)', grams: 300, calories: 450, carbs: 40, protein: 20, fat: 15 }
        ],
        totals: { calories: 450, carbs: 40, protein: 20, fat: 15 }
      });
    }

    // Convert image to base64 for Gemini
    const imageData = fs.readFileSync(req.file.path);
    const { description } = req.body;

    const imagePart = {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `Analiza esta imagen de comida${description ? ` (El usuario describe el platillo como: "${description}")` : ""} y devuelve un JSON con este formato exacto:
    {
      "foods": [
        { "name": "nombre", "grams": 0, "calories": 0, "carbs": 0, "protein": 0, "fat": 0 }
      ],
      "totals": { "calories": 0, "carbs": 0, "protein": 0, "fat": 0 }
    }
    Estima los gramos y valores nutricionales lo mejor posible basándote en la imagen y la descripción proporcionada. No incluyas texto extra, solo el JSON.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    console.log('Respuesta de Gemini:', text);

    // Clean text in case Gemini adds markdown backticks
    const cleanJsonText = text.replace(/```json|```/g, "").trim();
    let jsonResult;
    try {
      jsonResult = JSON.parse(cleanJsonText);
    } catch (parseError) {
      console.error('Error parseando JSON de Gemini:', parseError);
      console.error('Texto original:', text);
      return res.status(500).json({ error: 'Error al procesar la respuesta de la IA' });
    }

    res.json(jsonResult);

  } catch (error) {
    console.error('Error analizando comida:', error);
    res.status(500).json({ error: 'Error interno en el análisis' });
  }
});

app.listen(port, () => {
  console.log(`Backend NutriScan listo en http://localhost:${port}`);
});
