const socket = io(); // Подключение к серверу

// Обработка нажатия кнопки "Отправить"
document.querySelector('button').onclick = function() {
    const input = document.getElementById('m');
    const message = input.value; // Получение текста сообщения
    socket.emit('chat message', message); // Отправка сообщения на сервер
    input.value = ''; // Очистка поля ввода
    return false; // Предотвращение перезагрузки страницы
};

// Обработка получения сообщений от сервера
socket.on('chat message', function(msg) {
    const item = document.createElement('li'); // Создание элемента списка
    item.textContent = msg; // Установка текста элемента
    document.getElementById('messages').appendChild(item); // Добавление элемента в список
});
