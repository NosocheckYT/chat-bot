const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./preferences.db');

// Инициализация Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Создание таблицы при инициализации
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS user_preferences (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, subject TEXT)");
});

// Функция для добавления или обновления предпочтений пользователя
const savePreference = (username, subject) => {
    db.run("INSERT INTO user_preferences (username, subject) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET subject = ?", [username, subject, subject], (err) => {
        if (err) {
            console.error("Ошибка при сохранении предпочтений:", err.message);
        }
    });
};

// Функция для получения предпочтений пользователя
const getPreference = (username, callback) => {
    db.get("SELECT subject FROM user_preferences WHERE username = ?", [username], (err, row) => {
        if (err) {
            callback(err);
        } else {
            callback(null, row ? row.subject : null);
        }
    });
};

// Обработка подключения клиентов
io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    const username = socket.id; // Используем ID сокета как уникальное имя пользователя

    // Обработка входящих сообщений
    socket.on('chat message', (msg) => {
        const response = getResponse(msg, username);
        io.emit('chat message', response);
    });

    // Обработка запроса на получение предпочтений
    socket.on('get preference', () => {
        getPreference(username, (err, subject) => {
            if (err) {
                console.error(err);
                socket.emit('chat message', "Произошла ошибка при получении предпочтений.");
            } else {
                socket.emit('chat message', `Ваше предпочтение: ${subject || "нет предпочтений."}`);
            }
        });
    });

    // Обработка сохранения предпочтений
    socket.on('save preference', (subject) => {
        savePreference(username, subject);
        socket.emit('chat message', `Ваше предпочтение сохранено: ${subject}.`);
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

// Функция для обработки сообщений
function getResponse(message, username) {
    const lowerCaseMessage = message.toLowerCase();

    if (lowerCaseMessage.includes("математика")) {
        return "Что именно по математике вас интересует? Примеры: алгебра, геометрия.";
    } else if (lowerCaseMessage.includes("история")) {
        return "Какой период истории вас интересует? Например, Древний Рим или Вторая мировая война.";
    } else if (lowerCaseMessage.includes("наука")) {
        return "Какая наука вас интересует? Физика, химия или биология?";
    } else if (lowerCaseMessage.includes("язык")) {
        return "Какой язык вы изучаете? Английский, испанский или что-то еще?";
    } else if (lowerCaseMessage.includes("поиск")) {
        const query = message.replace("поиск", "").trim();
        return searchWikipedia(query);
    }
    return "Извините, я не знаю, как на это ответить.";
}

// Функция для поиска в Wikipedia
const axios = require('axios');

async function searchWikipedia(query) {
    const url = `https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;

    try {
        const response = await axios.get(url);
        const results = response.data.query.search;
        if (results.length > 0) {
            return `Результаты поиска: ${results.map(result => result.title).join(', ')}`;
        } else {
            return "К сожалению, ничего не найдено.";
        }
    } catch (error) {
        console.error(error);
        return "Произошла ошибка при обращении к Wikipedia.";
    }
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
