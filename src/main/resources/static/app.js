import { getAllTasks, updateTask, createTask, deleteTask } from "./api.js"

const elements = {
  board: document.getElementById("board"),
  loadingElement: document.getElementById("loading"),
  errorContainer: document.getElementById("error-container"),
  newTaskBtn: document.getElementById("new-task-btn"),
  createTaskModal: document.getElementById("create-task-modal"),
  editTaskModal: document.getElementById("edit-task-modal"),
  createTaskForm: document.getElementById("create-task-form"),
  editTaskForm: document.getElementById("edit-task-form"),
  contextMenu: document.getElementById("context-menu"),
  closeBtns: document.querySelectorAll(".close-btn"),
  cancelBtns: document.querySelectorAll(".cancel-btn"),
  dateBoard: document.getElementById("date-board"),
  todayList: document.getElementById("today"),
  tomorrowList: document.getElementById("tomorrow"),
  unstartedList: document.getElementById("unstarted"),
  inProgressList: document.getElementById("in-progress"),
  finishedList: document.getElementById("finished"),
}

let tasks = [];
let currentTaskId = null;

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  initTasks();
  setupEventListeners();
  initializeSortable();
}

// initializes the page by getting and rendering the tasks
async function initTasks() {
  toggleLoading(true)
  tasks = await getAllTasks()
  if (!tasks || tasks.length === 0) {
    tasks = [];
  }
  renderTasks();
  toggleLoading(false);
}

// toggles view from loading to tasks board
function toggleLoading(loading) {
  if (loading) {
    elements.loadingElement.style.display = "flex";
    elements.board.classList.add("hidden");
  } else {
    elements.loadingElement.style.display = "none";
    elements.board.classList.remove("hidden");
    elements.dateBoard.classList.remove("hidden");
  }
}
// displays the tasks in their sections
function renderTasks() {
  clearTasksContainers();
  const { tasksByDate, tasksByStatus } = groupTasks();
  // status columns
  renderTasksInColumn(elements.unstartedList, tasksByStatus.UNSTARTED);
  renderTasksInColumn(elements.inProgressList, tasksByStatus.IN_PROGRESS);
  renderTasksInColumn(elements.finishedList, tasksByStatus.FINISHED);
  // Date columns
  renderTasksInColumn(elements.todayList, tasksByDate.today, true);
  renderTasksInColumn(elements.tomorrowList, tasksByDate.tomorrow, true);
}

// empties html content of each container
function clearTasksContainers() {
  // Clear existing tasks
  elements.unstartedList.innerHTML = "";
  elements.inProgressList.innerHTML = "";
  elements.finishedList.innerHTML = "";
  elements.todayList.innerHTML = "";
  elements.tomorrowList.innerHTML = "";
}

// group tasks by date and by status
function groupTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasksByDate = {
    today: [],
    tomorrow: [],
  }

  const tasksByStatus = {
    UNSTARTED: [],
    IN_PROGRESS: [],
    FINISHED: [],
  }

  tasks.forEach((task) => {
    if (task.status in tasksByStatus) {
      tasksByStatus[task.status].push(task);
    } else { // set unstarted by default in case of an invalid status
      tasksByStatus.UNSTARTED.push(task);
    }

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate.getTime() === today.getTime()) {
        tasksByDate.today.push(task);
      } else if (dueDate.getTime() === tomorrow.getTime()) {
        tasksByDate.tomorrow.push(task);
      }
    }
  });

  return { tasksByDate, tasksByStatus }
}

// displays task in an specific column
function renderTasksInColumn(column, tasks, isDateColumn) {
  if (tasks.length === 0) {
    column.innerHTML = '<div class="empty-column">No tasks</div>';
    return ;
  }

  tasks.forEach((task) => {
    const taskElement = createTaskElement(task, isDateColumn);
    column.appendChild(taskElement);
  });
}

//creates each task element
function createTaskElement(task, isDateView) {
  const taskElement = document.createElement("div");

  taskElement.className = `task-card status-${task.status} ${isDateView ? "date-view" : "status-view"}`;
  taskElement.dataset.id = task.id;

  let dueDateClass = "";
  let dueDateText = "";

  if (task.dueDate) {
    const formattedDate = formatDate(task.dueDate);
    if (formattedDate.outdated) {
      dueDateClass = "overdue";
    } else if (formattedDate.text === "Today") {
      dueDateClass = "due-today";
    }
    dueDateText = `
            <div class="task-due-date ${dueDateClass}">
                <i class="fas fa-calendar-alt"></i> ${formattedDate.text}
            </div>
        `;
  }

  taskElement.innerHTML = `
        <div class="task-header">
            <div class="task-title">${task.title}</div>
            <div class="task-menu">
                <i class="fas fa-ellipsis-v"></i>
            </div>
        </div>
        <div class="task-description">${task.description || "No description"}</div>
        ${dueDateText}
    `;
  // Add event listener for the menu button
  const menuButton = taskElement.querySelector(".task-menu")
  menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    showContextMenu(e, task.id);
  });

  return taskElement;
}

