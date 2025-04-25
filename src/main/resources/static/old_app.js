// API Configuration
const API_BASE_URL = "http://localhost:8080" // Change this to match your Spring Boot API URL

// DOM Elements
const board = document.getElementById("board")
const loadingElement = document.getElementById("loading")
const errorContainer = document.getElementById("error-container")
const newTaskBtn = document.getElementById("new-task-btn")
const createTaskModal = document.getElementById("create-task-modal")
const editTaskModal = document.getElementById("edit-task-modal")
const createTaskForm = document.getElementById("create-task-form")
const editTaskForm = document.getElementById("edit-task-form")
const contextMenu = document.getElementById("context-menu")
const closeBtns = document.querySelectorAll(".close-btn")
const cancelBtns = document.querySelectorAll(".cancel-btn")

const dateBoard = document.getElementById("date-board")
const todayList = document.getElementById("today")
const tomorrowList = document.getElementById("tomorrow")

// Task Lists
const unstartedList = document.getElementById("unstarted")
const inProgressList = document.getElementById("in-progress")
const finishedList = document.getElementById("finished")

// State
let tasks = []
let currentTaskId = null

// Initialize the application
document.addEventListener("DOMContentLoaded", init)

function init() {
  // Fetch tasks from API
  fetchTasks()

  // Set up event listeners
  setupEventListeners()

  // Initialize Sortable for drag and drop
  initializeSortable()

}

