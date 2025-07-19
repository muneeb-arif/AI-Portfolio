# 🚀 Deployment Guide - Session-Based Logging

## 🌐 **Real-World Scenario: Multiple Users**

When **User A** opens `abc.com` and **User B** opens `xyz.com`, both will:
- ✅ Get unique session IDs
- ✅ See only their own logs
- ✅ Have isolated processing streams
- ✅ No cross-contamination between users

## 🔧 **Configuration**

### **Development (Local)**
```bash
# React app uses proxy automatically
cd react-web
npm start
```

### **Production Deployment**

#### **Option 1: Environment Variables**
Create `.env` file in `react-web/` directory:
```bash
# For production server
REACT_APP_API_URL=https://your-api-server.com

# For local testing with different ports
REACT_APP_API_URL=http://localhost:9000
```

#### **Option 2: Build-time Configuration**
```bash
# Build with specific API URL
REACT_APP_API_URL=https://your-api-server.com npm run build
```

## 🏗️ **Deployment Architecture**

### **Frontend (React App)**
- Deploy to: CDN, Vercel, Netlify, or any static hosting
- Environment: Set `REACT_APP_API_URL` to your backend server

### **Backend (Node.js Server)**
- Deploy to: VPS, Heroku, Railway, or any Node.js hosting
- CORS: Configured to accept requests from your frontend domain
- Sessions: Each user gets unique session ID for log isolation

## 🔒 **Security Considerations**

### **CORS Configuration**
Update `server.js` for production:
```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

### **Session Management**
- Sessions are automatically cleaned up after 1 hour
- No persistent storage - sessions are in-memory only
- Each session is isolated and secure

## 📊 **Monitoring**

### **Server Logs**
```bash
# Check active sessions
curl http://your-server.com/health

# Monitor session connections
tail -f server.log | grep "Client disconnected\|Connected"
```

### **Frontend Debugging**
Open browser console to see:
- Session ID generation
- Connection status
- Log stream events

## 🧪 **Testing Multi-User Scenarios**

### **Local Testing**
```bash
# Terminal 1: Start server
node server.js

# Terminal 2: Start React app
cd react-web && npm start

# Terminal 3: Start another React instance on different port
cd react-web && PORT=3001 npm start
```

### **Production Testing**
1. Deploy server to production
2. Deploy React app with `REACT_APP_API_URL` set
3. Open app in multiple browsers/devices
4. Test simultaneous screenshot captures
5. Verify logs are isolated per session

## ✅ **Verification Checklist**

- [ ] Each user gets unique session ID
- [ ] Logs are isolated per session
- [ ] No cross-contamination between users
- [ ] "Finished." messages only appear for initiating session
- [ ] Connection timeouts handled gracefully
- [ ] Automatic reconnection on disconnection
- [ ] Old sessions cleaned up automatically

## 🐛 **Troubleshooting**

### **Connection Issues**
1. Check `REACT_APP_API_URL` is correct
2. Verify CORS configuration
3. Check server is running and accessible
4. Review browser console for errors

### **Log Isolation Issues**
1. Verify session IDs are unique
2. Check server logs for session management
3. Ensure all logging calls use sessionId parameter
4. Test with fresh browser sessions

### **Performance Issues**
1. Monitor server memory usage
2. Check for memory leaks in session storage
3. Verify session cleanup is working
4. Consider session timeout adjustments 