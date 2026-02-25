const cron = require('node-cron');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/render/.cache/puppeteer/chrome/linux-145.0.7632.77/chrome-linux64/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const GRUPO_ID = "120363406443139075@g.us"; // 🔥 IMPORTANTE

client.on('qr', qr => {
    console.log('Escanea este QR con tu WhatsApp 👇');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Bot listo 🚀');

    const grupo = await client.getChatById(GRUPO_ID);

    if (!grupo) {
        console.log("❌ No se encontró el grupo");
        return;
    }

    console.log("Grupo conectado correctamente ✅");

    // 🔥 CRON DIARIO (00:01)
    cron.schedule('* * * * *', async () => {
        console.log("⏰ Verificando cumpleaños...");

        const hoy = new Date();
        const fechaHoy =
            String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
            String(hoy.getDate()).padStart(2, '0');

        const data = JSON.parse(fs.readFileSync('./cumples.json'));

        for (const persona of data) {
            if (persona.fecha === fechaHoy) {

                // 🔎 Verificar si alguien ya saludó hoy
                const mensajes = await grupo.fetchMessages({ limit: 50 });
                const yaSaludaron = mensajes.some(msg =>
                    msg.body.toLowerCase().includes("feliz cumpleaños") &&
                    msg.timestamp * 1000 > new Date().setHours(0,0,0,0)
                );

                if (yaSaludaron) {
                    console.log("⚠️ Ya saludaron hoy. No se enviará mensaje.");
                    return;
                }

                // 🔥 Buscar contacto para mencionarlo
                const participantes = grupo.participants;
                const contacto = participantes.find(p =>
                    p.id.user === persona.numero
                );

                let mentionText = persona.nombre;
                let mentions = [];

                if (contacto) {
                    mentionText = `@${contacto.id.user}`;
                    mentions.push(contacto.id._serialized);
                }

                // 🎉 Mensajes dinámicos
                const mensajesCumple = [
                    `🎉🎂 Feliz cumpleaños ${mentionText}! Que este año venga lleno de éxitos 🚀`,
                    `🥳 Hoy celebramos a ${mentionText}! Salud y mucho código sin bugs 💻🔥`,
                    `🎊 ${mentionText} que la vida te deploye felicidad infinita 😎`
                ];

                const mensajeFinal =
                    mensajesCumple[Math.floor(Math.random() * mensajesCumple.length)];

                await grupo.sendMessage(mensajeFinal, {
                    mentions: mentions
                });

                console.log("✅ Mensaje de cumpleaños enviado correctamente");
            }
        }
    });

    app.get('/', (req, res) => {
    res.send('Birthday Bot funcionando 🚀');
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});
});

client.initialize();