require('dotenv').config();
const bcrypt = require('bcryptjs');
const http = require('http');
const express = require('express');
const RED = require('node-red');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// Crear directorio para datos persistentes
const dataDir = path.join(__dirname, 'data'); // Este es el directorio donde se guardarán los datos
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir); // Crea el directorio si no existe
}

const app = express();
const server = http.createServer(app);

// Middleware de seguridad
app.use(helmet({
    contentSecurityPolicy: false,
}));

// Configuración de usuarios
const users = [
    {
        username: process.env.ADMIN_USERNAME || "admin",
        password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin', 8),
        permissions: "*"
    },
    {
        username: "user1",
        password: bcrypt.hashSync(process.env.USER1_PASSWORD || 'user1password', 8),
        permissions: "read"
    }
];

// Configuración de Node-RED
const settings = {
    httpAdminRoot: "/",
    httpNodeRoot: "/api",
    userDir: dataDir, // Este es el directorio que estamos utilizando para guardar los datos de Node-RED
    flowFile: 'flows.json', // Archivo donde se guardan los flujos
    flowFilePretty: true, // Para mejor legibilidad de flows.json
    credentialSecret: process.env.CREDENTIAL_SECRET || 'your-secret-key',
    adminAuth: {
        type: "credentials",
        users: users
    },
    editorTheme: {
        login: {
            image: null  // Puedes añadir una imagen de login si lo deseas
        },
        palette: {
            catalogues: [
                'https://catalogue.nodered.org/catalogue.json'
            ]
        }
    },
    functionGlobalContext: {},
};

// Inicialización de Node-RED
RED.init(server, settings);

// Rutas para las interfaces de administración y de nodos
app.use(settings.httpAdminRoot, RED.httpAdmin);
app.use(settings.httpNodeRoot, RED.httpNode);

// Puerto donde se ejecutará la aplicación
const PORT = process.env.PORT || 8000;

// Iniciar servidor
const startServer = async () => {
    try {
        await new Promise((resolve, reject) => {
            server.listen(PORT, () => {
                console.log(`Node-RED running on port ${PORT}`);
                resolve();
            });
            server.on('error', reject);
        });

        await RED.start();
        console.log('Node-RED started successfully');
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

// Manejo de señales de terminación
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    RED.stop().then(() => {
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
});

// Inicia el servidor
startServer();
