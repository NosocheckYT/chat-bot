const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./preferences.db');

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

// Закрытие базы данных при завершении приложения
const closeDatabase = () => {
    db.close((err) => {
        if (err) {
            console.error("Ошибка при закрытии базы данных:", err.message);
        }
    });
};

// Экспортируем функции
module.exports = { savePreference, getPreference, closeDatabase };
