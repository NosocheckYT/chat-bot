const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Использование CORS
app.use(cors());

// Отдача статических файлов
app.use(express.static(path.join(__dirname, 'public')));

// Создание базы данных
const db = new sqlite3.Database('./preferences.db');

// Создание таблицы при инициализации
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS user_preferences (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, subject TEXT)");
});

// Обработка GET запроса на корневой маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Объект для хранения состояния общения
const userStates = {};

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

    // Инициализация состояния пользователя
    userStates[username] = {
        currentTopic: null,
    };

    // Обработка входящих сообщений
    socket.on('chat message', async (msg) => {
        const response = await getResponse(msg, username);
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
        userStates[username].currentTopic = subject; // Сохраняем текущую тему
        socket.emit('chat message', `Ваше предпочтение сохранено: ${subject}.`);
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
        delete userStates[username]; // Удаляем состояние пользователя
    });
});

// Функция для обработки сообщений
async function getResponse(message, username) {
    const lowerCaseMessage = message.toLowerCase();

    // Проверяем, какую тему выбрал пользователь
    if (userStates[username].currentTopic) {
        // Используем Wikipedia API для получения информации по выбранной теме
        return await searchWikipedia(lowerCaseMessage);
    }

    // Если нет текущей темы, задаем вопрос
    if (lowerCaseMessage.includes("математика")) {
        userStates[username].currentTopic = "математика"; // Устанавливаем текущую тему
        return "Что именно по математике вас интересует? Примеры: алгебра, геометрия.";
    } else if (lowerCaseMessage.includes("история")) {
        userStates[username].currentTopic = "история"; // Устанавливаем текущую тему
        return "Какой период истории вас интересует? Например, Древний Рим или Вторая мировая война.";
    } else if (lowerCaseMessage.includes("наука")) {
        userStates[username].currentTopic = "наука"; // Устанавливаем текущую тему
        return "Какая наука вас интересует? Физика, химия или биология?";
    } else if (lowerCaseMessage.includes("язык")) {
        userStates[username].currentTopic = "язык"; // Устанавливаем текущую тему
        return "Какой язык вы изучаете? Английский, испанский или что-то еще?";
    }

    return "Извините, я не знаю, как на это ответить.";
}

// Функция для поиска в Wikipedia
async function searchWikipedia(query) {
    const url = `https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;

    try {
        const response = await axios.get(url);
        const results = response.data.query.search;
        if (results.length > 0) {
            const firstResult = results[0]; // Берем первый результат
            return `Вот что я нашел по теме "${query}": ${firstResult.title} - [Wikipedia] https://ru.wikipedia.org/wiki/${encodeURIComponent(firstResult.title)}`;
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