// Format date to a readable string, returning also a flag for outdated ones
function formatDate(dueDate) {
  const today = new Date();
  const date = new Date(dueDate);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return { text: "Today", outdated: false }
  } else if (date.getTime() === tomorrow.getTime()) {
    return { text: "Tomorrow", outdated: false }
  } else if (date < today) {
    return { text: date.toLocaleDateString(), outdated: true }
  } else {
    return { text: date.toLocaleDateString(), outdated: false }
  }
}
// Initialize Sortable.js for drag and drop
function initializeSortable() {
  const taskLists = document.querySelectorAll(".task-list")

  taskLists.forEach((taskList) => {
    const sortable = new Sortable(taskList, {
      group: "tasks",
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd: (evt) => {
        const taskId = Number.parseInt(evt.item.dataset.id);
        // Check if we're moving to a status column
        if (evt.to.dataset.status) {
          const newStatus = evt.to.dataset.status;
          if (taskId && newStatus) {
            updateTaskStatus(taskId, newStatus);
          }
        }
        // Check if we're moving to a date column
        if (evt.to.dataset.date) {
          const newDateType = evt.to.dataset.date;
          if (taskId && newDateType) {
            updateTaskDueDate(taskId, newDateType);
          }
        }
      },
    });
  });
}

// handles tasks status updates
async function updateTaskStatus(taskId, newStatus) {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return;
  // Optimistic update
  const originalStatus = task.status;
  task.status = newStatus;
  task.completed = newStatus === "FINISHED";
  renderTasks();

  const updatedTask = await updateTask(taskId, task)
  if (!updatedTask) {
    // Revert if update failed
    task.status = originalStatus;
    task.completed = originalStatus === "FINISHED";
    renderTasks();
    showError("Failed to update task status");
  } else {
    // Refresh tasks to ensure we have the latest data
    tasks = await getAllTasks();
    renderTasks();
  }
}

// handles tasks due date updates
async function updateTaskDueDate(taskId, dateType) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newDueDate;
    if (dateType === "today") {
        newDueDate = new Date(today);
    } else if (dateType === "tomorrow") {
        newDueDate = new Date(today);
        newDueDate.setDate(newDueDate.getDate() + 1);
    }

    const formattedDueDate = newDueDate.toLocaleDateString("en-CA");
    // Optimistic update
    task.dueDate = formattedDueDate;
    renderTasks();
    const updatedTask = await updateTask(taskId, task);
    if (!updatedTask) {
        showError("Failed to update task due date. Please try again.");
        tasks = await getAllTasks();
        renderTasks();
    }
}

// handles new task creation
async function handleCreateTask(taskData) {
  const createdTask = await createTask(taskData)
  if (!createdTask) {
    showError("Failed to create task");
    return;
  }
  tasks.push(createdTask);
  renderTasks();
  closeModal(elements.createTaskModal);
}

// handles tasks updates when editing
async function handleUpdateTask(taskId, taskData) {
  const taskIndex = tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) return;

  const originalTask = { ...tasks[taskIndex] };
  // Optimistic update
  tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
  renderTasks();

  const updatedTask = await updateTask(taskId, taskData);
  if (!updatedTask) {
    // Revert if update failed
    tasks[taskIndex] = originalTask;
    renderTasks();
    showError("Failed to update task");
  } else {
    // Refresh tasks to ensure we have the latest data
    tasks = await getAllTasks();
    renderTasks();
    closeModal(elements.editTaskModal);
  }
}
// handles tasks deletion
async function handleDeleteTask(taskId) {
  const taskIndex = tasks.findIndex((t) => t.id === taskId)

  if (taskIndex === -1) return;

  // Optimistic delete
  const previousTasks = [...tasks]
  tasks.splice(taskIndex, 1);
  renderTasks();

  const success = await deleteTask(taskId);
  if (!success) {
    // Revert if delete failed
    tasks = previousTasks;
    renderTasks();
    showError("Failed to delete task");
  }
}

