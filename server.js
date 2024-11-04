const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Настройка статической папки
app.use(express.static('public'));

// Обработка подключения клиентов
io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    // Обработка входящих сообщений
    socket.on('chat message', (msg) => {
        const response = getResponse(msg);
        io.emit('chat message', response); // Отправка ответа всем клиентам
    });
});

// Функция для получения ответа
function getResponse(message) {
    // Простая логика для ответов
    if (message.toLowerCase().includes("математика")) {
        return "Что именно по математике вас интересует?";
    } else if (message.toLowerCase().includes("история")) {
        return "Какой период истории вас интересует?";
    }
    return "Извините, я не знаю, как на это ответить.";
}

// Запуск сервера
const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
