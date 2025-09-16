module.exports = {
  // Application settings
  appName: 'Server Manager',
  appVersion: '1.0.0',
  
  // Server detection settings
  serverCheckInterval: 5000, // 5 seconds
  
  // Ports to monitor for development servers
  defaultPorts: [
    3000, 3001, 3002, 3003, 3004, 3005, // React/Nuxt
    8000, 8001, 8002, 8003, 8004, 8005, // Django/Flask
    5000, 5001, 5002, 5003, 5004, 5005, // Flask/Express
    8080, 8081, 8082, 8083, 8084, 8085, // Default dev ports
    9000, 9001, 9002, 9003, 9004, 9005  // Additional ports
  ],
  
  // Process patterns to identify development servers
  processPatterns: {
    node: ['node.exe', 'node'],
    react: ['react-scripts', 'next', 'nuxt', 'vite'],
    express: ['nodemon', 'ts-node-dev', 'ts-node'],
    python: ['python.exe', 'python', 'python3']
  },
  
  // Logging settings
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  
  // UI settings
  windowWidth: 800,
  windowHeight: 600,
  autoHideMenuBar: true
};