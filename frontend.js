function chekEemployeeId() {
  // якщо не знайдено → один раз оновлюємо кеш з бекенду й шукаємо знову;
  // якщо досі не знайдено → показуємо “Користувача не знайдено” й зупиняємось;
  // якщо знайдено → відправляємо на бекенд запит: “дай мені актуальний статус і дозволені дії по цьому коду”.
  google.script.run.getStatusEemployeeId(id); //
}

// фронт показує тільки ті кнопки, які дозволені (або одразу одну “Вхід”/“Вихід”).
function showButton(actionType) {}

function submitForm(actionType, id) {
  // бекенд:
  // читає актуальний статус із БД; readStaus()
  // перевіряє, чи все ще дозволена дія;
  // якщо ок → додає запис у Журнал і оновлює статус у БД;
  // повертає фронту результат і новий статус (або помилку).

  // Повідомлення і локальне оновлення
  //{ name, actionType, date={year day time} } = res;
  return { res };
}

// фронт показує відповідне повідомлення;
function showMessage(res) {
  const { name, actionType, date } = res;
  const textMessage = `${name} ${actionType} ${date.time}`;
  ///
}

document.addEventListener("DOMContentLoaded", function () {
  const AppDOM = {};
  AppDOM.formEl = document.getElementById("form");
  AppDOM.inputCntEl = document.getElementById("input-cnt");
  AppDOM.clearBtnEl = document.getElementById("clear-btn");
  AppDOM.modal = document.getElementById("modal");

  let employeId;
  let shiftType;
  // Модальне вікно
  function showModal(message = "Йой, щось пішло не так...", bool) {
    const modal = AppDOM.modal;
    bool
      ? ((modal.dataset.color = "ok"), autoCloseModal())
      : (modal.dataset.color = "err");
    const messageBox = document.querySelector("#modal div p");
    const okBtn = document.getElementById("ok-btn");
    messageBox.textContent = `${message}`;
    // console.log(messageBox);
    modal.classList.add("active");
    okBtn.addEventListener("click", hideModal);

    //========================================================================================================================================================
    // patch #2
    function autoCloseModal() {
      timerCloseModal = setTimeout(hideModal, 2700);
    }
  }
  function hideModal() {
    const modal = document.getElementById("modal");
    modal.classList.remove("active");
    resetForm();
  }

  // Очищення форми
  function resetForm() {
    AppDOM.messageCntEl.textContent = "";
    shiftType = undefined;
    employeId = undefined;
    AppDOM.formEl.reset();
    AppDOM.inputCntEl.focus();
  }
  // перший автофокус
  AppDOM.inputCntEl.focus();

  // Отримання значень із рядка вводу коду
  AppDOM.inputCntEl.addEventListener("change", function (e) {
    if (e.target.value) {
      employeId = document.querySelector('input[name="employeId"]').value; // get ID from input
    }
  });

  // Відправка форми
  //========================================================================================================================================================

  // Коли DOM завантажено:
  AppDOM.formEl.addEventListener("submit", function (event) {
    event.preventDefault();
    // console.log(shiftType, employeId)
    // Блокуємо кнопку відправки також радіокнопки

    AppDOM.submitBtnEl.setAttribute("disabled", true);
    AppDOM.radioButtonsEl.forEach((el) => el.setAttribute("disabled", true));
    AppDOM.inputCntEl.dataset.state = "checking";
    AppDOM.submitBtnEl.textContent = "Перевірка...";
    // Виклик функції порівняння даних та (якщо є збіг) надсилання
    google.script.run
      .withSuccessHandler((result) => {
        console.log(result);

        AppDOM.messageCntEl.textContent = result.message;
        AppDOM.messageCntEl.style.color = result.isValid ? "#f5f5f5" : "yellow";

        if (result.isValid) {
          const name = result.name;
          // google.script.run.writeShiftData(shiftType, employeId, name);

          AppDOM.submitBtnEl.textContent = "Підтвердити";
          AppDOM.inputCntEl.removeAttribute("data-state");
          showModal(result.message, result.isValid);
        } else if (!result.isValid) {
          showModal(result.message, result.isValid);
          AppDOM.inputCntEl.removeAttribute("data-state");
          // AppDOM.submitBtnEl.removeAttribute("disabled");
          AppDOM.submitBtnEl.textContent = "Підтвердити";
        }
      })
      .withFailureHandler((error) => {
        alert("Помилка: " + error.message);

        AppDOM.submitBtnEl.removeAttribute("disabled");
        AppDOM.submitBtnEl.textContent = "Підтвердити";
        resetForm();
      })
      .compareData(employeId, shiftType);
  });
  AppDOM.formEl.addEventListener("reset", function (event) {
    resetForm();

    // console.log(shiftType, employeId)
  });

  // document.addEventListener('keydown',e=>e.key ==='t'? showModal('mess', true):null)

  // patch 00.1
  //========================================================================================================================================================

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      // console.log('перехоплено подію ентер фокус спрямовано на радіокнопки')
      AppDOM.radioButtonsEl[0].focus();
    }
  });
});
