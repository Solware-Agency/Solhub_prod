// index.js - Archivo principal para Vercel (en la raíz)
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import chatRoutes from './backend/routes/chat.js';
import emailRoutes from './backend/routes/email.js';

dotenv.config();

const app = express();

// Configurar CORS para incluir tu dominio de Vercel
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://*.vercel.app', // Para preview deployments
    'https://conspat.solhub.agency',
    'https://dev.conspat.solhub.agency'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rutas de la API
app.use('/api', chatRoutes);
app.use('/api', emailRoutes);

// Exportar la app para Vercel (NO usar app.listen)
export default app;
