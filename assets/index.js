import {getAll, saveAll, saveDate} from './db.js';

// 获取元素
const chooseDateBtn = document.getElementById('chooseDateBtn');
const datePicker = document.getElementById('datePicker');
let editingTodoId = null; // 用于保存当前正在编辑的待办项的ID

// 日期选择按钮事件，点击后弹出日期选择器
chooseDateBtn.addEventListener('click', () => {
    if (editingTodoId !== null) {
        const todo = todosByDate[currentSelectedDate].find(todo => todo.id === editingTodoId);
        if (todo) {
            if (todo) {
                // 显示日期选择器并设置默认值为当前待办事项的日期
                datePicker.value = currentSelectedDate;
                datePicker.style.display = 'inline-block';
                //datePicker.focus(); // 使日期选择器自动获得焦点
            }
        }
    }
});

// 监听用户选择日期的事件
datePicker.addEventListener('change', (event) => {
    const selectedDate = event.target.value;

    if (selectedDate && editingTodoId !== null) {
        updateTodoDate(editingTodoId, selectedDate);
    }
    datePicker.style.display = 'none';
});


let currentDate = new Date(); // 当前显示的开始日期
const daysContainer = document.getElementById("daysContainer");

/**
 * 待办数据
 * @type {Todo}
 */
let todosByDate = {};
// 待办容器
const todoContainer = document.getElementById('todoContainer');
// 新增待办按钮
const addTodoBtn = document.getElementById('addTodo');
// 初始日期
let currentSelectedDate = formatDate(currentDate);

/**
 * 拖拽的待办
 * @type {null | TodoItemDrag}
 */
let draggedTodo = null; // 存储被拖动的待办信息

function loadTodos() {
    getAll().then(res => {
        todosByDate = res;
        moveUncompletedTodosToToday();
        updateDays();
        renderTodoList();
    });
}

/**
 * 保存待办，保存的日期
 * @param dates {...string} 要保存的日期
 * @return {Promise<void>}
 */
async function saveTodos(...dates) {
    let hasValidTodos = false; // 用于跟踪是否存在有效的 todos

    for (const date of dates) {
        /**
         * @type {Array<TodoItem>}
         */
        const items = todosByDate[date] || [];
        // 过滤掉空文本的 todos
        const validTodos = items.filter(todo => todo.text.trim() !== '');
        /** @type {Array<TodoItem>} */
        let todosToSave = [];

        if (validTodos.length > 0) {
            hasValidTodos = true; // 如果有有效的 todos，则标记为 true
            // 重新赋值
            todosToSave = validTodos.map(todo => {
                /** @type {TodoItem} */
                const a =  {
                    id: todo.id,
                    text: todo.text,
                    completed: todo.completed
                    // 不再保存 editing 和 deleteConfirmed
                }
                return a;
            }).reduce((unique, item) => {
                if (!unique.some(i => i.id === item.id)) {
                    unique.push(item);
                }
                return unique;
            }, []);
        }
        await saveDate(date, todosToSave)
    }
}

/**
 * 格式化日期
 * @param date {Date} 日期
 * @returns {string} 格式化结果，返回 YYYY-MM-DD 格式
 */
function formatDate(date) {
    const offsetDate = new Date(date.getTime() + (8 * 60 * 60 * 1000)); // Offset for GMT+8
    return offsetDate.toISOString().split('T')[0]; // 返回 YYYY-MM-DD 格式
}

/**
 * 生成7天的日期显示 (始终以周一为开始)
 */