// Fetch tasks from the API
async function fetchTasks() {
  showLoading()

  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks`)

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    tasks = await response.json()
    renderTasks()
    hideLoading()
    showBoard()
  } catch (error) {
    console.error("Error fetching tasks:", error)
    showError("Failed to load tasks. Please check your API connection.")
    hideLoading()
  }
}

// Render tasks in their respective columns
function renderTasks() {
  // Clear existing tasks
  unstartedList.innerHTML = ""
  inProgressList.innerHTML = ""
  finishedList.innerHTML = ""
  todayList.innerHTML = ""
  tomorrowList.innerHTML = ""

  // Group tasks by status
  const tasksByStatus = {
    UNSTARTED: [],
    IN_PROGRESS: [],
    FINISHED: [],
  }

  // Group tasks by due date
  const tasksByDate = {
    today: [],
    tomorrow: [],
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  tasks.forEach((task) => {
    // Add to status columns
    if (task.status in tasksByStatus) {
      tasksByStatus[task.status].push(task)
    } else {
      // Default to UNSTARTED if status is invalid
      tasksByStatus.UNSTARTED.push(task)
    }

    // Add to date columns if due date matches
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate)
      dueDate.setHours(0, 0, 0, 0)

      if (dueDate.getTime() === today.getTime()) {
        tasksByDate.today.push(task)
      } else if (dueDate.getTime() === tomorrow.getTime()) {
        tasksByDate.tomorrow.push(task)
      }
    }
  })

  // Render tasks in each column
  renderTasksInColumn(unstartedList, tasksByStatus.UNSTARTED)
  renderTasksInColumn(inProgressList, tasksByStatus.IN_PROGRESS)
  renderTasksInColumn(finishedList, tasksByStatus.FINISHED)
  // Render tasks in date columns
  renderTasksInColumn(todayList, tasksByDate.today)
  renderTasksInColumn(tomorrowList, tasksByDate.tomorrow)
}

// Modify the renderTasksInColumn function to pass the view type
function renderTasksInColumn(column, tasks) {
  if (tasks.length === 0) {
    column.innerHTML = '<div class="empty-column">No tasks</div>'
    return
  }

  // Determine if this is a date column or status column
  const isDateColumn = column.dataset.date ? true : false

  tasks.forEach((task) => {
    const taskElement = createTaskElement(task, isDateColumn)
    column.appendChild(taskElement)
  })
}

// Update the createTaskElement function to handle different view types
function createTaskElement(task, isDateView = false) {
  const taskElement = document.createElement("div")
  // Add the appropriate view class based on where the task will be displayed
  taskElement.className = `task-card status-${task.status} ${isDateView ? "date-view" : "status-view"}`
  taskElement.dataset.id = task.id

  const taskHeader = document.createElement("div")
  taskHeader.className = "task-header"

  const taskTitle = document.createElement("div")
  taskTitle.className = "task-title"
  taskTitle.textContent = task.title

  const taskMenu = document.createElement("div")
  taskMenu.className = "task-menu"
  taskMenu.innerHTML = '<i class="fas fa-ellipsis-v"></i>'
  taskMenu.addEventListener("click", (e) => {
    e.stopPropagation()
    showContextMenu(e, task.id)
  })

  taskHeader.appendChild(taskTitle)
  taskHeader.appendChild(taskMenu)
  taskElement.appendChild(taskHeader)

  // Always create the description element
  const taskDescription = document.createElement("div")
  taskDescription.className = "task-description"
  taskDescription.textContent = task.description || "No description"
  taskElement.appendChild(taskDescription)

  // Add due date information if available
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dueDateElement = document.createElement("div")
    dueDateElement.className = "task-due-date"

    // Add appropriate class based on due date
    if (dueDate < today) {
      dueDateElement.classList.add("overdue")
    } else if (dueDate.getTime() === today.getTime()) {
      dueDateElement.classList.add("due-today")
    }

    dueDateElement.innerHTML = `<i class="fas fa-calendar-alt"></i> ${formatDate(dueDate)}`
    taskElement.appendChild(dueDateElement)
  }

  return taskElement
}

// Format date to a readable string
function formatDate(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime()) {
    return "Today"
  } else if (date.getTime() === tomorrow.getTime()) {
    return "Tomorrow"
  } else {
    return date.toLocaleDateString()
  }
}

// Initialize Sortable.js for drag and drop
function initializeSortable() {
  const taskLists = document.querySelectorAll(".task-list")

  taskLists.forEach((taskList) => {
    // eslint-disable-next-line no-undef
    const sortable = new Sortable(taskList, {
      group: "tasks",
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd: (evt) => {
        const taskId = Number.parseInt(evt.item.dataset.id)

        // Check if we're moving to a status column
        if (evt.to.dataset.status) {
          const newStatus = evt.to.dataset.status
          if (taskId && newStatus) {
            updateTaskStatus(taskId, newStatus)
          }
        }

        // Check if we're moving to a date column
        if (evt.to.dataset.date) {
          const newDateType = evt.to.dataset.date
          if (taskId && newDateType) {
            updateTaskDueDate(taskId, newDateType)
          }
        }
      },
    })
  })
}

// Update task status when dragged to a new column
async function updateTaskStatus(taskId, newStatus) {
  const task = tasks.find((t) => t.id === taskId)

  if (!task) return

  const previousStatus = task.status

  // Optimistic update
  task.status = newStatus
  task.completed = newStatus === "FINISHED"
  renderTasks()

  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    // Refresh tasks to ensure we have the latest data
    fetchTasks()
  } catch (error) {
    console.error("Error updating task status:", error)

    // Revert to previous state if update fails
    task.status = previousStatus
    task.completed = previousStatus === "FINISHED"
    renderTasks()

    showError("Failed to update task status. Please try again.")
  }
}

// Update task due date when dragged to a date column
async function updateTaskDueDate(taskId, dateType) {
  const task = tasks.find((t) => t.id === taskId)

  if (!task) return

  const previousDueDate = task.dueDate

  // Calculate new due date
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let newDueDate

  if (dateType === "today") {
    newDueDate = new Date(today)
  } else if (dateType === "tomorrow") {
    newDueDate = new Date(today)
    newDueDate.setDate(newDueDate.getDate() + 1)
  }

  // Format date for API
  const formattedDueDate = newDueDate.toISOString().split("T")[0]

  // Optimistic update
  task.dueDate = formattedDueDate
  renderTasks()

  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    // Refresh tasks to ensure we have the latest data
    fetchTasks()
  } catch (error) {
    console.error("Error updating task due date:", error)

    // Revert to previous state if update fails
    task.dueDate = previousDueDate
    renderTasks()

    showError("Failed to update task due date. Please try again.")
  }
}

// Create a new task
async function createTask(taskData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskData),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const createdTask = await response.json()
    tasks.push(createdTask)
    renderTasks()
    closeModal(createTaskModal)
  } catch (error) {
    console.error("Error creating task:", error)
    showError("Failed to create task. Please try again.")
  }
}

// Update an existing task
async function updateTask(taskId, taskData) {
  const taskIndex = tasks.findIndex((t) => t.id === taskId)

  if (taskIndex === -1) return

  const previousTask = { ...tasks[taskIndex] }

  // Optimistic update
  tasks[taskIndex] = { ...tasks[taskIndex], ...taskData }
  renderTasks()

  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tasks[taskIndex]),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    // Refresh tasks to ensure we have the latest data
    fetchTasks()
    closeModal(editTaskModal)
  } catch (error) {
    console.error("Error updating task:", error)

    // Revert to previous state if update fails
    tasks[taskIndex] = previousTask
    renderTasks()

    showError("Failed to update task. Please try again.")
  }
}

// Delete a task
async function deleteTask(taskId) {
  const taskIndex = tasks.findIndex((t) => t.id === taskId)

  if (taskIndex === -1) return

  const previousTasks = [...tasks]

  // Optimistic delete
  tasks.splice(taskIndex, 1)
  renderTasks()

  try {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }
  } catch (error) {
    console.error("Error deleting task:", error)

    // Revert to previous state if delete fails
    tasks = previousTasks
    renderTasks()

    showError("Failed to delete task. Please try again.")
  }
}

// Show the context menu for a task
function showContextMenu(event, taskId) {
  event.preventDefault()

  // Set current task ID
  currentTaskId = taskId

  // Position the context menu
  contextMenu.style.display = "block"
  contextMenu.style.left = `${event.clientX}px`
  contextMenu.style.top = `${event.clientY}px`

  // Adjust position if menu goes off screen
  const rect = contextMenu.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  if (rect.right > windowWidth) {
    contextMenu.style.left = `${windowWidth - rect.width - 5}px`
  }

  if (rect.bottom > windowHeight) {
    contextMenu.style.top = `${windowHeight - rect.height - 5}px`
  }

  // Add event listener to close menu when clicking outside
  setTimeout(() => {
    document.addEventListener("click", closeContextMenu)
  }, 0)
}

// Close the context menu
function closeContextMenu() {
  contextMenu.style.display = "none"
  document.removeEventListener("click", closeContextMenu)
}

// Show the create task modal
function showCreateTaskModal() {
  createTaskForm.reset()
  createTaskModal.style.display = "block"
}

// Show the edit task modal
function showEditTaskModal(taskId) {
  const task = tasks.find((t) => t.id === taskId)

  if (!task) return

  document.getElementById("edit-task-id").value = task.id
  document.getElementById("edit-title").value = task.title
  document.getElementById("edit-description").value = task.description || ""
  document.getElementById("edit-status").value = task.status

  // Set due date if available
  if (task.dueDate) {
    document.getElementById("edit-due-date").value = task.dueDate
  } else {
    document.getElementById("edit-due-date").value = ""
  }

  editTaskModal.style.display = "block"
}

// Close a modal
function closeModal(modal) {
  modal.style.display = "none"
}

// Show loading indicator
function showLoading() {
  loadingElement.style.display = "flex"
  board.classList.add("hidden")
}

// Hide loading indicator
function hideLoading() {
  loadingElement.style.display = "none"
}

// Show the board
function showBoard() {
  board.classList.remove("hidden")
  dateBoard.classList.remove("hidden")
}

// Show error message
function showError(message) {
  errorContainer.textContent = message
  errorContainer.classList.remove("hidden")

  // Hide error after 5 seconds
  setTimeout(() => {
    errorContainer.classList.add("hidden")
  }, 5000)
}

// Set up event listeners
function setupEventListeners() {
  // New Task button
  newTaskBtn.addEventListener("click", showCreateTaskModal)

  // Close buttons for modals
  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(btn.closest(".modal"))
    })
  })

  // Cancel buttons for modals
  cancelBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(btn.closest(".modal"))
    })
  })

  // Create Task form submission
  createTaskForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const title = document.getElementById("title").value.trim()
    const description = document.getElementById("description").value.trim()
    const status = document.getElementById("status").value
    const dueDate = document.getElementById("due-date").value

    if (!title) return

    const newTask = {
      title,
      description,
      status,
      completed: status === "FINISHED",
      dueDate: dueDate || null,
    }

    createTask(newTask)
  })

  // Edit Task form submission
  editTaskForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const taskId = Number.parseInt(document.getElementById("edit-task-id").value)
    const title = document.getElementById("edit-title").value.trim()
    const description = document.getElementById("edit-description").value.trim()
    const status = document.getElementById("edit-status").value
    const dueDate = document.getElementById("edit-due-date").value

    if (!title || !taskId) return

    const updatedTask = {
      title,
      description,
      status,
      completed: status === "FINISHED",
      dueDate: dueDate || null,
    }

    updateTask(taskId, updatedTask)
  })

  // Context menu actions
  document.getElementById("edit-task").addEventListener("click", () => {
    if (currentTaskId) {
      showEditTaskModal(currentTaskId)
    }
    closeContextMenu()
  })

  document.getElementById("delete-task").addEventListener("click", () => {
    if (currentTaskId && confirm("Are you sure you want to delete this task?")) {
      deleteTask(currentTaskId)
    }
    closeContextMenu()
  })

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === createTaskModal) {
      closeModal(createTaskModal)
    }
    if (e.target === editTaskModal) {
      closeModal(editTaskModal)
    }
  })

  // Close context menu when pressing Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeContextMenu()
      closeModal(createTaskModal)
      closeModal(editTaskModal)
    }
  })
}
