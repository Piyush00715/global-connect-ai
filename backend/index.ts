import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { processMessage, checkAmbiguityBeforeSending } from './translationService';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// In-memory store for connected users: socketId -> { userId, language }
const connectedUsers = new Map<string, { userId: string; language: string }>();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/history', async (req, res) => {
  try {
    const history = await prisma.message.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(history.reverse());
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', async (data: { userId: string; language: string }) => {
    connectedUsers.set(socket.id, data);
    console.log(`User ${data.userId} joined with language ${data.language}`);
    
    // Upsert into DB
    await prisma.userConnection.upsert({
      where: { socketId: socket.id },
      update: { userId: data.userId, language: data.language },
      create: { socketId: socket.id, userId: data.userId, language: data.language }
    });

    socket.emit('joined', { status: 'success' });
  });

  // New endpoint for checking ambiguity before actually sending
  socket.on('check_ambiguity', async (data: { text: string; sourceLang: string }, callback) => {
    const analysis = await checkAmbiguityBeforeSending(data.text, data.sourceLang);
    callback(analysis); // Return { isAmbiguous, suggestedPhrasing }
  });

  socket.on('sendMessage', async (data: { text: string; senderLanguage: string }) => {
    const sender = connectedUsers.get(socket.id);
    if (!sender) return;

    console.log(`Processing message from ${sender.userId}: ${data.text}`);
    
    // Broadcast to all active users
    for (const [sId, user] of connectedUsers.entries()) {
      if (sId === socket.id) {
        // Send original back to sender immediately
        const msgRecord = await prisma.message.create({
          data: {
            senderId: sender.userId,
            originalText: data.text,
            translatedText: data.text,
            senderLanguage: sender.language,
            targetLanguage: sender.language,
          }
        });
        
        io.to(sId).emit('message_delivered', {
          id: msgRecord.id,
          senderId: sender.userId,
          originalText: data.text,
          translatedText: data.text,
          senderLanguage: sender.language,
          targetLanguage: sender.language,
          timestamp: msgRecord.timestamp.toISOString(),
          isSelf: true
        });
      } else {
        // Translate and send
        const translatedContent = await processMessage(data.text, sender.language, user.language);
        
        const msgRecord = await prisma.message.create({
          data: {
            senderId: sender.userId,
            originalText: data.text,
            translatedText: translatedContent.text,
            senderLanguage: sender.language,
            targetLanguage: user.language,
            clarification: translatedContent.clarification
          }
        });

        io.to(sId).emit('new_message', {
          id: msgRecord.id,
          senderId: sender.userId,
          originalText: data.text,
          translatedText: translatedContent.text,
          clarification: translatedContent.clarification,
          senderLanguage: sender.language,
          targetLanguage: user.language,
          timestamp: msgRecord.timestamp.toISOString(),
          isSelf: false
        });
      }
    }
  });

  socket.on('typing', () => {
    socket.broadcast.emit('user_typing', { socketId: socket.id });
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    connectedUsers.delete(socket.id);
    try {
      await prisma.userConnection.delete({ where: { socketId: socket.id } }).catch(() => null);
    } catch (e) {}
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
// Nodemon trigger