function updateDays() {
    daysContainer.innerHTML = '';
    const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    let tempDate = new Date(currentDate);
    const dayOffset = tempDate.getDay() === 0 ? 6 : tempDate.getDay() - 1;
    tempDate.setDate(tempDate.getDate() - dayOffset); // 回到周一

    for (let i = 0; i < 7; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        const formattedDate = formatDate(tempDate);

        dayDiv.innerHTML = `${dayOfWeek[tempDate.getDay()]}<br>${tempDate.getMonth() + 1}-${tempDate.getDate()}`;
        dayDiv.setAttribute("data-date", formattedDate);

        const pendingTodos = (todosByDate[formattedDate] || []).filter(todo => !todo.completed).length;
        if (pendingTodos > 0) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = pendingTodos + '';
            dayDiv.appendChild(badge);
        }

        dayDiv.addEventListener('dragover', (e) => e.preventDefault());
        dayDiv.addEventListener('drop', (e) => handleDrop(e, formattedDate));
        dayDiv.addEventListener('click', (e) => {
            const selectedDate = e.target.getAttribute("data-date");
            Array.from(daysContainer.children).forEach(d => d.classList.remove('active'));
            e.target.classList.add('active');

            showTodoList(selectedDate);
        });

        if (formattedDate === formatDate(new Date())) {
            dayDiv.classList.add('today');
        }

        if (formattedDate === currentSelectedDate) {
            dayDiv.classList.add('active');
        }

        daysContainer.appendChild(dayDiv);
        tempDate.setDate(tempDate.getDate() + 1);
    }
}

/**
 * 显示指定日期1的待办列表
 * @param date {string} 日期
 */
function showTodoList(date) {
    currentSelectedDate = date;

    renderTodoList();
}

function renderTodoList(save = true) {
    todoContainer.innerHTML = '';
    const todos = todosByDate[currentSelectedDate] || [];

    const uncompletedTodos = todos.filter(todo => !todo.completed);
    const completedTodos = todos.filter(todo => todo.completed);

    uncompletedTodos.forEach(todo => createTodoElement(todo));
    completedTodos.forEach(todo => createTodoElement(todo));
    // 聚焦到最后一个新增的或正在编辑的待办
    const editingTodo = todos.find(todo => todo.editing);
    if (editingTodo) {
        const inputField = Array.from(todoContainer.children).find(item => item.querySelector('.todo-text').value === editingTodo.text);
        if (inputField) {
            inputField.querySelector('.todo-text').focus();

        }
    } else {
        const lastTodo = Array.from(todoContainer.children).slice(-1)[0];
        if (lastTodo) {
            lastTodo.querySelector('.todo-text').focus();
        }
    }

    updateDays();
    if (save) {
        saveTodos(currentSelectedDate)
            .then(() => console.log('待办保存成功[当前日期]', currentSelectedDate))
            .catch(e => {
                utools.showNotification(`待办保存失败[当前日期]，${e.message || e}`);
                console.error(e);
            });
    }
}

/**
 * 创建一个待办元素
 * @param todo {TodoItemWrap} 待办项
 */
function createTodoElement(todo) {
    const todoElement = document.createElement('div');
    todoElement.className = 'todo-item';
    todoElement.setAttribute('draggable', "true");
    todoElement.addEventListener('dragstart', () => handleDragStart(todo));

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('click', () => toggleComplete(todo.id));
    todoElement.appendChild(checkbox);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-text';
    input.value = todo.text;
    input.disabled = !todo.editing;
    if (todo.completed) input.classList.add('completed');
    input.addEventListener('dblclick', () => editTodoText(todo.id)); // 双击进入编辑模式
    todoElement.appendChild(input);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'todo-buttons';

    if (todo.editing) {
        todoElement.classList.add('editing');
        todoElement.setAttribute('draggable', "false");

        // 创建选择日期按钮
        const chooseDateBtn = document.createElement('button');
        chooseDateBtn.textContent = '选择日期';
        // 新增日期选择器容器
        const datePickerContainer = document.createElement('div');
        datePickerContainer.className = 'date-picker-container';
        // 选择日期按钮的点击事件
        chooseDateBtn.addEventListener('click', () => {
            // 显示日期选择器并设置默认值为当前待办事项的日期
            datePicker.value = currentSelectedDate; // 使用当前选定的日期
            datePicker.style.display = 'inline-block'; // 显示日期选择器
            //datePicker.focus(); // 聚焦到日期选择器
            chooseDateBtn.style.display = 'none';


            // 遍历所有按钮，查找文本为“确定”的按钮
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                if (button.textContent.trim() === '确定' || button.textContent.trim() === '删除') {
                    button.style.display = 'none';

                }
            });


        });

        // 将日期选择器和按钮添加到容器中
        datePickerContainer.appendChild(datePicker);
        datePickerContainer.appendChild(chooseDateBtn);
        buttonContainer.appendChild(datePickerContainer);
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '确定';
        saveBtn.addEventListener('click', () => saveTodoText(todo.id, input.value));

        buttonContainer.appendChild(saveBtn);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                saveTodoText(todo.id, input.value);
            }
        });
        input.focus(); // 自动聚焦
    } else {
        const editBtn = document.createElement('button');
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', () => {
            editTodoText(todo.id);
            input.focus(); // 编辑时自动聚焦到输入框
        });


        datePicker.addEventListener('change', (event) => {
            const selectedDate = event.target.value;

            if (selectedDate && editingTodoId !== null) {
                updateTodoDate(editingTodoId, selectedDate); // 更新待办事项的日期

            }
            datePicker.style.display = 'none'; // 隐藏日期选择器
        });
        buttonContainer.appendChild(editBtn);

    }

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = todo.deleteConfirmed ? '确认删除' : '删除';
    datePicker.style.display = 'none';
    deleteBtn.classList.toggle('delete-confirm', todo.deleteConfirmed);
    deleteBtn.addEventListener('click', () => {

        confirmDelete(todo.id);
        console.log("点删除");
        chooseDateBtn.style.display = 'none';

    });

