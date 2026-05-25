document.addEventListener("DOMContentLoaded", function() {
    const fioInput = document.getElementById("fio");
    const idInput = document.getElementById("participant-id");
    const dobInput = document.getElementById("dob");
    const otherInput = document.getElementById("other");
    const autocompleteList = document.getElementById("autocomplete-list");
    const form = document.getElementById("participantForm");
    const statusMessage = document.getElementById("status-message");
    const clearBtn = document.getElementById("clearBtn");

    let currentFocus = -1;
    let serverData = []; // Хранит текущий массив найденных на сервере участников

    // Слушатель ввода текста в ФИО
    fioInput.addEventListener("input", function() {
        let val = this.value;
        closeAllLists();
        if (!val) return false;
        currentFocus = -1;

        // Запрос к локальному серверному API поиска
        fetch(`/api/participants/search?q=${encodeURIComponent(val)}`)
            .then(response => response.json())
            .then(data => {
                serverData = data;
                if (serverData.length === 0) return;

                serverData.forEach((participant, index) => {
                    let b = document.createElement("DIV");
                    // Выделяем жирным совпадение (необязательно, но наглядно)
                    b.innerHTML = participant.fio;
                    b.setAttribute("data-index", index);

                    // Клик мыши по элементу списка
                    b.addEventListener("click", function() {
                        selectParticipant(serverData[this.getAttribute("data-index")]);
                    });
                    autocompleteList.appendChild(b);
                });
            });
    });

    // Обработка клавиш (Стрелочки и Enter)
    fioInput.addEventListener("keydown", function(e) {
        let x = autocompleteList.getElementsByTagName("div");

        if (e.keyCode === 40) { // Стрелка ВНИЗ
            currentFocus++;
            addActive(x);
        } else if (e.keyCode === 38) { // Стрелка ВВЕРХ
            currentFocus--;
            addActive(x);
        } else if (e.keyCode === 13) { // Клавиша ENTER
            e.preventDefault(); // Запрещаем стандартную отправку формы

            if (currentFocus > -1 && x[currentFocus]) {
                // Если элемент был выбран стрелочками, симулируем клик
                x[currentFocus].click();
            } else {
                // Если пользователь просто нажал Enter без выбора стрелками
                let exactMatch = serverData.find(p => p.fio.toLowerCase() === fioInput.value.toLowerCase().strip());
                if (exactMatch) {
                    selectParticipant(exactMatch);
                } else {
                    // Вариант 2: Участника нет в БД, оставляем поля пустыми для нового ввода
                    idInput.value = "";
                    dobInput.value = "";
                    otherInput.value = "";
                    showStatus("Новое ФИО. Заполните данные и нажмите Сохранить.", "info");
                }
                closeAllLists();
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
        // Прокрутка списка за выделенным элементом
        x[currentFocus].scrollIntoView({ block: "nearest" });
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists() {
        autocompleteList.innerHTML = "";
    }

    function selectParticipant(participant) {
        fioInput.value = participant.fio;
        idInput.value = participant.id;
        dobInput.value = participant.dob;
        otherInput.value = participant.other;
        closeAllLists();
        showStatus("Участник найден в базе данных.", "success");
    }

    // Закрывать список при клике в любом другом месте экрана
    document.addEventListener("click", function (e) {
        if (e.target !== fioInput) {
            closeAllLists();
        }
    });

    // Очистка формы
    clearBtn.addEventListener("click", function() {
        form.reset();
        idInput.value = "";
        statusMessage.classList.add("d-none");
    });

    // Сохранение/Изменение данных (Отправка на сервер)
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        const payload = {
            id: idInput.value,
            fio: fioInput.value,
            dob: dobInput.value,
            other: otherInput.value
        };

        fetch('/api/participants/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                idInput.value = data.id; // Присваиваем сгенерированный сервером ID
                showStatus(`Успешно сохранено! ID участника: ${data.id}`, "success");
            } else {
                showStatus(`Ошибка: ${data.error}`, "danger");
            }
        })
        .catch(err => {
            showStatus("Ошибка сетевого запроса", "danger");
        });
    });

    function showStatus(text, type) {
        statusMessage.className = `alert alert-${type} mt-3`;
        statusMessage.innerText = text;
        statusMessage.classList.remove("d-none");
    }
});

// Вспомогательный метод удаления лишних пробелов по краям
String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
};