import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';

// Route imports
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import studentRoutes from './routes/studentRoutes';
import roomRoutes from './routes/roomRoutes';
import complaintRoutes from './routes/complaintRoutes';
import feeRoutes from './routes/feeRoutes';
import outingRoutes from './routes/outingRoutes';
import visitorRoutes from './routes/visitorRoutes';
import reportRoutes from './routes/reportRoutes';
import notificationRoutes from './routes/notificationRoutes';
import excelRoutes from './routes/excelRoutes';

export const app = express();

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Smart Hostel Management System API',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/outings', outingRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/excel', excelRoutes);

// Central error handler
app.use(errorHandler);

// Only listen if not imported in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Smart Hostel Management System (SHMS) Server`);
    console.log(`📍 Listening at http://localhost:${config.port}`);
    console.log(`🌐 Connected with client at ${config.clientUrl}`);
    console.log(`=======================================================`);
  });
}