// 添加 mouseenter 和 mouseleave 事件监听器
    deleteBtn.addEventListener('mouseenter', () => {
        if (todo.deleteConfirmed) {
            deleteBtn.textContent = '确认删除'; // 鼠标悬停时保持确认删除


        }
    });

    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.textContent = '删除'; // 鼠标移开时恢复文本

        todo.deleteConfirmed = false;
    });

    buttonContainer.appendChild(deleteBtn);

    todoElement.appendChild(buttonContainer);
    todoContainer.appendChild(todoElement);
}

function handleDragStart(todo) {
    const currentDateElement = document.querySelector('.calendar-day.active'); // 获取当前选中日期的元素
    const currentDate = currentDateElement ? currentDateElement.getAttribute('data-date') : currentSelectedDate; // 获取当前选中日期
    draggedTodo = {...todo, sourceDate: currentDate}; // 将当前日期设置为源日期
}

function handleDrop(event, targetDate) {
    event.preventDefault(); // 防止默认行为

    if (draggedTodo) {
        const {sourceDate} = draggedTodo;
        // 从原日期中删除
        todosByDate[sourceDate] = todosByDate[sourceDate].filter(todo => todo.id !== draggedTodo.id);
        // 添加到目标日期
        todosByDate[targetDate] = todosByDate[targetDate] || [];
        todosByDate[targetDate].push({
            ...draggedTodo,
            id: Date.now()
        });

        // 更新当前选中日期的待办列表
        if (currentSelectedDate === sourceDate || currentSelectedDate === targetDate) {
            renderTodoList();
        }
        saveTodos(sourceDate, targetDate)
            .then(() => console.log('待办保存成功[拖拽]', sourceDate, targetDate))
            .catch(e => {
                utools.showNotification(`待办保存失败[拖拽]，${e.message || e}`);
                console.error(e)
            });
        draggedTodo = null; // 清空被拖动的待办信息
        updateDays();
        renderCalendar(); // 重新渲染日历

    }
}


function addNewTodo() {
    const newTodo = {
        id: Date.now(),
        text: '',
        completed: false,
        editing: true,
        deleteConfirmed: false
    };
    // 不将空的新增待办存储
    todosByDate[currentSelectedDate] = todosByDate[currentSelectedDate] || [];
    todosByDate[currentSelectedDate].push(newTodo);
    datePicker.style.display = 'none';
    renderTodoList();

    const inputFields = document.querySelectorAll('.todo-text');
    inputFields[inputFields.length - 1].focus(); // 光标自动聚焦


    const buttons = document.querySelectorAll('button');

    // 遍历所有按钮，查找文本为“确定”的按钮
    buttons.forEach(button => {
        if (button.textContent.trim() === '选择日期') {
            button.style.display = 'none';
        }
    });


}

function toggleComplete(id) {
    todosByDate[currentSelectedDate] = todosByDate[currentSelectedDate].map(todo => {
        if (todo.id === id) {
            todo.completed = !todo.completed;
        }
        return todo;
    });
    renderTodoList();
}

