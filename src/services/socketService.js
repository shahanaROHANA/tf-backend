import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.connectedSellers = new Map(); // sellerId -> socketId
    this.connectedAdmins = new Map(); // adminId -> socketId
    this.connectedDeliveryAgents = new Map(); // deliveryAgentId -> socketId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:4002'],
        credentials: true
      }
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role || 'user';
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected with role ${socket.userRole}`);

      // Register user based on role
      this.registerUser(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.unregisterUser(socket);
      });

      // Handle custom events
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room ${roomId}`);
      });

      socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.userId} left room ${roomId}`);
      });
    });

    return this.io;
  }

  registerUser(socket) {
    const { userId, userRole } = socket;

    switch (userRole) {
      case 'user':
        this.connectedUsers.set(userId, socket.id);
        break;
      case 'seller':
        this.connectedSellers.set(userId, socket.id);
        break;
      case 'admin':
        this.connectedAdmins.set(userId, socket.id);
        break;
      case 'deliveryAgent':
        this.connectedDeliveryAgents.set(userId, socket.id);
        break;
    }
  }

  unregisterUser(socket) {
    const { userId, userRole } = socket;

    switch (userRole) {
      case 'user':
        this.connectedUsers.delete(userId);
        break;
      case 'seller':
        this.connectedSellers.delete(userId);
        break;
      case 'admin':
        this.connectedAdmins.delete(userId);
        break;
      case 'deliveryAgent':
        this.connectedDeliveryAgents.delete(userId);
        break;
    }
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send notification to specific seller
  sendToSeller(sellerId, event, data) {
    const socketId = this.connectedSellers.get(sellerId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send notification to specific admin
  sendToAdmin(adminId, event, data) {
    const socketId = this.connectedAdmins.get(adminId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send notification to specific delivery agent
  sendToDeliveryAgent(deliveryAgentId, event, data) {
    const socketId = this.connectedDeliveryAgents.get(deliveryAgentId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send notification to all admins
  sendToAllAdmins(event, data) {
    for (const [adminId, socketId] of this.connectedAdmins) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Send notification to all sellers
  sendToAllSellers(event, data) {
    for (const [sellerId, socketId] of this.connectedSellers) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Send notification to room
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return {
      users: this.connectedUsers.size,
      sellers: this.connectedSellers.size,
      admins: this.connectedAdmins.size,
      deliveryAgents: this.connectedDeliveryAgents.size,
      total: this.connectedUsers.size + this.connectedSellers.size + this.connectedAdmins.size + this.connectedDeliveryAgents.size
    };
  }
}

export default new SocketService();