function showError(message) {
  elements.errorContainer.textContent = message
  elements.errorContainer.classList.remove("hidden");
  // Hide error after 5 seconds
  setTimeout(() => {
    elements.errorContainer.classList.add("hidden");
  }, 5000)
}

// Show the context menu for a task
function showContextMenu(event, taskId) {
  event.preventDefault();

  // Set current task ID
  currentTaskId = taskId;

  // Position the context menu
  elements.contextMenu.style.display = "block";
  elements.contextMenu.style.left = `${event.clientX}px`;
  elements.contextMenu.style.top = `${event.clientY}px`;

  // Adjust position if menu goes off screen
  const rect = elements.contextMenu.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  if (rect.right > windowWidth) {
    elements.contextMenu.style.left = `${windowWidth - rect.width - 5}px`;
  }

  if (rect.bottom > windowHeight) {
    elements.contextMenu.style.top = `${windowHeight - rect.height - 5}px`;
  }

  // Add event listener to close menu when clicking outside
  setTimeout(() => {
    document.addEventListener("click", closeContextMenu);
  }, 0)
}

// Close the context menu
function closeContextMenu() {
  elements.contextMenu.style.display = "none";
  document.removeEventListener("click", closeContextMenu);
}

// Show the create task modal
function showCreateTaskModal() {
  elements.createTaskForm.reset();
  elements.createTaskModal.style.display = "block";
}

// Show the edit task modal
function showEditTaskModal(taskId) {
  const task = tasks.find((t) => t.id === taskId);

  if (!task) return;

  document.getElementById("edit-task-id").value = task.id;
  document.getElementById("edit-title").value = task.title;
  document.getElementById("edit-description").value = task.description || "" ;
  document.getElementById("edit-status").value = task.status;

  // Set due date if available
  if (task.dueDate) {
    document.getElementById("edit-due-date").value = task.dueDate;
  } else {
    document.getElementById("edit-due-date").value = "" ;
  }

  elements.editTaskModal.style.display = "block";
}

// Close a modal
function closeModal(modal) {
  modal.style.display = "none";
}

// Set up event listeners
function setupEventListeners() {
  // New Task button
  elements.newTaskBtn.addEventListener("click", showCreateTaskModal);

  // Close buttons for modals
  elements.closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.closest(".modal")));
  })

  // Cancel buttons for modals
  elements.cancelBtns.forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.closest(".modal")));
  })

  // Create Task form submission
  elements.createTaskForm.addEventListener("submit", (e) => {
    e.preventDefault()
	const taskData = getTaskDataToCreate();
	if (!taskData) return;
    handleCreateTask(taskData);
  })

  // Edit Task form submission
  elements.editTaskForm.addEventListener("submit", (e) => {
    e.preventDefault()
	const updatedTask = getTaskDataToUpdate();
	if (!updatedTask()) return ;
    handleUpdateTask(taskId, updatedTask);
  })

  // Context menu actions
  document.getElementById("edit-task").addEventListener("click", () => {
    if (currentTaskId) {
      showEditTaskModal(currentTaskId);
    }
    closeContextMenu();
  })

  document.getElementById("delete-task").addEventListener("click", () => {
    if (currentTaskId && confirm("Are you sure you want to delete this task?")) {
      handleDeleteTask(currentTaskId);
    }
    closeContextMenu();
  })

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === elements.createTaskModal) {
      closeModal(elements.createTaskModal);
    }
    if (e.target === elements.editTaskModal) {
      closeModal(elements.editTaskModal);
    }
  })

  // Close context menu when pressing Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeContextMenu()
      closeModal(elements.createTaskModal);
      closeModal(elements.editTaskModal);
    }
  })
}
// gets new task data from de DOM
function getTaskDataToCreate() {
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const status = document.getElementById("status").value;
    const dueDate = document.getElementById("due-date").value;

    if (!title) return null;

    const newTask = {
      title,
      description,
      status,
      completed: status === "FINISHED",
      dueDate: dueDate || null,
    }
	return newTask;
}
// gets edited task data form de DOM
function getTaskDataToUpdate() {
	const taskId = Number.parseInt(document.getElementById("edit-task-id").value);
    const title = document.getElementById("edit-title").value.trim();
    const description = document.getElementById("edit-description").value.trim();
    const status = document.getElementById("edit-status").value;
    const dueDate = document.getElementById("edit-due-date").value;

    if (!title || !taskId) return null;

    const updatedTask = {
      title,
      description,
      status,
      completed: status === "FINISHED",
      dueDate: dueDate || null,
    }
	return updatedTask;
}