function saveTodoText(id, newText) {
    todosByDate[currentSelectedDate] = todosByDate[currentSelectedDate].map(todo => {
        if (todo.id === id) {
            if (!newText.trim()) {
                return null; // 如果文本为空，则删除待办
            }
            todo.text = newText;
            // 不再保存 editing 状态
            todo.editing = false;
        }
        return todo;
    }).filter(todo => todo !== null); // 过滤掉空文本的待办
    renderTodoList();
    chooseDateBtn.style.display = 'none'; // 隐藏 "选择日期" 按钮
    editingTodoId = null; // 清空编辑中的ID
}

function editTodoText(id) {
    todosByDate[currentSelectedDate] = todosByDate[currentSelectedDate].map(todo => {
        if (todo.id === id) {
            todo.editing = true;
            editingTodoId = id; // 保存正在编辑的待办ID
        }
        return todo;
    });
    chooseDateBtn.style.display = 'none'; // 显示 "选择日期" 按钮
    renderTodoList();
}

function updateTodoDate(id, newDate) {

    // 从当前日期移除该待办事项
    const todo = todosByDate[currentSelectedDate].find(todo => todo.id === id);
    if (todo) {
        // 从当前日期移除该待办事项
        todosByDate[currentSelectedDate] = todosByDate[currentSelectedDate].filter(todo => todo.id !== id);
        // 将待办事项添加到新日期
        todosByDate[newDate] = todosByDate[newDate] || [];
        todosByDate[newDate].push(todo);
        currentSelectedDate = newDate; // 更新当前选中的日期
        renderTodoList();
        const buttons = document.querySelectorAll('button');

        // 遍历所有按钮，查找文本为“确定”的按钮
        buttons.forEach(button => {
            if (button.textContent.trim() === '确定') {
                button.click(); // 点击按钮
            }
        });

    }
    chooseDateBtn.style.display = 'none'; // 隐藏 "选择日期" 按钮
    editingTodoId = null; // 清空编辑中的ID
}

function confirmDelete(id) {


    chooseDateBtn.style.display = 'none'


    todosByDate[currentSelectedDate] = todosByDate[currentSelectedDate].map(todo => {

        if (todo.id === id) {
            if (todo.deleteConfirmed) {
                return null;

            }
            todo.deleteConfirmed = true;
        }

        return todo;
    }).filter(todo => todo !== null);

    renderTodoList();
}

document.getElementById("prevDay").addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 7);
    updateDays();
});

document.getElementById("nextDay").addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 7);
    updateDays();
});

addTodoBtn.addEventListener('click', addNewTodo);

/**
 * 将今天之前没完成的移动到今天
 */
function moveUncompletedTodosToToday() {
    const today = formatDate(new Date());
    for (let date in todosByDate) {
        if (date < today) {
            const uncompletedTodos = todosByDate[date].filter(todo => !todo.completed);
            if (uncompletedTodos.length > 0) {
                /**
                 *
                 * @type {Array<TodoItemWrap>}
                 */
                const todayItems = todosByDate[today] || [];
                todosByDate[today] = todayItems.concat(uncompletedTodos);
                todosByDate[date] = todosByDate[date].filter(todo => todo.completed);
            }
        }
    }
}

loadTodos();


let isCalendarView = false; // 跟踪是否在日历视图中
const calendarViewBtn = document.getElementById("calendarViewBtn");
const calendarBody = document.getElementById("calendarBody");

calendarViewBtn.addEventListener('click', toggleCalendarView);
document.getElementById("prevMonth").addEventListener('click', () => changeMonth(-1));
document.getElementById("nextMonth").addEventListener('click', () => changeMonth(1));

function toggleCalendarView() {
    isCalendarView = !isCalendarView;
    document.getElementById("todoContainer").style.display = isCalendarView ? 'none' : 'block';
    document.getElementById("calendarView").style.display = isCalendarView ? 'block' : 'none';
// 控制日期导航的显示与隐藏
    document.querySelector('.date-nav').style.display = isCalendarView ? 'none' : 'flex';
    calendarViewBtn.textContent = isCalendarView ? '🕔️周视图' : '📅日历视图';
    const addTodoButton = document.getElementById("addTodo");
    addTodoButton.style.display = isCalendarView ? 'none' : 'block';


    if (isCalendarView) {
        renderCalendar();
    }

    if (!isCalendarView) {
        location.reload(); // Reloads the current page
        currentSelectedDate = formatDate(currentDate); // 设置当前选中日期为当前日期
        //renderTodoList();  渲染待办事项列表
        //renderCalendar();
    }
}

let currentMonth = new Date(); // 当前显示的月份

function changeMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    renderCalendar();
}

function updateViewLabel(year, month) {
    const viewLabel = document.getElementById("viewLabel");
    viewLabel.textContent = `${year}年${month}月`;
}

/**
 * 渲染日历
 */
function renderCalendar() {
    calendarBody.innerHTML = '';
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    updateViewLabel(year, month + 1);

    // 获取当月第一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // 获取上个月最后一天
    const startDay = firstDay.getDay(); // 周几开始


    // 添加前置空格
    for (let i = 1; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        calendarBody.appendChild(emptyDay);
    }

    // 添加每一天的数字
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day + '';

        // 标记今天
        if (day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) {
            dayDiv.classList.add('today');
        }

        // 添加待办事项
        const formattedDate = `${year}-${month + 1}-${day}`;
        const todos = todosByDate[formattedDate] || [];
        todos.forEach(todo => {
            const todoText = document.createElement('div');
            todoText.textContent = `· ${todo.text}`; // 添加符号
            if (todo.completed) {
                todoText.classList.add('completed');
            }
            // 设置为可拖动

            todoText.setAttribute('draggable', "true");


            let isDragging = false;
            let clickCount = 0; // 记录点击次数

            todoText.addEventListener('dragstart', () => {
                isDragging = true; // 设置拖动标志

                handleDragStart(todo); // 拖动开始
            });

            dayDiv.addEventListener('mousedown', () => {
                clickCount = 0; // 重置点击次数
                currentSelectedDate = formattedDate; // 更新当前选中日期

                renderCalendar(); // 重新渲染日历以高亮显示选中日期
            });

            todoText.addEventListener('mousedown', () => {
                clickCount++; // 增加点击次数

                if (clickCount === 2) { // 检测双击

                    if (!isDragging) { // 如果没有拖动，执行双击事件
                        toggleComplete(todo.id); // 切换任务状态
                        renderCalendar(); // 更新日历视图
                    }
                    clickCount = 0; // 重置点击次数
                }
            });

// 拖动结束时重置拖动标志
            todoText.addEventListener('dragend', () => {
                isDragging = false; // 重置拖动状态
            });


            // 更新 currentSelectedDate

            dayDiv.appendChild(todoText);
        });


        // 更新当前选中日期


        dayDiv.setAttribute("data-date", formattedDate);
        dayDiv.addEventListener('dragover', (e) => e.preventDefault());
        dayDiv.addEventListener('drop', (e) => handleDrop(e, formattedDate));
        calendarBody.appendChild(dayDiv);
    }
}

/**
 * 导出数据
 */
function exportData() {
    utools.createBrowserWindow('./export.html', {
        width: 800,
        height: 600
    })
}

function showHelp() {
    utools.createBrowserWindow("./help.html", {
        width: 800,
        height: 600
    })
}

document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === '.') {
        exportData()
    } else if (event.ctrlKey && event.key === '/') {
        showHelp();
    }
});


// 监听键盘事件
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === ',') {
        // 弹出输入框
        const userInput = prompt("请输入待办事项：");
        if (userInput) {
            importTodos(userInput);
        }
    }
});

function importTodos(input) {
    const todosByDate = {};

    // 按行分割输入内容
    const lines = input.split('\n');

    let currentDate = '';

    lines.forEach(line => {
        line = line.trim();
        // 匹配日期
        const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})$/);
        if (dateMatch) {
            currentDate = dateMatch[1];
            todosByDate[currentDate] = [];
        }
        // 匹配待办事项
        const todoMatch = line.match(/^- \[([x ])] (.+)$/);
        if (todoMatch && currentDate) {
            const completed = todoMatch[1] === 'x';
            const text = todoMatch[2];

            // 添加待办事项（忽略 ID）
            todosByDate[currentDate].push({
                id: Date.now(), // 生成新 ID
                text: text,
                completed: completed
            });
        }
    });

    saveAll(todosByDate)
        .then(() => {
            utools.showNotification("导入成功");
            // 重新加载待办
            loadTodos()
        })
        .catch(e => utools.showNotification(`导入失败，${e.message || e}`))
}
